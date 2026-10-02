import {
  createDarkTheme,
  createLightTheme,
  FluentProvider,
  type BrandVariants,
  type Theme
} from '@fluentui/react-components';
import { useEffect, useMemo, type CSSProperties, type PropsWithChildren } from 'react';
import { glassPalettes } from './glass';
import { useMediaQuery } from './useMediaQuery';

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

function mixColor(seed: string, target: number, amount: number) {
  const channels = [1, 3, 5].map((offset) => {
    const channel = Number.parseInt(seed.slice(offset, offset + 2), 16);
    return Math.round(channel + (target - channel) * amount).toString(16).padStart(2, '0');
  });
  return `#${channels.join('')}`;
}

function createBrandRamp(seed: string): BrandVariants {
  return {
    10: mixColor(seed, 0, 0.93),
    20: mixColor(seed, 0, 0.84),
    30: mixColor(seed, 0, 0.72),
    40: mixColor(seed, 0, 0.58),
    50: mixColor(seed, 0, 0.43),
    60: mixColor(seed, 0, 0.28),
    70: mixColor(seed, 0, 0.14),
    80: seed,
    90: mixColor(seed, 255, 0.16),
    100: mixColor(seed, 255, 0.3),
    110: mixColor(seed, 255, 0.45),
    120: mixColor(seed, 255, 0.58),
    130: mixColor(seed, 255, 0.7),
    140: mixColor(seed, 255, 0.8),
    150: mixColor(seed, 255, 0.89),
    160: mixColor(seed, 255, 0.97)
  };
}

export function areaTokens(area: AreaId) {
  return {
    foreground: `var(--cvs-${area}-foreground)`,
    background: `var(--cvs-${area}-background)`,
    solid: `var(--cvs-${area}-solid)`
  };
}

export function createAreaTheme(area: AreaId, dark: boolean): Theme {
  const ramp = createBrandRamp(area === 'portal' ? '#303030' : areaDetails[area].color);
  const base = dark ? createDarkTheme(ramp) : createLightTheme(ramp);
  const palette = glassPalettes[dark ? 'dark' : 'light'];

  return {
    ...base,
    fontFamilyBase: '"Google Sans", "Avenir Next", "Segoe UI", sans-serif',
    fontFamilyNumeric: '"Google Sans", "Avenir Next", "Segoe UI", sans-serif',
    fontWeightSemibold: 500,
    fontWeightBold: 600,
    fontSizeBase200: '13px',
    lineHeightBase200: '20px',
    fontSizeBase300: '16px',
    lineHeightBase300: '24px',
    fontSizeBase400: '18px',
    lineHeightBase400: '28px',
    fontSizeHero800: '32px',
    lineHeightHero800: '42px',
    fontSizeHero900: '40px',
    lineHeightHero900: '48px',
    fontSizeHero1000: '48px',
    lineHeightHero1000: '56px',
    borderRadiusSmall: '6px',
    borderRadiusMedium: '16px',
    borderRadiusLarge: '24px',
    borderRadiusXLarge: '32px',
    colorNeutralForeground1: palette.foreground,
    colorNeutralForeground2: palette.secondary,
    colorNeutralForeground3: palette.tertiary,
    colorNeutralBackground1: palette.solidSurface,
    colorNeutralBackground1Hover: palette.surfaceHover,
    colorNeutralBackground1Pressed: palette.mutedSurface,
    colorNeutralBackground2: palette.canvas,
    colorNeutralBackground3: palette.mutedSurface,
    colorNeutralStroke1: palette.controlBorder,
    colorNeutralStroke2: palette.border,
    colorNeutralStroke3: palette.border,
    colorBrandBackground: ramp[80],
    colorBrandBackgroundHover: ramp[70],
    colorBrandBackgroundPressed: ramp[60],
    colorBrandBackgroundSelected: ramp[70],
    colorBrandForeground1: dark ? ramp[120] : ramp[70],
    colorBrandForeground2: dark ? ramp[120] : ramp[70],
    colorBrandForeground2Hover: dark ? ramp[130] : ramp[60],
    colorBrandForeground2Pressed: dark ? ramp[110] : ramp[50],
    colorBrandForegroundLink: dark ? ramp[120] : ramp[70],
    colorBrandForegroundLinkHover: dark ? ramp[130] : ramp[60],
    colorBrandForegroundLinkPressed: dark ? ramp[110] : ramp[50],
    colorCompoundBrandForeground1: dark ? ramp[120] : ramp[70],
    colorCompoundBrandForeground1Hover: dark ? ramp[130] : ramp[60],
    colorCompoundBrandForeground1Pressed: dark ? ramp[110] : ramp[50],
    colorCompoundBrandStroke: dark ? ramp[110] : ramp[80],
    colorStrokeFocus2: dark ? ramp[120] : ramp[70],
    shadow2: palette.shadow,
    shadow4: palette.shadow,
    shadow8: palette.shadowHover
  };
}

