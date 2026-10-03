import { getSupabaseConfig } from './config.js';

export function validatePublicMediaUrl(value, field = 'mediaUrl') {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  if (typeof value !== 'string' || value.length > 1000) {
    throw new TypeError(`${field} must be a valid uploaded media URL.`);
  }

  const projectUrl = getSupabaseConfig()?.url;
  const normalized = value.trim();
  if (
    !projectUrl ||
    !normalized.startsWith(`${projectUrl}/storage/v1/object/public/public-media/`)
  ) {
    throw new TypeError(`${field} must reference an uploaded CVS Garage image.`);
  }
  return normalized;
}
