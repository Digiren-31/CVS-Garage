import { createDarkTheme, createLightTheme, type BrandVariants, type Theme } from '@fluentui/react-components';
import type { Appearance } from './appearance';

export const areaIdentities = {
  portal: { name: 'CVS Garage', seed: '#0F6CBD' },
  projects: { name: 'Projects', seed: '#5B5FC7' },
  events: { name: 'Events', seed: '#C239B3' },
  'member-centre': { name: 'Member Centre', seed: '#1E6B3F' },
  leaderboards: { name: 'Leaderboards', seed: '#A15C00' },
  'idea-centre': { name: 'Idea Centre', seed: '#D83B01' },
  forum: { name: 'Forum', seed: '#007E8C' },
} as const;

export type Area = keyof typeof areaIdentities;

const steps = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160] as const;
const lightness = [-0.88, -0.76, -0.62, -0.48, -0.35, -0.23, -0.12, 0, 0.14, 0.27, 0.4, 0.52, 0.65, 0.76, 0.87, 0.95];

function mix(seed: string, amount: number): string {
  const channels = seed.slice(1).match(/.{2}/g)!.map((channel) => parseInt(channel, 16));
  return `#${channels.map((channel) => {
    const target = amount < 0 ? 0 : 255;
    return Math.round(channel + (target - channel) * Math.abs(amount)).toString(16).padStart(2, '0');
  }).join('')}`;
}

export function createAreaRamp(seed: string): BrandVariants {
  return Object.fromEntries(steps.map((step, index) => [step, mix(seed, lightness[index])])) as unknown as BrandVariants;
}

export const areaRamps = Object.fromEntries(
  Object.entries(areaIdentities).map(([area, { seed }]) => [area, createAreaRamp(seed)]),
) as Record<Area, BrandVariants>;

function makeTheme(area: Area, appearance: Appearance): Theme {
  const ramp = areaRamps[area];
  const theme = appearance === 'dark' ? createDarkTheme(ramp) : createLightTheme(ramp);
  return {
    ...theme,
    fontFamilyBase: '"Google Sans", "Segoe UI", sans-serif',
    fontFamilyNumeric: '"Google Sans", "Segoe UI", sans-serif',
    fontSizeBase300: '16px',
    lineHeightBase300: '24px',
    colorBrandForeground1: appearance === 'dark' ? ramp[120] : ramp[70],
    colorBrandBackground: ramp[70],
    colorBrandBackgroundHover: ramp[60],
    colorBrandBackgroundPressed: ramp[50],
    colorNeutralForegroundOnBrand: '#ffffff',
    colorNeutralBackground1: appearance === 'dark' ? '#20211f' : '#ffffff',
    colorNeutralBackground2: appearance === 'dark' ? '#171916' : '#f7f7f5',
    colorNeutralBackground3: appearance === 'dark' ? '#2b2d29' : '#eeeeea',
    colorNeutralForeground1: appearance === 'dark' ? '#f3f3ed' : '#222820',
    colorNeutralForeground2: appearance === 'dark' ? '#c2c5bc' : '#545b50',
    colorNeutralForeground3: appearance === 'dark' ? '#afb4a8' : '#62685d',
    colorNeutralStroke1: appearance === 'dark' ? '#64695e' : '#92988c',
    colorNeutralStroke2: appearance === 'dark' ? '#42463d' : '#d8dcd2',
    borderRadiusMedium: '4px',
    borderRadiusLarge: '8px',
  };
}

export const areaThemes = Object.fromEntries(
  Object.keys(areaIdentities).map((area) => [area, {
    light: makeTheme(area as Area, 'light'),
    dark: makeTheme(area as Area, 'dark'),
  }]),
) as Record<Area, Record<Appearance, Theme>>;
