import { randomUUID } from 'node:crypto';
import { getSupabaseAdminClient } from '../../lib/supabase.js';

const IMAGE_MIME_TYPES = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif'],
  ['image/avif', '.avif']
]);

const ATTACHMENT_MIME_TYPES = new Map([
  ['application/pdf', '.pdf'],
  ['application/msword', '.doc'],
  ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.docx'],
  ['application/vnd.ms-excel', '.xls'],
  ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '.xlsx'],
  ['application/vnd.ms-powerpoint', '.ppt'],
  ['application/vnd.openxmlformats-officedocument.presentationml.presentation', '.pptx'],
  ['application/vnd.oasis.opendocument.text', '.odt'],
  ['application/vnd.oasis.opendocument.spreadsheet', '.ods'],
  ['application/vnd.oasis.opendocument.presentation', '.odp'],
  ['text/plain', '.txt'],
  ['text/csv', '.csv'],
  ['text/markdown', '.md'],
  ['application/json', '.json']
]);

const CATEGORY_RULES = Object.freeze({
  avatar: { bucketId: 'public-media', visibility: 'public', mimeTypes: IMAGE_MIME_TYPES, maxSize: 5 * 1024 * 1024 },
  'project-cover': { bucketId: 'public-media', visibility: 'public', mimeTypes: IMAGE_MIME_TYPES, maxSize: 5 * 1024 * 1024 },
  'event-cover': { bucketId: 'public-media', visibility: 'public', mimeTypes: IMAGE_MIME_TYPES, maxSize: 5 * 1024 * 1024 },
  'idea-cover': { bucketId: 'public-media', visibility: 'public', mimeTypes: IMAGE_MIME_TYPES, maxSize: 5 * 1024 * 1024 },
  'forum-attachment': {
    bucketId: 'private-attachments',
    visibility: 'authenticated',
    mimeTypes: new Map([...IMAGE_MIME_TYPES, ...ATTACHMENT_MIME_TYPES]),
    maxSize: 25 * 1024 * 1024
  }
});

export class MediaError extends Error {
  constructor(statusCode, code, message, details) {
    super(message);
    this.name = 'MediaError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

function adminClient() {
  const client = getSupabaseAdminClient();
  if (!client) {
    throw new MediaError(
      503,
      'STORAGE_NOT_CONFIGURED',
      'Supabase Storage is not configured for this environment.'
    );
  }
  return client;
}

function validateIntent(input) {
  const category = typeof input?.category === 'string' ? input.category.trim() : '';
  const rules = CATEGORY_RULES[category];
  if (!rules) {
    throw new MediaError(400, 'VALIDATION_ERROR', 'Upload category is not supported.', {
      field: 'category',
      allowedValues: Object.keys(CATEGORY_RULES)
    });
  }

  const originalName =
    typeof input.originalName === 'string' ? input.originalName.trim() : '';
  if (
    !originalName ||
    originalName.length > 180 ||
    originalName.includes('/') ||
    originalName.includes('\\')
  ) {
    throw new MediaError(
      400,
      'VALIDATION_ERROR',
      'File name must contain 180 characters or fewer and cannot contain a path.',
      { field: 'originalName' }
    );
  }

  const mimeType = typeof input.mimeType === 'string' ? input.mimeType.trim().toLowerCase() : '';
  const extension = rules.mimeTypes.get(mimeType);
  if (!extension) {
    throw new MediaError(415, 'UNSUPPORTED_MEDIA_TYPE', 'This file type is not allowed.', {
      field: 'mimeType',
      mimeType
    });
  }

  const maxSize = IMAGE_MIME_TYPES.has(mimeType)
    ? Math.min(rules.maxSize, 5 * 1024 * 1024)
    : rules.maxSize;
  const sizeBytes = input.sizeBytes;
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > maxSize) {
    throw new MediaError(
      413,
      'FILE_TOO_LARGE',
      `The selected file must be smaller than ${maxSize / (1024 * 1024)} MB.`,
      { field: 'sizeBytes', maxSizeBytes: maxSize }
    );
  }

  return { category, originalName, mimeType, sizeBytes, extension, ...rules, maxSize };
}

function toAsset(row, url = null) {
  return {
    id: row.id,
    ownerMemberId: row.owner_member_id,
    bucketId: row.bucket_id,
    objectPath: row.object_path,
    category: row.category,
    originalName: row.original_name,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes),
    visibility: row.visibility,
    uploadedAt: row.uploaded_at,
    ...(url ? { url } : {})
  };
}

