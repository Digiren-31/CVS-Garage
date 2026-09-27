import {
  Button,
  Select,
  Text,
  Tooltip,
  makeStyles,
  shorthands,
  tokens
} from '@fluentui/react-components';
import {
  CalendarDays,
  Home,
  Lightbulb,
  Menu,
  MessageSquareText,
  MoonStar,
  PanelsTopLeft,
  Trophy,
  Users,
  X
} from 'lucide-react';
import { useEffect, useState, type ChangeEvent } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import type { Member } from '../../../../packages/contracts/src';
import {
  areaDetails,
  type AreaId,
  type ThemeMode
} from '../../../../packages/ui/src';

const navigation: Array<{
  to: string;
  label: string;
  description: string;
  area: AreaId;
  icon: typeof Home;
}> = [
  { to: '/', label: 'Overview', description: 'Portal dashboard', area: 'portal', icon: Home },
  { to: '/projects', label: 'Projects', description: 'Build and showcase', area: 'projects', icon: PanelsTopLeft },
  { to: '/events', label: 'Events', description: 'Discover and register', area: 'events', icon: CalendarDays },
  { to: '/member-centre', label: 'Member Centre', description: 'Profiles and mentors', area: 'member-centre', icon: Users },
  { to: '/leaderboards', label: 'Leaderboards', description: 'Recognize contribution', area: 'leaderboards', icon: Trophy },
  { to: '/idea-centre', label: 'Idea Centre', description: 'Propose and collaborate', area: 'idea-centre', icon: Lightbulb },
  { to: '/forum', label: 'Forum', description: 'Discuss and solve', area: 'forum', icon: MessageSquareText }
];

const useStyles = makeStyles({
  root: {
    minHeight: '100vh',
    display: 'grid',
    gridTemplateColumns: '280px minmax(0, 1fr)',
    backgroundColor: tokens.colorNeutralBackground2,
    '@media (max-width: 900px)': {
      gridTemplateColumns: '1fr'
    }
  },
  skipLink: {
    position: 'fixed',
    top: tokens.spacingVerticalS,
    left: tokens.spacingHorizontalS,
    zIndex: 100,
    transform: 'translateY(-160%)',
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
    ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalM),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ':focus': {
      transform: 'translateY(0)'
    }
  },
  sidebar: {
    position: 'sticky',
    top: 0,
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderRight('1px', 'solid', tokens.colorNeutralStroke2),
    zIndex: 20,
    '@media (max-width: 900px)': {
      position: 'fixed',
      left: 0,
      width: 'min(86vw, 320px)',
      transform: 'translateX(-105%)',
      visibility: 'hidden',
      transitionProperty: 'transform',
      transitionDuration: '180ms'
    }
  },
  sidebarOpen: {
    '@media (max-width: 900px)': {
      transform: 'translateX(0)',
      visibility: 'visible'
    }
  },
  brand: {
    minHeight: '76px',
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    ...shorthands.padding(0, tokens.spacingHorizontalL),
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2)
  },
  brandMark: {
    width: '40px',
    height: '40px',
    display: 'grid',
    placeItems: 'center',
    ...shorthands.borderRadius(tokens.borderRadiusLarge),
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    fontWeight: tokens.fontWeightBold,
    fontSize: tokens.fontSizeBase500
  },
  nav: {
    display: 'grid',
    gap: tokens.spacingVerticalXS,
    ...shorthands.padding(tokens.spacingVerticalL, tokens.spacingHorizontalM),
    overflowY: 'auto'
  },
  navLink: {
    display: 'grid',
    gridTemplateColumns: '36px 1fr',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    color: tokens.colorNeutralForeground2,
    textDecorationLine: 'none',
    ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalS),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
      color: tokens.colorNeutralForeground1
    }
  },
  navLinkActive: {
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground1,
    fontWeight: tokens.fontWeightSemibold
  },
  navIcon: {
    width: '32px',
    height: '32px',
    display: 'grid',
    placeItems: 'center',
    ...shorthands.borderRadius(tokens.borderRadiusMedium)
  },
  sidebarFooter: {
    marginTop: 'auto',
    display: 'grid',
    gap: tokens.spacingVerticalS,
    ...shorthands.padding(tokens.spacingVerticalL),
    ...shorthands.borderTop('1px', 'solid', tokens.colorNeutralStroke2)
  },
  main: {
    minWidth: 0
  },
  header: {
    minHeight: '76px',
    position: 'sticky',
    top: 0,
    zIndex: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalXXL),
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    '@media (max-width: 700px)': {
      ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalM),
      alignItems: 'stretch',
      flexDirection: 'column'
    }
  },
  headerStart: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM
  },
  mobileMenu: {
    display: 'none',
    '@media (max-width: 900px)': {
      display: 'inline-flex'
    }
  },
  headerControls: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: tokens.spacingHorizontalS,
    '@media (max-width: 700px)': {
      justifyContent: 'stretch',
      alignItems: 'stretch',
      flexDirection: 'column',
      width: '100%',
      '& > span': {
        width: '100%'
      },
      '& select': {
        width: '100%',
        minWidth: 0
      },
      '& > svg': {
        display: 'none'
      }
    }
  },
  content: {
    width: 'min(1480px, 100%)',
    marginInline: 'auto',
    ...shorthands.padding(tokens.spacingVerticalXXL, tokens.spacingHorizontalXXL),
    '@media (max-width: 700px)': {
      ...shorthands.padding(tokens.spacingVerticalL, tokens.spacingHorizontalM)
    }
  },
  backdrop: {
    display: 'none',
    '@media (max-width: 900px)': {
      position: 'fixed',
      inset: 0,
      zIndex: 15,
      display: 'block',
      backgroundColor: 'rgba(0, 0, 0, 0.45)'
    }
  },
  closeButton: {
    display: 'none',
    marginLeft: 'auto',
    '@media (max-width: 900px)': {
      display: 'inline-flex'
    }
  }
});

