import {
  Avatar,
  Button,
  Field,
  OverlayDrawer,
  Popover,
  PopoverSurface,
  PopoverTrigger,
  Select,
  Text,
  Tooltip,
  makeStyles,
  mergeClasses,
  shorthands,
  tokens
} from '@fluentui/react-components';
import {
  ChevronDown,
  ChevronUp,
  Cloud,
  FlaskConical,
  LogIn,
  LogOut,
  Menu,
  Monitor,
  Moon,
  Sun,
  X
} from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import type { Member } from '../../../../packages/contracts/src';
import { areaTokens, glassTokens, useMediaQuery, type ThemeMode } from '../../../../packages/ui/src';
import { workspaceNavigation } from './navigation';

const useStyles = makeStyles({
  root: {
    minHeight: '100dvh',
    backgroundColor: glassTokens.canvas,
    padding: 0
  },
  frame: {
    width: '100%',
    minHeight: '100dvh',
    position: 'relative',
    isolation: 'isolate',
    backgroundColor: glassTokens.canvas,
    backgroundImage: glassTokens.canvasImage,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    ':before': {
      content: '""',
      position: 'fixed',
      inset: 0,
      zIndex: 0,
      pointerEvents: 'none',
      opacity: 'var(--cursor-opacity, 0)',
      backgroundImage: `radial-gradient(340px circle at var(--cursor-x, 50%) var(--cursor-y, 50%), ${glassTokens.pointerGlow}, transparent 74%)`,
      transitionProperty: 'opacity',
      transitionDuration: tokens.durationNormal,
      '@media (hover: none), (pointer: coarse), (prefers-reduced-motion: reduce), (prefers-reduced-transparency: reduce), (forced-colors: active)': {
        display: 'none'
      }
    }
  },
  skipLink: {
    position: 'fixed',
    top: tokens.spacingVerticalS,
    left: tokens.spacingHorizontalS,
    zIndex: 100,
    transform: 'translateY(-180%)',
    backgroundColor: glassTokens.solidSurface,
    color: tokens.colorNeutralForeground1,
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalL),
    borderRadius: tokens.borderRadiusMedium,
    ':focus': { transform: 'translateY(0)' }
  },
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 20,
    display: 'grid',
    gridTemplateColumns: 'auto minmax(0, 1fr) auto',
    alignItems: 'center',
    columnGap: tokens.spacingHorizontalL,
    rowGap: tokens.spacingVerticalS,
    minHeight: '80px',
    ...shorthands.padding(tokens.spacingVerticalL, tokens.spacingHorizontalXL),
    backgroundColor: glassTokens.surface,
    backdropFilter: glassTokens.blur,
    '@media (max-width: 1200px)': {
      gridTemplateColumns: 'minmax(0, 1fr) auto'
    },
    '@media (max-width: 600px)': {
      ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalM),
      columnGap: tokens.spacingHorizontalS
    }
  },
  brandGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    minWidth: 0
  },
  brand: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    color: tokens.colorNeutralForeground1,
    textDecorationLine: 'none',
    whiteSpace: 'nowrap',
    minHeight: '44px'
  },
  brandMark: {
    width: '42px',
    height: '42px',
    flexShrink: 0,
    borderRadius: tokens.borderRadiusMedium,
    boxShadow: glassTokens.shadow
  },
  brandName: {
    display: 'grid',
    gap: tokens.spacingVerticalXXS,
    fontSize: tokens.fontSizeBase400,
    lineHeight: tokens.lineHeightBase400,
    fontWeight: tokens.fontWeightSemibold,
    '@media (max-width: 360px)': { display: 'none' }
  },
  brandCaption: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase100,
    lineHeight: tokens.lineHeightBase100,
    fontWeight: tokens.fontWeightRegular,
    '@media (max-width: 600px)': { display: 'none' }
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXXS,
    justifySelf: 'center',
    minWidth: 0,
    maxWidth: '100%',
    ...shorthands.padding(tokens.spacingVerticalXS, tokens.spacingHorizontalXS),
    backgroundColor: glassTokens.surface,
    borderRadius: tokens.borderRadiusCircular,
    '@media (max-width: 1200px)': {
      gridColumn: '1 / -1',
      gridRow: 2,
      justifySelf: 'center'
    }
  },
  navMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    backgroundColor: 'transparent',
    borderRadius: 0,
    overflowY: 'auto',
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalL)
  },
  navLink: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacingHorizontalXS,
    color: tokens.colorNeutralForeground2,
    minHeight: '38px',
    textDecorationLine: 'none',
    whiteSpace: 'nowrap',
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightRegular,
    ...shorthands.padding(tokens.spacingVerticalXS, tokens.spacingHorizontalM),
    ...shorthands.border('1px', 'solid', 'transparent'),
    borderRadius: tokens.borderRadiusCircular,
    transitionProperty: 'background-color, color, box-shadow',
    transitionDuration: tokens.durationNormal,
    ':hover': {
      color: 'var(--navigation-accent)',
      backgroundColor: 'var(--navigation-tint)'
    }
  },
  navLinkActive: {
    color: tokens.colorNeutralForegroundOnBrand,
    backgroundColor: 'var(--navigation-solid)',
    boxShadow: tokens.shadow2,
    ':hover': {
      color: tokens.colorNeutralForegroundOnBrand,
      backgroundColor: 'var(--navigation-solid)'
    },
    '& [data-navigation-icon]': { color: 'inherit' },
    '@media (forced-colors: active)': {
      ...shorthands.borderColor('Highlight')
    }
  },
  navLinkMobile: {
    justifyContent: 'flex-start',
    minHeight: '48px',
    fontSize: tokens.fontSizeBase300,
    gap: tokens.spacingHorizontalM
  },
  navLinkCompact: {
    minWidth: '40px',
    paddingInline: tokens.spacingHorizontalS
  },
  navIcon: {
    display: 'inline-flex',
    flexShrink: 0,
    color: 'var(--navigation-accent)'
  },
  navDot: {
    width: '5px',
    height: '5px',
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: 'currentColor'
  },
  headerControls: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    justifyContent: 'flex-end'
  },
  iconButton: {
    minWidth: '36px',
    minHeight: '36px',
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: glassTokens.surface,
    '@media (max-width: 900px)': {
      minWidth: '44px',
      minHeight: '44px'
    }
  },
  themeButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    minHeight: '36px',
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: glassTokens.surface,
    ...shorthands.padding(tokens.spacingVerticalXS, tokens.spacingHorizontalM),
    '@media (max-width: 900px)': { minHeight: '44px', minWidth: '44px' }
  },
  themeText: {
    '@media (max-width: 600px)': { display: 'none' }
  },
  identityButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    minHeight: '36px',
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: glassTokens.surface,
    ...shorthands.padding(tokens.spacingVerticalXXS, tokens.spacingHorizontalXS),
    '@media (max-width: 900px)': { minHeight: '44px', minWidth: '44px' }
  },
  identityText: {
    color: tokens.colorNeutralForeground2,
    '@media (max-width: 600px)': { display: 'none' }
  },
  identityPanel: {
    width: '320px',
    maxWidth: 'calc(100vw - 32px)',
    display: 'grid',
    gap: tokens.spacingVerticalL,
    backgroundColor: glassTokens.solidSurface,
    borderRadius: tokens.borderRadiusLarge,
    ...shorthands.padding(tokens.spacingVerticalL, tokens.spacingHorizontalL)
  },
  identityPanelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalS
  },
  identityPanelTitle: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
    margin: 0
  },
  select: { minWidth: 0, width: '100%' },
  selectInput: { minWidth: 0, textOverflow: 'ellipsis' },
  muted: { color: tokens.colorNeutralForeground3 },
  error: {
    gridColumn: '1 / -1',
    color: tokens.colorPaletteRedForeground1,
    fontSize: tokens.fontSizeBase200
  },
  content: {
    position: 'relative',
    zIndex: 1,
    minWidth: 0,
    flexGrow: 1,
    ...shorthands.padding(tokens.spacingVerticalXXXL, tokens.spacingHorizontalXXXL),
    '@media (max-width: 600px)': {
      ...shorthands.padding(tokens.spacingVerticalL, tokens.spacingHorizontalM)
    }
  },
  footer: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalS,
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalXL),
    color: tokens.colorNeutralForeground3
  },
  demoLabel: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS
  },
  drawer: {
    maxWidth: 'calc(100vw - 24px)',
    backgroundColor: glassTokens.strongSurface,
    backdropFilter: glassTokens.blur,
    borderTopRightRadius: tokens.borderRadiusXLarge,
    borderBottomRightRadius: tokens.borderRadiusXLarge,
    padding: 0
  },
  drawerHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    ...shorthands.padding(tokens.spacingVerticalL, tokens.spacingHorizontalL)
  }
});

