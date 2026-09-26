export type Appearance = 'light' | 'dark';
export type AppearancePreference = Appearance | 'system';

export const appearanceStorageKey = 'cvs-garage-appearance';

export function isAppearancePreference(value: unknown): value is AppearancePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function readAppearancePreference(): AppearancePreference {
  try {
    const value = localStorage.getItem(appearanceStorageKey);
    return isAppearancePreference(value) ? value : 'system';
  } catch {
    return 'system';
  }
}

// Injected into the document head by the consumer before styles or content paint.
// Both storage access and malformed preferences are deliberately safe to ignore.
export const appearanceScript = `(() => {
  let preference = 'system';
  try {
    const stored = localStorage.getItem('${appearanceStorageKey}');
    if (stored === 'light' || stored === 'dark') preference = stored;
  } catch {}
  const mode = preference === 'system'
    ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : preference;
  document.documentElement.dataset.theme = mode;
  document.documentElement.style.colorScheme = mode;
})();`;