async function assetUrl(row) {
  const storage = adminClient().storage.from(row.bucket_id);
  if (row.visibility === 'public') {
    return storage.getPublicUrl(row.object_path).data.publicUrl;
  }
  const { data, error } = await storage.createSignedUrl(row.object_path, 15 * 60);
  if (error) {
    throw new MediaError(502, 'STORAGE_URL_FAILED', `Could not create the file URL: ${error.message}`);
  }
  return data.signedUrl;
}

export class MediaService {
  async cleanupExpiredUploads() {
    const { data: expired, error } = await adminClient()
      .from('media_assets')
      .select('*')
      .is('uploaded_at', null)
      .is('deleted_at', null)
      .lt('upload_expires_at', new Date().toISOString());
    if (error) {
      throw new MediaError(
        502,
        'UPLOAD_CLEANUP_FAILED',
        `Could not load expired uploads: ${error.message}`
      );
    }

    for (const row of expired) {
      const { error: storageError } = await adminClient()
        .storage
        .from(row.bucket_id)
        .remove([row.object_path]);
      if (storageError) {
        throw new MediaError(
          502,
          'UPLOAD_CLEANUP_FAILED',
          `Could not remove expired upload ${row.id}: ${storageError.message}`
        );
      }

      const { error: metadataError } = await adminClient()
        .from('media_assets')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', row.id);
      if (metadataError) {
        throw new MediaError(
          502,
          'UPLOAD_CLEANUP_FAILED',
          `Could not retire expired upload ${row.id}: ${metadataError.message}`
        );
      }
    }

    return expired.length;
  }

  async validateOwnedAttachments(assetIds, member) {
    if (!Array.isArray(assetIds) || assetIds.length > 5) {
      throw new MediaError(
        400,
        'VALIDATION_ERROR',
        'A discussion can include up to five attachments.'
      );
    }
    if (new Set(assetIds).size !== assetIds.length) {
      throw new MediaError(400, 'VALIDATION_ERROR', 'Attachment identifiers must be unique.');
    }

    const assets = await Promise.all(
      assetIds.map(async (assetId) => {
        const row = await this.requireOwnedAsset(assetId, member);
        if (row.category !== 'forum-attachment' || !row.uploaded_at) {
          throw new MediaError(
            409,
            'INVALID_ATTACHMENT',
            'Every attachment must be a completed Forum upload.'
          );
        }
        return row;
      })
    );
    return assets;
  }

  async createUploadIntent(input, member, authUserId) {
    const validated = validateIntent(input);
    if (!authUserId) {
      throw new MediaError(401, 'UNAUTHORIZED', 'A verified Supabase identity is required.');
    }

    const objectPath = `${authUserId}/${validated.category}/${randomUUID()}${validated.extension}`;
    const { data: upload, error: uploadError } = await adminClient()
      .storage
      .from(validated.bucketId)
      .createSignedUploadUrl(objectPath);
    if (uploadError) {
      throw new MediaError(
        502,
        'UPLOAD_INTENT_FAILED',
        `Could not prepare the upload: ${uploadError.message}`
      );
    }

    const { data: asset, error: assetError } = await adminClient()
      .from('media_assets')
      .insert({
        owner_member_id: member.id,
        bucket_id: validated.bucketId,
        object_path: objectPath,
        category: validated.category,
        original_name: validated.originalName,
        mime_type: validated.mimeType,
        size_bytes: validated.sizeBytes,
        visibility: validated.visibility
      })
      .select('*')
      .single();
    if (assetError) {
      throw new MediaError(
        502,
        'UPLOAD_INTENT_FAILED',
        `Could not record the upload: ${assetError.message}`
      );
    }

    return {
      asset: toAsset(asset),
      upload: {
        path: upload.path,
        token: upload.token
      }
    };
  }

