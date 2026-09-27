import {
  FluentProvider,
  webDarkTheme,
  webLightTheme,
  type Theme
} from '@fluentui/react-components';
import { useEffect, useMemo, useState, type PropsWithChildren } from 'react';

export type AreaId =
  | 'portal'
  | 'projects'
  | 'events'
  | 'member-centre'
  | 'leaderboards'
  | 'idea-centre'
  | 'forum';

export type ThemeMode = 'light' | 'dark' | 'system';

export const areaDetails: Record<AreaId, { label: string; color: string }> = {
  portal: { label: 'CVS Garage', color: '#0f6cbd' },
  projects: { label: 'Projects', color: '#5b5fc7' },
  events: { label: 'Events', color: '#c239b3' },
  'member-centre': { label: 'Member Centre', color: '#1e6b3f' },
  leaderboards: { label: 'Leaderboards', color: '#a15c00' },
  'idea-centre': { label: 'Idea Centre', color: '#d83b01' },
  forum: { label: 'Forum & Discussions', color: '#007e8c' }
};

function resolveTheme(area: AreaId, dark: boolean): Theme {
  const base = dark ? webDarkTheme : webLightTheme;
  const brand = areaDetails[area].color;

  return {
    ...base,
    colorNeutralBackground2:
      area === 'member-centre' && !dark ? '#fbfaf5' : base.colorNeutralBackground2,
    colorBrandBackground: brand,
    colorBrandBackgroundHover: brand,
    colorBrandBackgroundPressed: brand,
    colorBrandForeground1: dark ? '#ffffff' : brand,
    colorBrandForeground2: dark ? '#f5f5f5' : brand,
    colorCompoundBrandForeground1: dark ? '#ffffff' : brand,
    colorCompoundBrandStroke: brand,
    colorStrokeFocus2: brand
  };
}

export function CvsThemeProvider({
  area,
  mode,
  children
}: PropsWithChildren<{ area: AreaId; mode: ThemeMode }>) {
  const [systemDark, setSystemDark] = useState(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const update = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  const dark = mode === 'dark' || (mode === 'system' && systemDark);
  const theme = useMemo(() => resolveTheme(area, dark), [area, dark]);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.documentElement.style.setProperty('--area-brand', areaDetails[area].color);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', areaDetails[area].color);
  }, [area, dark]);

  return (
    <FluentProvider theme={theme} className="cvs-theme-root">
      {children}
    </FluentProvider>
  );
}
