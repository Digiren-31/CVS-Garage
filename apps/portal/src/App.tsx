import { lazy, Suspense, useEffect, useRef } from 'react';
import { Route, Routes, useLocation, Link } from 'react-router-dom';
import { useApiQuery } from '@cvs-garage/api-client';
import { AreaTheme, EmptyState, LoadingState } from '@cvs-garage/ui';
import type { Session } from '@cvs-garage/contracts';
import { Landing } from './Landing';
import { Home } from './Home';
import { Shell } from './Shell';
import { SignIn } from './SignIn';
import { routeArea } from './services';

const Projects = lazy(() => import('@cvs-garage/projects'));
const Events = lazy(() => import('@cvs-garage/events'));
const Members = lazy(() => import('@cvs-garage/member-centre'));
const Leaderboards = lazy(() => import('@cvs-garage/leaderboards'));
const Ideas = lazy(() => import('@cvs-garage/idea-centre'));
const Forum = lazy(() => import('@cvs-garage/forum-service'));
const visitor: Session = { member: null, permissions: [], demo: false, demoAvailable: false };

export function App() {
  const location = useLocation();
  const sessionQuery = useApiQuery<Session>('/session', { staleTime: 0, refetchInterval: 60_000 });
  const session = sessionQuery.data ?? visitor;
  const previousPath = useRef(location.pathname);
  useEffect(() => {
    if (previousPath.current !== location.pathname) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      void sessionQuery.refetch();
      previousPath.current = location.pathname;
    }
    const titles: Record<string, string> = { '/': 'A little more connected', '/home': 'Campus home', '/projects': 'Projects', '/events': 'Events', '/ideas': 'Idea Centre', '/members': 'Member Centre', '/forum': 'Forum', '/leaderboards': 'Leaderboards', '/sign-in': 'Sign in' };
    document.title = `${titles[`/${location.pathname.split('/')[1]}`] ?? 'Your campus'} — CVS Garage`;
  }, [location.pathname]);
  return <><a className="skip-link" href="#main-content">Skip to content</a><Routes>
    <Route path="/" element={<Landing session={session} />} />
    <Route path="/sign-in" element={<SignIn session={session} loading={sessionQuery.isPending} error={sessionQuery.error} />} />
    <Route element={<Shell session={session} />}>
      <Route path="/home" element={<Home session={session} />} />
      {[
        { path: '/projects/*', Page: Projects }, { path: '/events/*', Page: Events },
        { path: '/members/*', Page: Members }, { path: '/leaderboards/*', Page: Leaderboards },
        { path: '/ideas/*', Page: Ideas }, { path: '/forum/*', Page: Forum },
      ].map(({ path, Page }) => <Route key={path} path={path} element={<AreaTheme area={routeArea(location.pathname)}><Suspense fallback={<LoadingState />}><Page session={session} /></Suspense></AreaTheme>} />)}
      <Route path="*" element={<main id="main-content" className="service-page"><EmptyState title="A little off campus?" description="That page doesn’t exist. Let’s get you back to somewhere familiar." action={<Link className="text-link" to="/home">Back to campus home</Link>} /></main>} />
    </Route>
  </Routes></>;
}
