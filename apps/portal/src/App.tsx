import {
  lazy,
  Suspense,
  useEffect,
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

export function App() {
  const location = useLocation();
  const [themeMode, setThemeMode] = useState<ThemeMode>(getStoredTheme);
  const [members, setMembers] = useState<Member[]>([]);
  const [identityLoading, setIdentityLoading] = useState(true);
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [identityVersion, setIdentityVersion] = useState(0);

  const area = useMemo(
    () => areaByPath.find(([path]) => location.pathname.startsWith(path))?.[1] || 'portal',
    [location.pathname]
  );

  useEffect(() => {
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
                identityError={identityError}
                identityLoading={identityLoading}
                themeMode={themeMode}
                onThemeChange={updateTheme}
                onIdentityChange={updateIdentity}
              />
            }
          >
            <Route index element={<LazyService key={`dashboard-${identityVersion}`} component={DashboardPage} />} />
            <Route
              path="projects"
              element={<LazyService key={`projects-${identityVersion}`} component={ProjectsPage} />}
            />
            <Route
              path="projects/:projectId"
              element={<LazyService key={`projects-${identityVersion}`} component={ProjectsPage} />}
            />
            <Route
              path="events"
              element={<LazyService key={`events-${identityVersion}`} component={EventsPage} />}
            />
            <Route
              path="events/:eventId"
              element={<LazyService key={`events-${identityVersion}`} component={EventsPage} />}
            />
            <Route
              path="member-centre"
              element={<LazyService key={`members-${identityVersion}`} component={MemberCentrePage} />}
            />
            <Route
              path="member-centre/members/:memberId"
              element={<LazyService key={`members-${identityVersion}`} component={MemberCentrePage} />}
            />
            <Route
              path="leaderboards/*"
              element={<LazyService key={`leaderboards-${identityVersion}`} component={LeaderboardsPage} />}
            />
            <Route
              path="idea-centre"
              element={<LazyService key={`ideas-${identityVersion}`} component={IdeaCentrePage} />}
            />
            <Route
              path="idea-centre/ideas/:ideaId"
              element={<LazyService key={`ideas-${identityVersion}`} component={IdeaCentrePage} />}
            />
            <Route
              path="forum"
              element={<LazyService key={`forum-${identityVersion}`} component={ForumPage} />}
            />
            <Route path="forum/posts/:postId" element={<LazyService key={`forum-${identityVersion}`} component={ForumPage} />} />
            <Route path="forum/communities" element={<LazyService key={`forum-${identityVersion}`} component={ForumPage} />} />
            <Route path="forum/mentors" element={<LazyService key={`forum-${identityVersion}`} component={ForumPage} />} />
            <Route path="forum/moderation" element={<LazyService key={`forum-${identityVersion}`} component={ForumPage} />} />
            <Route path="home" element={<Navigate to="/" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </AppErrorBoundary>
    </CvsThemeProvider>
  );
}