type SemanticStyle = CSSProperties & Record<`--cvs-${string}`, string>;

export function CvsThemeProvider({
  area,
  mode,
  children
}: PropsWithChildren<{ area: AreaId; mode: ThemeMode }>) {
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)');
  const dark = mode === 'dark' || (mode === 'system' && systemDark);
  const theme = useMemo(() => createAreaTheme(area, dark), [area, dark]);
  const semanticStyle = useMemo(() => {
    const palette = glassPalettes[dark ? 'dark' : 'light'];
    const activeRamp = createBrandRamp(area === 'portal' ? '#303030' : areaDetails[area].color);
    const style: SemanticStyle = {
      '--cvs-backdrop': palette.backdrop,
      '--cvs-canvas': palette.canvas,
      '--cvs-canvas-image': palette.canvasImage,
      '--cvs-frame-shadow': palette.frameShadow,
      '--cvs-area-wash': dark ? activeRamp[30] : activeRamp[150],
      '--cvs-surface': palette.surface,
      '--cvs-solid-surface': palette.solidSurface,
      '--cvs-strong-surface': palette.strongSurface,
      '--cvs-surface-hover': palette.surfaceHover,
      '--cvs-muted-surface': palette.mutedSurface,
      '--cvs-glass-border': palette.border,
      '--cvs-glass-highlight': palette.highlight,
      '--cvs-glass-shadow': palette.shadow,
      '--cvs-glass-shadow-hover': palette.shadowHover,
      '--cvs-glass-blur': 'blur(24px) saturate(145%)',
      '--cvs-overlay': palette.overlay,
      '--cvs-art-primary': palette.artPrimary,
      '--cvs-art-secondary': palette.artSecondary,
      '--cvs-art-line': palette.artLine,
      '--cvs-pointer-glow': palette.pointerGlow,
      '--cvs-card-glow': palette.cardGlow,
      '--cvs-accent-surface': activeRamp[50],
      '--cvs-accent-foreground': '#ffffff',
      '--cvs-accent-muted': activeRamp[150],
      '--cvs-accent-highlight': 'rgba(255, 255, 255, 0.08)',
      colorScheme: dark ? 'dark' : 'light'
    };
    for (const [id, details] of Object.entries(areaDetails)) {
      const ramp = createBrandRamp(id === 'portal' ? '#303030' : details.color);
      style[`--cvs-${id}-foreground`] = dark ? ramp[120] : ramp[70];
      style[`--cvs-${id}-background`] = dark ? ramp[30] : ramp[160];
      style[`--cvs-${id}-solid`] = ramp[80];
    }
    return style;
  }, [area, dark]);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.documentElement.style.setProperty('--area-brand', theme.colorStrokeFocus2);
    // Fluent popovers and drawers are portalled outside the provider element.
    for (const [name, value] of Object.entries(semanticStyle)) {
      if (name.startsWith('--cvs-')) {
        document.documentElement.style.setProperty(name, value);
      }
    }
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', glassPalettes[dark ? 'dark' : 'light'].canvas);
  }, [dark, semanticStyle, theme]);

  return (
    <FluentProvider
      theme={theme}
      style={semanticStyle}
      className="cvs-theme-root"
      data-theme={dark ? 'dark' : 'light'}
      data-area={area}
    >
      {children}
    </FluentProvider>
  );
}
