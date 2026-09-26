import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { FluentProvider } from '@fluentui/react-components';
import { appearanceStorageKey, readAppearancePreference, type Appearance, type AppearancePreference } from './appearance';
import { areaThemes, type Area } from './theme';

interface AppearanceContextValue {
  appearance: Appearance;
  preference: AppearancePreference;
  setPreference: (preference: AppearancePreference) => void;
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

export function useAppearance(): AppearanceContextValue {
  const context = useContext(AppearanceContext);
  if (!context) throw new Error('useAppearance must be used inside GarageProvider.');
  return context;
}

export function GarageProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState(readAppearancePreference);
  const [systemDark, setSystemDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches);
  const appearance = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;

  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystemDark(media.matches);
    media.addEventListener('change', update);
    update();
    return () => media.removeEventListener('change', update);
  }, []);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = appearance;
    document.documentElement.style.colorScheme = appearance;
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      'content', areaThemes.portal[appearance].colorNeutralBackground2,
    );
  }, [appearance]);

  const context = useMemo(() => ({
    appearance,
    preference,
    setPreference: (next: AppearancePreference) => {
      setPreferenceState(next);
      try { localStorage.setItem(appearanceStorageKey, next); } catch { /* In-memory mode still works. */ }
    },
  }), [appearance, preference]);

  return (
    <AppearanceContext.Provider value={context}>
      <AreaProvider area="portal" className="garage-root">{children}</AreaProvider>
    </AppearanceContext.Provider>
  );
}

export function AreaProvider({ area, children, className, style }: {
  area: Area;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const { appearance } = useAppearance();
  return (
    <FluentProvider theme={areaThemes[area][appearance]} className={className ? `garage-area ${className}` : 'garage-area'} style={style}>
      {children}
    </FluentProvider>
  );
}
