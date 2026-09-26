import { createContext, useContext, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { FluentProvider, createLightTheme, createDarkTheme, type BrandVariants, type Theme } from '@fluentui/react-components';
import type { Area } from '@cvs-garage/contracts';
import { seeds, surfaces, ramp, mix, accent } from './palette.js';

export type ThemeMode = 'light' | 'dark' | 'system';
const ThemeContext = createContext<{ mode: ThemeMode; resolved: 'light' | 'dark'; setMode: (mode: ThemeMode) => void }>({ mode: 'system', resolved: 'light', setMode: () => {} });
export const useTheme = () => useContext(ThemeContext);
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    try { const saved = localStorage.getItem('cvs-garage-theme'); return saved === 'dark' || saved === 'light' ? saved : 'system'; } catch { return 'system'; }
  });
  const [systemDark, setSystemDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches);
  const resolved = mode === 'system' ? systemDark ? 'dark' : 'light' : mode;
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystemDark(media.matches);
    media.addEventListener('change', update); return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', surfaces[resolved].page);
  }, [resolved]);
  const setMode = (value: ThemeMode) => { setModeState(value); try { localStorage.setItem('cvs-garage-theme', value); } catch { /* Private browsing still supports session-local choice. */ } };
  return <ThemeContext.Provider value={{ mode, resolved, setMode }}><AreaTheme area="portal">{children}</AreaTheme></ThemeContext.Provider>;
}

export function AreaTheme({ area, children }: { area: Area; children: ReactNode }) {
  const { resolved } = useTheme();
  const { theme, style } = useMemo(() => {
    const base = resolved === 'dark' ? createDarkTheme(ramp(seeds[area]) as BrandVariants) : createLightTheme(ramp(seeds[area]) as BrandVariants);
    const colors = surfaces[resolved];
    const theme: Theme = {
      ...base,
      fontFamilyBase: '"Google Sans", "Segoe UI", sans-serif', fontFamilyNumeric: '"Google Sans", "Segoe UI", sans-serif',
      fontSizeBase300: '16px', lineHeightBase300: '24px',
      colorNeutralBackground1: colors.surface, colorNeutralBackground2: colors.subtle, colorNeutralBackground3: colors.page,
      colorNeutralForeground1: colors.text, colorNeutralForeground2: colors.muted,
      colorNeutralStroke1: colors.strongBorder, colorNeutralStroke2: colors.border,
      colorBrandBackground: mix(seeds[area], '#000000', 0.18), colorBrandBackgroundHover: mix(seeds[area], '#000000', 0.3), colorBrandBackgroundPressed: mix(seeds[area], '#000000', 0.4),
      colorBrandForeground1: accent(seeds[area], resolved), colorBrandForeground2: accent(seeds[area], resolved),
      colorBrandBackground2: mix(seeds[area], colors.surface, resolved === 'dark' ? 0.84 : 0.93),
      borderRadiusMedium: '6px', borderRadiusLarge: '8px',
    };
    const style: Record<string, string> = {
      '--page': colors.page, '--surface': colors.surface, '--surface-subtle': colors.subtle,
      '--text': colors.text, '--muted': colors.muted, '--border': colors.border, '--border-strong': colors.strongBorder,
      '--ink': colors.ink, '--paper': colors.paper, '--on-ink': colors.onInk,
      '--accent': accent(seeds[area], resolved), '--accent-bg': theme.colorBrandBackground2,
      '--space-1': base.spacingHorizontalXS, '--space-2': base.spacingHorizontalS, '--space-3': base.spacingHorizontalM,
      '--space-4': base.spacingHorizontalL, '--space-5': base.spacingHorizontalXL, '--space-6': base.spacingHorizontalXXL,
      '--space-7': base.spacingHorizontalXXXL, '--radius': base.borderRadiusMedium,
    };
    for (const [key, seed] of Object.entries(seeds)) {
      style[`--${key}`] = accent(seed, resolved);
      style[`--${key}-bg`] = mix(seed, colors.surface, resolved === 'dark' ? 0.84 : 0.92);
      style[`--${key}-ink`] = mix(seed, '#000000', 0.44);
      style[`--${key}-paper`] = mix(seed, '#ffffff', 0.87);
    }
    return { theme, style: style as CSSProperties };
  }, [area, resolved]);
  return <FluentProvider theme={theme} style={style} className="area-theme" data-area={area}>{children}</FluentProvider>;
}