interface AppShellProps {
  members: Member[];
  currentUserId: string;
  identityError: string | null;
  themeMode: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
  onIdentityChange: (userId: string) => void;
}

export function AppShell({
  members,
  currentUserId,
  identityError,
  themeMode,
  onThemeChange,
  onIdentityChange
}: AppShellProps) {
  const styles = useStyles();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const activeItem =
    navigation.find((item) =>
      item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)
    ) || navigation[0];

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.title = `${activeItem.label} — CVS Garage`;
    document.getElementById('main-content')?.focus();
  }, [activeItem.label]);

  useEffect(() => {
    if (!menuOpen) {
      return undefined;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen]);

  function handleIdentity(event: ChangeEvent<HTMLSelectElement>) {
    onIdentityChange(event.target.value);
  }

  function handleTheme(event: ChangeEvent<HTMLSelectElement>) {
    onThemeChange(event.target.value as ThemeMode);
  }

  return (
    <div className={styles.root}>
      <a className={styles.skipLink} href="#main-content">Skip to main content</a>
      {menuOpen ? (
        <button
          type="button"
          className={styles.backdrop}
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}
      <aside className={`${styles.sidebar} ${menuOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.brand}>
          <div className={styles.brandMark} aria-hidden="true">CV</div>
          <div>
            <Text block weight="semibold" size={500}>CVS Garage</Text>
            <Text block size={200}>College innovation portal</Text>
          </div>
          <Button
            className={styles.closeButton}
            appearance="subtle"
            icon={<X size={20} />}
            aria-label="Close navigation"
            onClick={() => setMenuOpen(false)}
          />
        </div>
        <nav className={styles.nav} aria-label="Primary navigation">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
                }
              >
                <span
                  className={styles.navIcon}
                  style={{ color: areaDetails[item.area].color }}
                  aria-hidden="true"
                >
                  <Icon size={20} />
                </span>
                <span>
                  <Text block weight="semibold">{item.label}</Text>
                  <Text block size={200}>{item.description}</Text>
                </span>
              </NavLink>
            );
          })}
        </nav>
        <div className={styles.sidebarFooter}>
          <Text size={200}>Local development MVP</Text>
          <Text size={200}>Data is synthetic and stored locally.</Text>
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerStart}>
            <Button
              className={styles.mobileMenu}
              appearance="subtle"
              icon={<Menu size={20} />}
              aria-label="Open navigation"
              onClick={() => setMenuOpen(true)}
            />
            <div>
              <Text block size={200}>Workspace</Text>
              <Text block weight="semibold" size={500}>{activeItem.label}</Text>
            </div>
          </div>
          <div className={styles.headerControls}>
            {identityError ? (
              <Text role="alert" size={200}>{identityError}</Text>
            ) : null}
            <Tooltip content="Select a synthetic identity for local role testing" relationship="label">
              <Select
                aria-label="Development identity"
                value={currentUserId}
                onChange={handleIdentity}
              >
                {members.length === 0 ? (
                  <option value={currentUserId}>Loading identities…</option>
                ) : (
                  members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} · {member.role}
                    </option>
                  ))
                )}
              </Select>
            </Tooltip>
            <Tooltip content="Choose the portal color mode" relationship="label">
              <Select aria-label="Theme mode" value={themeMode} onChange={handleTheme}>
                <option value="system">System theme</option>
                <option value="light">Light theme</option>
                <option value="dark">Dark theme</option>
              </Select>
            </Tooltip>
            <MoonStar size={20} aria-hidden="true" />
          </div>
        </header>
        <main className={styles.content} id="main-content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