interface AppShellProps {
  members: Member[];
  currentUserId: string;
  authenticatedMember?: Member | null;
  authMode?: 'demo' | 'supabase' | 'misconfigured';
  identityError: string | null;
  identityLoading?: boolean;
  themeMode: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
  onIdentityChange: (userId: string) => void;
  onSignIn?: () => void;
  onSignOut?: () => void;
}

export interface WorkspaceContext {
  currentMember: Member | undefined;
  members: Member[];
  identityLoading: boolean;
  identityError: string | null;
  authMode: 'demo' | 'supabase' | 'misconfigured';
}

type NavigationStyle = CSSProperties & {
  '--navigation-accent': string;
  '--navigation-tint': string;
  '--navigation-solid': string;
};

function readCollapsedPreference() {
  try {
    return window.localStorage.getItem('cvs-garage-sidebar') === 'collapsed';
  } catch (error) {
    console.warn('The navigation preference could not be restored.', error);
    return false;
  }
}

export function AppShell({
  members,
  currentUserId,
  authenticatedMember = null,
  authMode = 'demo',
  identityError,
  identityLoading = false,
  themeMode,
  onThemeChange,
  onIdentityChange,
  onSignIn = () => undefined,
  onSignOut = () => undefined
}: AppShellProps) {
  const styles = useStyles();
  const location = useLocation();
  const mobile = useMediaQuery('(max-width: 900px)');
  const [menuOpen, setMenuOpen] = useState(false);
  const [identityOpen, setIdentityOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(readCollapsedPreference);
  const frameRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const previousPath = useRef(location.pathname);
  const compact = collapsed && !mobile;
  const activeItem = workspaceNavigation.find((item) =>
    item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)
  ) || workspaceNavigation[0];
  const currentMember = authMode === 'demo'
    ? members.find((member) => member.id === currentUserId)
    : authenticatedMember || undefined;
  const toggleLabel = mobile ? 'Open navigation' : compact ? 'Expand navigation' : 'Collapse navigation';
  const ToggleIcon = mobile ? Menu : compact ? ChevronDown : ChevronUp;
  const ThemeIcon = themeMode === 'system' ? Monitor : themeMode === 'light' ? Sun : Moon;
  const nextTheme: Record<ThemeMode, ThemeMode> = { system: 'light', light: 'dark', dark: 'system' };
  const nextMode = nextTheme[themeMode];
  const context: WorkspaceContext = {
    currentMember,
    members,
    identityLoading,
    identityError,
    authMode
  };

  useEffect(() => {
    setMenuOpen(false);
    setIdentityOpen(false);
    document.title = `${activeItem.label} — CVS Garage`;
    if (previousPath.current !== location.pathname) {
      document.getElementById('main-content')?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      previousPath.current = location.pathname;
    }
  }, [location.pathname, activeItem.label]);

  useEffect(() => {
    if (!mobile) setMenuOpen(false);
  }, [mobile]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const reducedTransparency = window.matchMedia('(prefers-reduced-transparency: reduce)');
    const forcedColors = window.matchMedia('(forced-colors: active)');
    let request = 0;

    function onMove(event: PointerEvent) {
      if (!frame || !finePointer.matches || reducedMotion.matches || reducedTransparency.matches || forcedColors.matches) return;
      cancelAnimationFrame(request);
      const x = event.clientX;
      const y = event.clientY;
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-pointer-glow]') : null;
      request = requestAnimationFrame(() => {
        frame.style.setProperty('--cursor-x', `${x}px`);
        frame.style.setProperty('--cursor-y', `${y}px`);
        frame.style.setProperty('--cursor-opacity', '1');
        if (target) {
          const rect = target.getBoundingClientRect();
          target.style.setProperty('--glow-x', `${x - rect.left}px`);
          target.style.setProperty('--glow-y', `${y - rect.top}px`);
        }
      });
    }

    function onLeave() {
      cancelAnimationFrame(request);
      frame?.style.setProperty('--cursor-opacity', '0');
    }

    frame.addEventListener('pointermove', onMove);
    frame.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(request);
      frame.removeEventListener('pointermove', onMove);
      frame.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  function toggleNavigation() {
    if (mobile) {
      setIdentityOpen(false);
      setMenuOpen(true);
      return;
    }
    const nextCollapsed = !collapsed;
    setCollapsed(nextCollapsed);
    try {
      window.localStorage.setItem('cvs-garage-sidebar', nextCollapsed ? 'collapsed' : 'expanded');
    } catch (error) {
      console.warn('The navigation preference could not be saved. It will apply for this session.', error);
    }
  }

  function closeNavigation() {
    setMenuOpen(false);
    toggleRef.current?.focus();
  }

  const navigation = (
    <nav
      id="workspace-navigation"
      className={mergeClasses(styles.nav, mobile && styles.navMobile)}
      aria-label="Primary navigation"
      data-orientation={mobile ? 'vertical' : 'horizontal'}
    >
      {workspaceNavigation.map((item) => {
        const Icon = item.icon;
        const colors = areaTokens(item.area);
        const variables: NavigationStyle = {
          '--navigation-accent': colors.foreground,
          '--navigation-tint': colors.background,
          '--navigation-solid': colors.solid
        };
        return (
          <Tooltip key={item.to} content={compact ? item.label : item.description} relationship="description" positioning={mobile ? 'after' : 'below'}>
            <NavLink
              to={item.to}
              end={item.to === '/'}
              aria-label={item.label}
              data-area={item.area}
              style={variables}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) => mergeClasses(styles.navLink, compact && styles.navLinkCompact, mobile && styles.navLinkMobile, isActive && styles.navLinkActive)}
            >
              <span className={styles.navIcon} data-navigation-icon aria-hidden="true">
                {compact || mobile ? <Icon size={19} strokeWidth={1.6} /> : <span className={styles.navDot} />}
              </span>
              {!compact ? <span>{mobile ? item.label : item.tabLabel || item.label}</span> : null}
            </NavLink>
          </Tooltip>
        );
      })}
    </nav>
  );

  const navigationToggle = (
    <Tooltip content={toggleLabel} relationship="description">
      <Button
        ref={toggleRef}
        className={styles.iconButton}
        appearance="subtle"
        icon={<ToggleIcon size={18} />}
        aria-label={toggleLabel}
        aria-expanded={mobile ? menuOpen : !compact}
        aria-controls="workspace-navigation"
        onClick={toggleNavigation}
      />
    </Tooltip>
  );

  return (
    <div className={styles.root} data-navigation={compact ? 'collapsed' : 'expanded'}>
      <a className={styles.skipLink} href="#main-content">Skip to main content</a>
      <div ref={frameRef} className={styles.frame} data-workspace-frame>
        <header className={styles.header}>
          <div className={styles.brandGroup}>
            {mobile ? navigationToggle : null}
            <Link to="/" className={styles.brand} aria-label="CVS Garage overview">
              <img className={styles.brandMark} src="/garage-mark.svg" alt="" width="42" height="42" />
              <span className={styles.brandName}>CVS Garage<span className={styles.brandCaption}>Campus innovation</span></span>
            </Link>
          </div>
          {!mobile ? navigation : null}
          <div className={styles.headerControls}>
            {!mobile ? navigationToggle : null}
            <Tooltip content={`Theme: ${themeMode}. Switch to ${nextMode}.`} relationship="description">
              <Button
                className={styles.themeButton}
                appearance="subtle"
                icon={<ThemeIcon size={18} aria-hidden="true" />}
                aria-label={`Theme: ${themeMode}. Switch to ${nextMode}.`}
                onClick={() => onThemeChange(nextMode)}
              >
                <span className={styles.themeText}>{themeMode === 'system' ? 'System' : themeMode === 'light' ? 'Light' : 'Dark'}</span>
              </Button>
            </Tooltip>
            {authMode !== 'demo' && !currentMember ? (
              <Button
                className={styles.identityButton}
                appearance="primary"
                icon={<LogIn size={17} />}
                aria-label={authMode === 'misconfigured' ? 'Authentication unavailable' : 'Sign in with Google'}
                onClick={onSignIn}
                disabled={identityLoading || authMode === 'misconfigured'}
              >
                <span className={styles.identityText}>
                  {authMode === 'misconfigured' ? 'Unavailable' : 'Sign in'}
                </span>
              </Button>
            ) : (
            <Popover open={identityOpen} onOpenChange={(_, data) => setIdentityOpen(data.open)} positioning="below-end" trapFocus>
              <PopoverTrigger disableButtonEnhancement>
                <Button
                  className={styles.identityButton}
                  appearance="subtle"
                  aria-label={
                    authMode === 'demo'
                      ? currentMember
                        ? `Demo identity: ${currentMember.name}`
                        : 'Demo identity'
                      : currentMember
                        ? `Account: ${currentMember.name}`
                        : 'Account'
                  }
                >
                  <Avatar name={currentMember?.name} size={28} color="brand" aria-hidden="true" />
                  <Text size={200} className={styles.identityText}>
                    {authMode === 'demo' ? 'Demo' : currentMember?.name || 'Account'}
                  </Text>
                </Button>
              </PopoverTrigger>
              <PopoverSurface className={styles.identityPanel} role="dialog" aria-label={authMode === 'demo' ? 'Demo identity' : 'Account'}>
                <div className={styles.identityPanelHeader}>
                  <h2 className={styles.identityPanelTitle}>{authMode === 'demo' ? 'Demo identity' : 'Account'}</h2>
                  <Button appearance="subtle" icon={<X size={18} />} aria-label={authMode === 'demo' ? 'Close demo identity' : 'Close account'} onClick={() => setIdentityOpen(false)} />
                </div>
                {authMode === 'demo' ? (
                  <>
                <Field label="Development identity">
                  <Select
                    className={styles.select}
                    select={{ className: styles.selectInput }}
                    value={currentUserId}
                    onChange={(event) => {
                      onIdentityChange(event.target.value);
                      setIdentityOpen(false);
                    }}
                    disabled={identityLoading || members.length === 0}
                  >
                    {members.length === 0 ? (
                      <option value={currentUserId}>{identityLoading ? 'Loading identities...' : 'No identities available'}</option>
                    ) : members.map((member) => (
                      <option key={member.id} value={member.id}>{member.name} · {member.role}</option>
                    ))}
                  </Select>
                </Field>
                <Text size={200} className={styles.muted}>Synthetic identities for local role testing. This is not a production account.</Text>
                  </>
                ) : currentMember ? (
                  <>
                    <Text weight="semibold">{currentMember.name}</Text>
                    <Text size={200}>{currentMember.email}</Text>
                    <Text size={200}>Status: {currentMember.status}</Text>
                    <Button icon={<LogOut size={17} />} onClick={onSignOut}>Sign out</Button>
                  </>
                ) : null}
              </PopoverSurface>
            </Popover>
            )}
          </div>
          {identityError ? <Text role="alert" className={styles.error}>{identityError}</Text> : null}
        </header>
        <main className={styles.content} id="main-content" tabIndex={-1}>
          <Outlet context={context} />
        </main>
        <footer className={styles.footer}>
          <span>
            <Text size={200}>Your campus, connected. </Text>
            <Link to="/privacy">Privacy</Link>
            <Text size={200}> · </Text>
            <Link to="/terms">Terms</Link>
          </span>
          <span className={styles.demoLabel}>
            {authMode === 'demo'
              ? <FlaskConical size={13} aria-hidden="true" />
              : <Cloud size={13} aria-hidden="true" />}
            <Text size={200}>
              {authMode === 'demo' ? 'Demo workspace · Synthetic data' : 'Live pilot · Supabase'}
            </Text>
          </span>
        </footer>
      </div>
      {mobile ? (
        <OverlayDrawer open={menuOpen} onOpenChange={(_, data) => { if (!data.open) closeNavigation(); }} position="start" aria-label="Workspace navigation" className={styles.drawer}>
          <div className={styles.drawerHeader}>
            <Text size={500}>Your workspace</Text>
            <Button className={styles.iconButton} appearance="subtle" icon={<X size={20} />} aria-label="Close navigation" onClick={closeNavigation} />
          </div>
          {navigation}
        </OverlayDrawer>
      ) : null}
    </div>
  );
}
