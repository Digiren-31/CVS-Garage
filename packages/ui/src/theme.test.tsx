import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { areaDetails, createAreaTheme, CvsThemeProvider, type AreaId } from './theme';
import { glassPalettes } from './glass';

function luminance(hex: string) {
  const channels = [1, 3, 5].map((offset) => {
    const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(foreground: string, background: string) {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('area glass themes', () => {
  const areas = Object.keys(areaDetails) as AreaId[];

  it('preserves the assigned palette for every navigation area', () => {
    expect(Object.fromEntries(Object.entries(areaDetails).map(([area, details]) => [area, details.color]))).toEqual({
      portal: '#0f6cbd',
      projects: '#5b5fc7',
      events: '#c239b3',
      'member-centre': '#1e6b3f',
      leaderboards: '#a15c00',
      'idea-centre': '#d83b01',
      forum: '#007e8c'
    });
  });

  it('keeps black and white canvas bases beneath warm and violet glow layers', () => {
    expect(glassPalettes.dark.canvas).toBe('#000000');
    expect(glassPalettes.light.canvas).toBe('#ffffff');
    expect(glassPalettes.dark.canvasImage).toContain('radial-gradient');
    expect(glassPalettes.light.canvasImage).toContain('radial-gradient');
    expect(glassPalettes.dark.pointerGlow).toContain('rgba(');
    expect(glassPalettes.light.pointerGlow).toContain('rgba(');
    expect(createAreaTheme('portal', true).colorNeutralBackground2).toBe('#000000');
    expect(createAreaTheme('portal', false).colorNeutralBackground2).toBe('#ffffff');
    expect(createAreaTheme('member-centre', false).colorNeutralBackground2).toBe('#ffffff');
  });

  for (const area of areas) {
    for (const dark of [false, true]) {
      it(`keeps ${area} text, brand actions, and focus legible in ${dark ? 'dark' : 'light'} mode`, () => {
        const theme = createAreaTheme(area, dark);
        const palette = glassPalettes[dark ? 'dark' : 'light'];
        for (const foreground of [
          theme.colorNeutralForeground1,
          theme.colorNeutralForeground2,
          theme.colorNeutralForeground3,
          theme.colorBrandForeground1,
          theme.colorBrandForegroundLink,
          theme.colorBrandForegroundLinkHover,
          theme.colorBrandForegroundLinkPressed
        ]) {
          for (const background of [palette.canvas, palette.solidSurface]) {
            expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
          }
        }
        for (const background of [
          theme.colorBrandBackground,
          theme.colorBrandBackgroundHover,
          theme.colorBrandBackgroundPressed
        ]) {
          expect(contrast(theme.colorNeutralForegroundOnBrand, background)).toBeGreaterThanOrEqual(4.5);
        }
        expect(contrast(theme.colorStrokeFocus2, palette.solidSurface)).toBeGreaterThanOrEqual(3);
        expect(contrast(theme.colorNeutralStroke1, palette.solidSurface)).toBeGreaterThanOrEqual(3);
        expect(theme.colorBrandBackgroundHover).not.toBe(theme.colorBrandBackground);
        expect(theme.fontFamilyBase).toContain('Google Sans');
      });
    }
  }

  it('follows live system theme changes without overriding an explicit selection', () => {
    const events = new EventTarget();
    let dark = false;
    const media: MediaQueryList = {
      media: '(prefers-color-scheme: dark)',
      get matches() { return dark; },
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: events.addEventListener.bind(events),
      removeEventListener: events.removeEventListener.bind(events),
      dispatchEvent: events.dispatchEvent.bind(events)
    };
    vi.spyOn(window, 'matchMedia').mockReturnValue(media);
    const { rerender } = render(
      <CvsThemeProvider area="portal" mode="system"><span data-testid="content">Content</span></CvsThemeProvider>
    );
    const root = () => screen.getByTestId('content').closest('.cvs-theme-root');
    expect(root()).toHaveAttribute('data-theme', 'light');

    act(() => {
      dark = true;
      events.dispatchEvent(new Event('change'));
    });
    expect(root()).toHaveAttribute('data-theme', 'dark');

    rerender(<CvsThemeProvider area="portal" mode="light"><span data-testid="content">Content</span></CvsThemeProvider>);
    expect(root()).toHaveAttribute('data-theme', 'light');
    expect(document.documentElement.style.getPropertyValue('--cvs-surface')).toBe(glassPalettes.light.surface);
  });
});
