const required = [
  'SUPABASE_URL',
  'SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SECRET_KEY',
  'SUPABASE_PROJECT_REF',
  'SUPABASE_DB_PASSWORD',
  'BOOTSTRAP_ADMIN_EMAIL',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_PUBLISHABLE_KEY'
];

const missing = required.filter((name) => !process.env[name]?.trim());
if (missing.length > 0) {
  console.error(`Missing required local settings: ${missing.join(', ')}`);
  process.exit(1);
}

const failures = [];
if (process.env.SUPABASE_PROJECT_REF !== 'ycnghdqpzzhrrifcylnw') {
  failures.push('SUPABASE_PROJECT_REF does not match the Mumbai pilot.');
}
if (
  process.env.SUPABASE_URL !== 'https://ycnghdqpzzhrrifcylnw.supabase.co' ||
  process.env.VITE_SUPABASE_URL !== process.env.SUPABASE_URL
) {
  failures.push('The server and browser Supabase URLs must match the Mumbai pilot URL.');
}
if (!process.env.SUPABASE_PUBLISHABLE_KEY.startsWith('sb_publishable_')) {
  failures.push('SUPABASE_PUBLISHABLE_KEY must use the current publishable-key format.');
}
if (process.env.VITE_SUPABASE_PUBLISHABLE_KEY !== process.env.SUPABASE_PUBLISHABLE_KEY) {
  failures.push('The browser and server publishable keys must match.');
}
if (!process.env.SUPABASE_SECRET_KEY.startsWith('sb_secret_')) {
  failures.push('SUPABASE_SECRET_KEY must use the current server-only secret-key format.');
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(process.env.BOOTSTRAP_ADMIN_EMAIL)) {
  failures.push('BOOTSTRAP_ADMIN_EMAIL must be a valid Google email address.');
}
if (process.env.SUPABASE_DB_PASSWORD.length < 12) {
  failures.push('SUPABASE_DB_PASSWORD appears incomplete.');
}

if (failures.length > 0) {
  failures.forEach((failure) => console.error(failure));
  process.exit(1);
}

console.log('Supabase local configuration is complete. No secret values were printed.');
