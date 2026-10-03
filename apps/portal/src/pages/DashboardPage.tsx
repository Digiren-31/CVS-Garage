import { Card, ProgressBar, Text } from '@fluentui/react-components';
import { domAnimation, LazyMotion, m, MotionConfig, useReducedMotion } from 'framer-motion';
import { ArrowRight, CalendarDays, Lightbulb, PanelsTopLeft, Sparkles, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { api } from '../../../../packages/api-client/src';
import type { DashboardSummary } from '../../../../packages/contracts/src';
import { StatePanel, StatusBadge } from '../../../../packages/ui/src';
import type { WorkspaceContext } from '../components/AppShell';
import { useDashboardStyles } from './DashboardPage.styles';

export function DashboardPage() {
  const styles = useDashboardStyles();
  const reducedMotion = useReducedMotion();
  const { authMode, currentMember } = useOutletContext<WorkspaceContext>();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSummary(await api.dashboard.get());
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'The portal overview could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <StatePanel state="loading" message="Loading the college innovation workspace" />;
  if (error || !summary) return <StatePanel state="error" message={error || 'No overview is available.'} onRetry={load} />;

  const firstName = currentMember?.name.trim().replace(/^Dr\.\s+/i, '').split(/\s+/)[0];
  const publicVisitor = authMode !== 'demo' && !currentMember;

  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={domAnimation} strict>
        <m.div
          className={styles.page}
          data-reference-dashboard
          initial={reducedMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.24 }}
        >
          <header className={styles.heading} data-pointer-glow>
            <div className={styles.headingCopy}>
              <span className={styles.eyebrow}><Sparkles size={15} aria-hidden="true" /> The campus is yours to shape</span>
              <h1 className={styles.title}>
                {publicVisitor
                  ? 'Welcome to CVS Garage.'
                  : firstName
                    ? `Welcome in, ${firstName}.`
                    : 'Welcome in.'}
              </h1>
              <Text className={styles.headingDescription}>
                {publicVisitor
                  ? 'Explore the campus innovation pulse, then sign in to enter service workspaces.'
                  : 'Pick up a project, or see what is happening on campus.'}
              </Text>
            </div>
            <div className={styles.heroArt} aria-hidden="true">
              <div className={styles.orbit}>
                <span className={styles.orbitNode}><PanelsTopLeft size={22} /></span>
                <span className={styles.orbitNode}><Lightbulb size={22} /></span>
                <span className={styles.orbitNode}><Users size={22} /></span>
                <span className={styles.orbitNode}><CalendarDays size={22} /></span>
                <img className={styles.orbitCenter} src="/garage-mark.svg" alt="" width="80" height="80" />
              </div>
            </div>
          </header>

          <section aria-label="Campus at a glance">
            <dl className={styles.stats}>
              <div className={styles.stat} data-pointer-glow><dt className={styles.statLabel}><Users size={18} aria-hidden="true" />Community members</dt><dd className={styles.statValue}>{summary.memberCount}</dd></div>
              <div className={styles.stat} data-pointer-glow><dt className={styles.statLabel}><PanelsTopLeft size={18} aria-hidden="true" />Active projects</dt><dd className={styles.statValue}>{summary.activeProjectCount}</dd></div>
              <div className={styles.stat} data-pointer-glow><dt className={styles.statLabel}><CalendarDays size={18} aria-hidden="true" />Upcoming events</dt><dd className={styles.statValue}>{summary.upcomingEventCount}</dd></div>
            </dl>
          </section>

          <div className={styles.sections}>
            <section aria-labelledby="featured-heading">
              <div className={styles.sectionHeader}>
                <div className={styles.sectionHeading}><span className={styles.sectionIcon}><PanelsTopLeft size={18} aria-hidden="true" /></span><h2 id="featured-heading" className={styles.sectionTitle}>Featured projects</h2></div>
                <Link className={styles.textLink} to="/projects">All projects <ArrowRight size={16} aria-hidden="true" /></Link>
              </div>
              <div className={styles.list}>
                {summary.featuredProjects.slice(0, 2).map((project) => (
                  <Card key={project.id} className={styles.card} data-pointer-glow>
                    <div className={styles.cardHeader}>
                      <Text size={200} className={styles.muted}>{project.category}</Text>
                      <StatusBadge status={project.status.replaceAll('_', ' ')} />
                    </div>
                    <h3 className={styles.itemTitle}>
                      <Link className={styles.itemLink} to={`/projects/${encodeURIComponent(project.id)}`}>{project.name}</Link>
                    </h3>
                    <Text className={styles.description}>{project.tagline}</Text>
                    <div className={styles.progress}>
                      <div className={styles.cardHeader}>
                        <Text size={200}>{project.memberIds.length} contributors</Text>
                        <Text size={200}>{project.progress}% complete</Text>
                      </div>
                      <ProgressBar aria-label={project.name} value={project.progress / 100} />
                    </div>
                    <Link className={styles.textLink} to={`/projects/${encodeURIComponent(project.id)}`}>View project <ArrowRight size={16} aria-hidden="true" /></Link>
                  </Card>
                ))}
                {summary.featuredProjects.length === 0 ? (
                  <StatePanel
                    state="empty"
                    title={publicVisitor ? 'Project details require sign-in' : 'No featured projects yet'}
                    message={publicVisitor ? 'Use the Google sign-in button to view approved project workspaces.' : 'Your next project could start here.'}
                  />
                ) : null}
              </div>
            </section>

            <section aria-labelledby="agenda-heading">
              <div className={styles.sectionHeader}>
                <div className={styles.sectionHeading}><span className={styles.sectionIcon}><CalendarDays size={18} aria-hidden="true" /></span><h2 id="agenda-heading" className={styles.sectionTitle}>Coming up</h2></div>
                <Link className={styles.textLink} to="/events">All events <ArrowRight size={16} aria-hidden="true" /></Link>
              </div>
              <div className={styles.list}>
                {summary.upcomingEvents.slice(0, 2).map((event) => {
                  const date = new Date(event.startsAt);
                  return (
                    <Card key={event.id} className={styles.card} data-pointer-glow>
                      <time className={styles.eventDate} dateTime={event.startsAt}>
                        <CalendarDays size={15} aria-hidden="true" />
                        {date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
                        {' · '}{date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                      </time>
                      <h3 className={styles.itemTitle}>
                        <Link className={styles.itemLink} to={`/events/${encodeURIComponent(event.id)}`}>{event.title}</Link>
                      </h3>
                      <Text className={styles.description}>{event.summary}</Text>
                      <Text size={200} className={styles.muted}>{event.venue} · {event.mode}</Text>
                      <Link className={styles.textLink} to={`/events/${encodeURIComponent(event.id)}`}>View event <ArrowRight size={16} aria-hidden="true" /></Link>
                    </Card>
                  );
                })}
                {summary.upcomingEvents.length === 0 ? (
                  <StatePanel
                    state="empty"
                    title={publicVisitor ? 'Event details require sign-in' : 'Nothing scheduled just yet'}
                    message={publicVisitor ? 'Approved members can view schedules and registration capacity.' : 'New campus events will appear here when they are published.'}
                  />
                ) : null}
              </div>
            </section>
          </div>
        </m.div>
      </LazyMotion>
    </MotionConfig>
  );
}
