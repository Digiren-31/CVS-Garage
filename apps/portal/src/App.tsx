import {
  lazy,
  Suspense,
  useEffect,
  useCallback,
  useMemo,
  useState,
  type ComponentType,
  type LazyExoticComponent
} from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { api } from '../../../packages/api-client/src';
import type { Member } from '../../../packages/contracts/src';
import {
  CvsThemeProvider,
  StatePanel,
  type AreaId,
  type ThemeMode
} from '../../../packages/ui/src';
import { Toaster } from '@fluentui/react-components';
import { AppShell } from './components/AppShell';
import { AuthGate } from './components/AuthGate';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { NotFoundPage } from './pages/NotFoundPage';

const DashboardPage = lazy(async () => ({
  default: (await import('./pages/DashboardPage')).DashboardPage
}));
const ProjectsPage = lazy(async () => ({
  default: (await import('../../../services/projects/src')).ProjectsPage
}));
const EventsPage = lazy(async () => ({
  default: (await import('../../../services/events/src')).EventsPage
}));
const MemberCentrePage = lazy(async () => ({
  default: (await import('../../../services/member-centre/src')).MemberCentrePage
}));
const LeaderboardsPage = lazy(async () => ({
  default: (await import('../../../services/leaderboards/src')).LeaderboardsPage
}));
const IdeaCentrePage = lazy(async () => ({
  default: (await import('../../../services/idea-centre/src')).IdeaCentrePage
}));
const ForumPage = lazy(async () => ({
  default: (await import('../../../services/forum/src')).ForumPage
}));

const areaByPath: Array<[string, AreaId]> = [
  ['/projects', 'projects'],
  ['/events', 'events'],
  ['/member-centre', 'member-centre'],
  ['/leaderboards', 'leaderboards'],
  ['/idea-centre', 'idea-centre'],
  ['/forum', 'forum']
];

function getStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'system';
  }
  try {
    const value = window.localStorage.getItem('cvs-garage-theme');
    return value === 'light' || value === 'dark' || value === 'system' ? value : 'system';
  } catch (error) {
    console.warn('The theme preference could not be restored. Using the system theme.', error);
    return 'system';
  }
}

function LazyService({
  component: Component
}: {
  component: LazyExoticComponent<ComponentType>;
}) {
  return (
    <Suspense fallback={<StatePanel state="loading" message="Loading service workspace" />}>
      <Component />
    </Suspense>
  );
}

type PortalAuthMode = ReturnType<typeof api.auth.mode>;

function ProtectedService({
  component,
  mode,
  member,
  loading,
  error,
  onSignIn,
  onSignOut
}: {
  component: LazyExoticComponent<ComponentType>;
  mode: PortalAuthMode;
  member: Member | null;
  loading: boolean;
  error: string | null;
  onSignIn: () => void;
  onSignOut: () => void;
}) {
  return (
    <AuthGate
      mode={mode}
      member={member}
      loading={loading}
      error={error}
      onSignIn={onSignIn}
      onSignOut={onSignOut}
    >
      <LazyService component={component} />
    </AuthGate>
  );
}

