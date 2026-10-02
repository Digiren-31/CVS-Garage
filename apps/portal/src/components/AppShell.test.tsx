import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CvsThemeProvider } from '../../../../packages/ui/src';
import { AppShell } from './AppShell';

function renderShell() {
  const onThemeChange = vi.fn();
  const onIdentityChange = vi.fn();
  const result = render(
    <CvsThemeProvider area="portal" mode="light">
      <MemoryRouter>
        <Routes>
          <Route
            element={
              <AppShell
                members={[]}
                currentUserId="demo"
                identityError={null}
                themeMode="system"
                onThemeChange={onThemeChange}
                onIdentityChange={onIdentityChange}
              />
            }
          >
            <Route index element={<div data-pointer-glow><h1>Overview content</h1></div>} />
            <Route path="projects" element={<h1>Project content</h1>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </CvsThemeProvider>
  );
  return { ...result, onThemeChange, onIdentityChange };
}

describe('workspace navigation', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.mocked(window.scrollTo).mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('fills the viewport without a capped frame or outer gutters', () => {
    const { container } = renderShell();
    const frame = container.querySelector('[data-workspace-frame]');
    expect(frame).toHaveStyle({ width: '100%', minHeight: '100dvh' });
    expect(frame?.parentElement).toHaveStyle({ padding: '0px' });
  });

  it('uses a decorative brand mark inside the accessible home link', () => {
    renderShell();
    const brand = screen.getByRole('link', { name: 'CVS Garage overview' });
    expect(brand).toHaveAttribute('href', '/');
    expect(brand.querySelector('img')).toHaveAttribute('src', '/garage-mark.svg');
    expect(brand.querySelector('img')).toHaveAttribute('alt', '');
  });

  it('places all seven area-colored route links in the header', () => {
    renderShell();
    const navigation = within(screen.getByRole('banner')).getByRole('navigation', {
      name: 'Primary navigation'
    });
    expect(navigation).toHaveAttribute('data-orientation', 'horizontal');
    expect(within(navigation).getAllByRole('link').map((link) => link.getAttribute('data-area'))).toEqual([
      'portal', 'projects', 'events', 'member-centre', 'leaderboards', 'idea-centre', 'forum'
    ]);
    expect(screen.queryByRole('complementary', { name: 'Workspace sidebar' })).not.toBeInTheDocument();
  });

  it('collapses to accessible icon tabs and remembers the preference', () => {
    const { unmount } = renderShell();
    fireEvent.click(screen.getByRole('button', { name: 'Collapse navigation' }));

    expect(screen.getByRole('button', { name: 'Expand navigation' })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    const navigation = screen.getByRole('navigation', { name: 'Primary navigation' });
    expect(within(navigation).getAllByRole('link')).toHaveLength(7);
    expect(within(navigation).getByRole('link', { name: 'Projects' })).toHaveAttribute(
      'href',
      '/projects'
    );
    expect(within(navigation).getByRole('link', { name: 'Overview' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(window.localStorage.getItem('cvs-garage-sidebar')).toBe('collapsed');

    unmount();
    renderShell();
    fireEvent.click(screen.getByRole('button', { name: 'Expand navigation' }));
    expect(screen.getByRole('button', { name: 'Collapse navigation' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    expect(window.localStorage.getItem('cvs-garage-sidebar')).toBe('expanded');
  });

  it('keeps navigation usable when preference storage is unavailable', () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Storage is disabled', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage is disabled', 'SecurityError');
    });

    renderShell();
    fireEvent.click(screen.getByRole('button', { name: 'Collapse navigation' }));
    expect(screen.getByRole('button', { name: 'Expand navigation' })).toBeInTheDocument();
    expect(warning).toHaveBeenCalled();
  });

  it('cycles system, light, and dark directly in the header without a settings menu', () => {
    const { onThemeChange } = renderShell();
    fireEvent.click(screen.getByRole('button', { name: 'Collapse navigation' }));
    fireEvent.click(screen.getByRole('button', { name: 'Theme: system. Switch to light.' }));
    expect(onThemeChange).toHaveBeenCalledWith('light');
    expect(screen.queryByRole('button', { name: 'Workspace preferences' })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Theme mode' })).not.toBeInTheDocument();
  });

  it('keeps the demo identity selector behind the avatar', async () => {
    renderShell();
    fireEvent.click(screen.getByRole('button', { name: 'Demo identity' }));
    const panel = await screen.findByRole('dialog', { name: 'Demo identity' });
    expect(within(panel).getByRole('combobox', { name: 'Development identity' })).toBeDisabled();
  });

  it('tracks fine-pointer position on the canvas and hovered surfaces', () => {
    const originalMatchMedia = window.matchMedia;
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      ...originalMatchMedia(query),
      matches: query === '(hover: hover) and (pointer: fine)'
    }));
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    const { container } = renderShell();
    const frame = container.querySelector<HTMLElement>('[data-workspace-frame]')!;
    fireEvent.pointerMove(screen.getByText('Overview content'), { clientX: 120, clientY: 75 });
    expect(frame.style.getPropertyValue('--cursor-x')).toBe('120px');
    expect(frame.style.getPropertyValue('--cursor-y')).toBe('75px');
    expect(frame.style.getPropertyValue('--cursor-opacity')).toBe('1');
    expect(screen.getByText('Overview content').parentElement?.style.getPropertyValue('--glow-x')).toBe('120px');
    fireEvent.pointerLeave(frame);
    expect(frame.style.getPropertyValue('--cursor-opacity')).toBe('0');
  });

  it('skips pointer tracking when reduced motion is requested', () => {
    const originalMatchMedia = window.matchMedia;
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      ...originalMatchMedia(query),
      matches: query === '(hover: hover) and (pointer: fine)' || query === '(prefers-reduced-motion: reduce)'
    }));
    const { container } = renderShell();
    const frame = container.querySelector<HTMLElement>('[data-workspace-frame]')!;
    fireEvent.pointerMove(screen.getByText('Overview content'), { clientX: 120, clientY: 75 });
    expect(frame.style.getPropertyValue('--cursor-opacity')).toBe('');
  });

  it('uses a labelled modal drawer on mobile and closes it after navigation', async () => {
    const originalMatchMedia = window.matchMedia;
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      ...originalMatchMedia(query),
      matches: query === '(max-width: 900px)'
    }));

    renderShell();
    expect(screen.queryByRole('navigation', { name: 'Primary navigation' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'CVS Garage overview' }).querySelector('img')).toHaveAttribute('src', '/garage-mark.svg');
    expect(screen.getByRole('button', { name: 'Theme: system. Switch to light.' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Demo identity' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));

    const drawer = await screen.findByRole('dialog', { name: 'Workspace navigation' });
    expect(drawer).toHaveAttribute('aria-modal', 'true');
    const navigation = within(drawer).getByRole('navigation', { name: 'Primary navigation' });
    fireEvent.click(within(navigation).getByRole('link', { name: 'Projects' }));

    expect(await screen.findByRole('heading', { name: 'Project content' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open navigation' })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    expect(document.getElementById('main-content')).toHaveFocus();
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' });
  });
});