  async completeUpload(assetId, member) {
    const row = await this.requireOwnedAsset(assetId, member);
    if (row.upload_expires_at && Date.parse(row.upload_expires_at) < Date.now()) {
      throw new MediaError(410, 'UPLOAD_EXPIRED', 'This upload request has expired.');
    }

    const slash = row.object_path.lastIndexOf('/');
    const prefix = row.object_path.slice(0, slash);
    const filename = row.object_path.slice(slash + 1);
    const { data: objects, error: listError } = await adminClient()
      .storage
      .from(row.bucket_id)
      .list(prefix, { search: filename, limit: 10 });
    if (listError) {
      throw new MediaError(502, 'UPLOAD_VERIFICATION_FAILED', listError.message);
    }
    const object = objects.find((candidate) => candidate.name === filename);
    if (!object) {
      throw new MediaError(409, 'UPLOAD_INCOMPLETE', 'The file has not finished uploading.');
    }

    const storedSize = Number(object.metadata?.size);
    const storedMimeType = object.metadata?.mimetype || object.metadata?.contentType;
    if (
      (Number.isFinite(storedSize) && storedSize !== Number(row.size_bytes)) ||
      (storedMimeType && storedMimeType !== row.mime_type)
    ) {
      await adminClient().storage.from(row.bucket_id).remove([row.object_path]);
      throw new MediaError(
        409,
        'UPLOAD_MISMATCH',
        'The uploaded file does not match the approved file metadata.'
      );
    }

    const { data: completed, error } = await adminClient()
      .from('media_assets')
      .update({ uploaded_at: new Date().toISOString() })
      .eq('id', row.id)
      .select('*')
      .single();
    if (error) {
      throw new MediaError(502, 'UPLOAD_COMPLETION_FAILED', error.message);
    }
    return toAsset(completed, await assetUrl(completed));
  }

  async getUrl(assetId, member) {
    const row = await this.requireReadableAsset(assetId, member);
    return toAsset(row, await assetUrl(row));
  }

  async remove(assetId, member) {
    const row = await this.requireOwnedAsset(assetId, member);
    if (await this.isReferenced(row)) {
      throw new MediaError(
        409,
        'MEDIA_IN_USE',
        'This file is already attached to portal content and cannot be deleted.'
      );
    }
    const { error: storageError } = await adminClient()
      .storage
      .from(row.bucket_id)
      .remove([row.object_path]);
    if (storageError) {
      throw new MediaError(502, 'STORAGE_DELETE_FAILED', storageError.message);
    }
    const { error } = await adminClient()
      .from('media_assets')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', row.id);
    if (error) {
      throw new MediaError(502, 'MEDIA_DELETE_FAILED', error.message);
    }
    return { id: row.id, deleted: true };
  }

  async isReferenced(row) {
    const publicUrl =
      row.visibility === 'public'
        ? adminClient().storage.from(row.bucket_id).getPublicUrl(row.object_path).data.publicUrl
        : null;
    const profileRequest = publicUrl
      ? adminClient()
          .from('member_profiles')
          .select('id')
          .eq('avatar_url', publicUrl)
          .limit(1)
      : Promise.resolve({ data: [], error: null });

    const [
      { data: profiles, error: profileError },
      { data: domains, error: domainError }
    ] = await Promise.all([
      profileRequest,
      adminClient().from('domain_state').select('domain, state')
    ]);
    if (profileError || domainError) {
      const message = profileError?.message || domainError?.message;
      throw new MediaError(
        502,
        'MEDIA_REFERENCE_CHECK_FAILED',
        `Could not verify whether the file is in use: ${message}`
      );
    }
    if (profiles.length > 0) {
      return true;
    }

    const needles = [row.id, row.object_path, publicUrl].filter(Boolean);
    return domains.some(({ state }) => {
      const serialized = JSON.stringify(state);
      return needles.some((needle) => serialized.includes(needle));
    });
  }

  async requireReadableAsset(assetId, member) {
    const row = await this.findAsset(assetId);
    if (!row || row.deleted_at || !row.uploaded_at) {
      throw new MediaError(404, 'MEDIA_NOT_FOUND', 'The requested file was not found.');
    }
    if (row.visibility !== 'public' && !member) {
      throw new MediaError(403, 'FORBIDDEN', 'Sign in to access this file.');
    }
    return row;
  }

  async requireOwnedAsset(assetId, member) {
    const row = await this.findAsset(assetId);
    const administrator = member?.roles?.includes('Admin');
    if (!row || row.deleted_at) {
      throw new MediaError(404, 'MEDIA_NOT_FOUND', 'The requested file was not found.');
    }
    if (row.owner_member_id !== member?.id && !administrator) {
      throw new MediaError(403, 'FORBIDDEN', 'You do not own this file.');
    }
    return row;
  }

  async findAsset(assetId) {
    if (
      typeof assetId !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(assetId)
    ) {
      throw new MediaError(400, 'VALIDATION_ERROR', 'File identifier is invalid.');
    }
    const { data, error } = await adminClient()
      .from('media_assets')
      .select('*')
      .eq('id', assetId)
      .maybeSingle();
    if (error) {
      throw new MediaError(502, 'MEDIA_LOOKUP_FAILED', error.message);
    }
    return data;
  }
}

export const mediaService = new MediaService();
