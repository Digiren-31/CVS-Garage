const TRUE_VALUES = new Set(['1', 'true', 'yes']);

function enabled(value) {
  return TRUE_VALUES.has(String(value || '').trim().toLowerCase());
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function validateUrl(value, name) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid absolute URL.`);
  }

  if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
    throw new Error(`${name} must use HTTPS outside local development.`);
  }
  return parsed.origin;
}

function validateEmail(value, name) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new Error(`${name} must be a valid email address.`);
  }
  return value.toLowerCase();
}

export function isSupabaseEnabled() {
  return enabled(process.env.SUPABASE_ENABLED);
}

export function getSupabaseConfig() {
  if (!isSupabaseEnabled()) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SUPABASE_ENABLED must be true in production.');
    }
    return null;
  }

  const publishableKey = required('SUPABASE_PUBLISHABLE_KEY');
  const secretKey = required('SUPABASE_SECRET_KEY');
  if (!publishableKey.startsWith('sb_publishable_')) {
    throw new Error('SUPABASE_PUBLISHABLE_KEY must be a Supabase publishable key.');
  }
  if (!secretKey.startsWith('sb_secret_')) {
    throw new Error('SUPABASE_SECRET_KEY must be a server-only Supabase secret key.');
  }

  return Object.freeze({
    url: validateUrl(required('SUPABASE_URL'), 'SUPABASE_URL'),
    publishableKey,
    secretKey,
    bootstrapAdminEmail: validateEmail(
      required('BOOTSTRAP_ADMIN_EMAIL'),
      'BOOTSTRAP_ADMIN_EMAIL'
    )
  });
}

export function getTrustProxy() {
  const value = process.env.TRUST_PROXY?.trim();
  if (!value) {
    return false;
  }
  if (/^\d+$/.test(value)) {
    return Number(value);
  }
  return enabled(value);
}
