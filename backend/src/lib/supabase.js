import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from './config.js';

let adminClient;

const authOptions = {
  autoRefreshToken: false,
  detectSessionInUrl: false,
  persistSession: false
};

export function getSupabaseAdminClient() {
  const config = getSupabaseConfig();
  if (!config) {
    return null;
  }

  adminClient ||= createClient(config.url, config.secretKey, {
    auth: authOptions,
    global: {
      headers: {
        'X-Client-Info': 'cvs-garage-backend'
      }
    }
  });
  return adminClient;
}

export function createSupabaseUserClient(accessToken) {
  const config = getSupabaseConfig();
  if (!config) {
    return null;
  }
  if (typeof accessToken !== 'string' || !accessToken.trim()) {
    throw new TypeError('A Supabase access token is required.');
  }

  return createClient(config.url, config.publishableKey, {
    auth: authOptions,
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Client-Info': 'cvs-garage-backend-user'
      }
    }
  });
}