export function App() {
  const location = useLocation();
  const [themeMode, setThemeMode] = useState<ThemeMode>(getStoredTheme);
  const [members, setMembers] = useState<Member[]>([]);
  const [identityLoading, setIdentityLoading] = useState(true);
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [identityVersion, setIdentityVersion] = useState(0);
  const [currentMember, setCurrentMember] = useState<Member | null>(null);
  const [realtimeVersion, setRealtimeVersion] = useState(0);
  const authMode = api.auth.mode();

  const area = useMemo(
    () => areaByPath.find(([path]) => location.pathname.startsWith(path))?.[1] || 'portal',
    [location.pathname]
  );

  const loadDemoMembers = useCallback(() => {
    let active = true;
    api.members
      .list()
      .then((result) => {
        if (active) {
          setMembers(result.filter((member) => member.status === 'active'));
          setIdentityError(null);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setIdentityError(error instanceof Error ? error.message : 'Member identities could not be loaded.');
        }
      })
      .finally(() => {
        if (active) setIdentityLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const loadSupabaseSession = useCallback(async () => {
    setIdentityLoading(true);
    try {
      const session = await api.auth.getSession();
      if (!session) {
        api.setAuthenticatedUserId(null);
        setCurrentMember(null);
        setMembers([]);
        setIdentityError(null);
        return;
      }

      const member = await api.auth.currentMember();
      api.setAuthenticatedUserId(member.id);
      setCurrentMember(member);
      if (member.status === 'active') {
        setMembers(await api.members.list());
      } else {
        setMembers([member]);
      }
      setIdentityError(null);
    } catch (error) {
      api.setAuthenticatedUserId(null);
      setCurrentMember(null);
      setMembers([]);
      setIdentityError(
        error instanceof Error ? error.message : 'The secure session could not be loaded.'
      );
    } finally {
      setIdentityLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authMode === 'demo') {
      return loadDemoMembers();
    }
    if (authMode === 'misconfigured') {
      setIdentityLoading(false);
      setIdentityError('Production authentication is not configured.');
      return undefined;
    }

    void loadSupabaseSession();
    return api.auth.onChange(() => {
      window.setTimeout(() => {
        void loadSupabaseSession();
      }, 0);
    });
  }, [authMode, loadDemoMembers, loadSupabaseSession]);

  useEffect(() => {
    if (authMode !== 'supabase' || currentMember?.status !== 'active') {
      return undefined;
    }
    return api.subscribeToRealtime(['forum', 'events', 'projects'], () => {
      setRealtimeVersion((version) => version + 1);
    });
  }, [authMode, currentMember?.id, currentMember?.status]);

  function updateTheme(nextMode: ThemeMode) {
    setThemeMode(nextMode);
    try {
      window.localStorage.setItem('cvs-garage-theme', nextMode);
    } catch (error) {
      console.warn('The theme preference could not be saved. It will apply for this session.', error);
    }
  }

  function updateIdentity(userId: string) {
    api.setUserId(userId);
    setIdentityVersion((version) => version + 1);
  }

  async function signIn() {
    try {
      setIdentityError(null);
      await api.auth.signInWithGoogle();
    } catch (error) {
      setIdentityError(error instanceof Error ? error.message : 'Google sign-in could not start.');
    }
  }

  async function signOut() {
    try {
      await api.auth.signOut();
      api.setAuthenticatedUserId(null);
      setCurrentMember(null);
      setMembers([]);
      setIdentityError(null);
    } catch (error) {
      setIdentityError(error instanceof Error ? error.message : 'Sign-out failed.');
    }
  }

  const protectedProps = {
    mode: authMode,
    member: currentMember,
    loading: identityLoading,
    error: identityError,
    onSignIn: () => { void signIn(); },
    onSignOut: () => { void signOut(); }
  };
  const dataVersion = `${identityVersion}-${realtimeVersion}`;

  return (
    <CvsThemeProvider area={area} mode={themeMode}>
      <Toaster position="top-end" />
      <AppErrorBoundary>
        <Routes>
          <Route
            element={
              <AppShell
                members={members}
                currentUserId={api.getUserId()}
                authenticatedMember={currentMember}
                authMode={authMode}
                identityError={identityError}
                identityLoading={identityLoading}
                themeMode={themeMode}
                onThemeChange={updateTheme}
                onIdentityChange={updateIdentity}
                onSignIn={protectedProps.onSignIn}
                onSignOut={protectedProps.onSignOut}
              />
            }
          >
            <Route index element={<LazyService key={`dashboard-${dataVersion}`} component={DashboardPage} />} />
            <Route
              path="auth/callback"
              element={
                identityLoading
                  ? <StatePanel state="loading" message="Completing Google sign-in" />
                  : <Navigate to={api.auth.consumeReturnTo()} replace />
              }
            />
            <Route
              path="projects"
              element={<ProtectedService key={`projects-${dataVersion}`} component={ProjectsPage} {...protectedProps} />}
            />
            <Route
              path="projects/:projectId"
              element={<ProtectedService key={`projects-${dataVersion}`} component={ProjectsPage} {...protectedProps} />}
            />
            <Route
              path="events"
              element={<ProtectedService key={`events-${dataVersion}`} component={EventsPage} {...protectedProps} />}
            />
            <Route
              path="events/:eventId"
              element={<ProtectedService key={`events-${dataVersion}`} component={EventsPage} {...protectedProps} />}
            />
            <Route
              path="member-centre"
              element={<ProtectedService key={`members-${dataVersion}`} component={MemberCentrePage} {...protectedProps} />}
            />
            <Route
              path="member-centre/members/:memberId"
              element={<ProtectedService key={`members-${dataVersion}`} component={MemberCentrePage} {...protectedProps} />}
            />
            <Route
              path="leaderboards/*"
              element={<ProtectedService key={`leaderboards-${dataVersion}`} component={LeaderboardsPage} {...protectedProps} />}
            />
            <Route
              path="idea-centre"
              element={<ProtectedService key={`ideas-${dataVersion}`} component={IdeaCentrePage} {...protectedProps} />}
            />
            <Route
              path="idea-centre/ideas/:ideaId"
              element={<ProtectedService key={`ideas-${dataVersion}`} component={IdeaCentrePage} {...protectedProps} />}
            />
            <Route
              path="forum"
              element={<ProtectedService key={`forum-${dataVersion}`} component={ForumPage} {...protectedProps} />}
            />
            <Route path="forum/posts/:postId" element={<ProtectedService key={`forum-${dataVersion}`} component={ForumPage} {...protectedProps} />} />
            <Route path="forum/communities" element={<ProtectedService key={`forum-${dataVersion}`} component={ForumPage} {...protectedProps} />} />
            <Route path="forum/mentors" element={<ProtectedService key={`forum-${dataVersion}`} component={ForumPage} {...protectedProps} />} />
            <Route path="forum/moderation" element={<ProtectedService key={`forum-${dataVersion}`} component={ForumPage} {...protectedProps} />} />
            <Route path="home" element={<Navigate to="/" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </AppErrorBoundary>
    </CvsThemeProvider>
  );
}
