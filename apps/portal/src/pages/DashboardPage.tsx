import {
  Button,
  Card,
  CardHeader,
  Text,
  makeStyles,
  shorthands,
  tokens
} from '@fluentui/react-components';
import {
  ArrowRight,
  CalendarDays,
  Lightbulb,
  MessageSquareText,
  PanelsTopLeft,
  Trophy,
  Users
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../../../packages/api-client/src';
import type { DashboardSummary } from '../../../../packages/contracts/src';
import {
  CardGrid,
  MetricCard,
  MetricGrid,
  ServicePage,
  StatePanel,
  StatusBadge
} from '../../../../packages/ui/src';

const useStyles = makeStyles({
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    marginBottom: tokens.spacingVerticalM
  },
  serviceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
    gap: tokens.spacingHorizontalM
  },
  serviceLink: {
    color: 'inherit',
    textDecorationLine: 'none'
  },
  serviceCard: {
    height: '100%',
    ...shorthands.padding(tokens.spacingVerticalL),
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover
    }
  },
  serviceIcon: {
    width: '42px',
    height: '42px',
    display: 'grid',
    placeItems: 'center',
    ...shorthands.borderRadius(tokens.borderRadiusLarge),
    color: tokens.colorNeutralForegroundOnBrand
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    alignItems: 'center',
    ...shorthands.padding(tokens.spacingVerticalS, 0),
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2)
  }
});

const serviceLinks = [
  { to: '/projects', label: 'Projects', detail: 'Track delivery and milestones', icon: PanelsTopLeft, color: '#5b5fc7' },
  { to: '/events', label: 'Events', detail: 'Discover campus opportunities', icon: CalendarDays, color: '#c239b3' },
  { to: '/member-centre', label: 'Member Centre', detail: 'Find peers and mentors', icon: Users, color: '#1e6b3f' },
  { to: '/leaderboards', label: 'Leaderboards', detail: 'Celebrate contribution', icon: Trophy, color: '#a15c00' },
  { to: '/idea-centre', label: 'Idea Centre', detail: 'Shape ideas into teams', icon: Lightbulb, color: '#d83b01' },
  { to: '/forum', label: 'Forum', detail: 'Ask, discuss, and solve', icon: MessageSquareText, color: '#007e8c' }
];

export function DashboardPage() {
  const styles = useStyles();
  const navigate = useNavigate();
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

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <StatePanel state="loading" message="Loading the college innovation workspace" />;
  }

  if (error || !summary) {
    return <StatePanel state="error" message={error || 'No overview is available.'} onRetry={load} />;
  }

  return (
    <ServicePage
      area="portal"
      title="Build, collaborate, and learn in one place"
      description="Move from an early idea to a supported project, find events and mentors, share solutions, and recognize the people contributing across campus."
      actions={
        <Button onClick={() => navigate('/idea-centre')} appearance="primary" icon={<Lightbulb size={18} />}>
          Submit an idea
        </Button>
      }
    >
      <MetricGrid>
        <MetricCard label="Community members" value={summary.memberCount} />
        <MetricCard label="Active projects" value={summary.activeProjectCount} />
        <MetricCard label="Upcoming events" value={summary.upcomingEventCount} />
        <MetricCard label="Open ideas" value={summary.openIdeaCount} />
        <MetricCard label="Forum discussions" value={summary.discussionCount} />
      </MetricGrid>

      <section aria-labelledby="service-heading">
        <div className={styles.sectionHeader}>
          <Text id="service-heading" size={600} weight="semibold">Explore the workspace</Text>
        </div>
        <div className={styles.serviceGrid}>
          {serviceLinks.map(({ to, label, detail, icon: Icon, color }) => (
            <Link key={to} to={to} className={styles.serviceLink}>
              <Card className={styles.serviceCard}>
                <div className={styles.serviceIcon} style={{ backgroundColor: color }}>
                  <Icon size={22} aria-hidden="true" />
                </div>
                <Text block size={500} weight="semibold">{label}</Text>
                <Text block>{detail}</Text>
                <Text weight="semibold">Open <ArrowRight size={14} aria-hidden="true" /></Text>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="featured-heading">
        <div className={styles.sectionHeader}>
          <Text id="featured-heading" size={600} weight="semibold">Featured work</Text>
          <Button onClick={() => navigate('/projects')} appearance="subtle">View projects</Button>
        </div>
        <CardGrid>
          {summary.featuredProjects.map((project) => (
            <Card key={project.id}>
              <CardHeader
                header={<Text weight="semibold">{project.name}</Text>}
                description={<Text>{project.category}</Text>}
                action={<StatusBadge status={project.status} />}
              />
              <Text>{project.tagline}</Text>
              <Text size={200}>{project.progress}% complete · {project.memberIds.length} contributors</Text>
            </Card>
          ))}
        </CardGrid>
      </section>

      <section aria-labelledby="activity-heading">
        <div className={styles.sectionHeader}>
          <Text id="activity-heading" size={600} weight="semibold">What is happening next</Text>
          <Button onClick={() => navigate('/events')} appearance="subtle">All events</Button>
        </div>
        <Card>
          {summary.upcomingEvents.map((event) => (
            <div key={event.id} className={styles.row}>
              <div>
                <Text block weight="semibold">{event.title}</Text>
                <Text block size={200}>{new Date(event.startsAt).toLocaleString()} · {event.venue}</Text>
              </div>
              <StatusBadge status={event.mode} />
            </div>
          ))}
        </Card>
      </section>

      <section aria-labelledby="ideas-heading">
        <div className={styles.sectionHeader}>
          <Text id="ideas-heading" size={600} weight="semibold">Ideas looking for collaborators</Text>
          <Button onClick={() => navigate('/idea-centre')} appearance="subtle">Explore ideas</Button>
        </div>
        <CardGrid>
          {summary.recentIdeas.map((idea) => (
            <Card key={idea.id}>
              <CardHeader
                header={<Text weight="semibold">{idea.title}</Text>}
                description={<Text>{idea.track}</Text>}
                action={<StatusBadge status={idea.status} />}
              />
              <Text>{idea.tagline}</Text>
              <Text size={200}>
                {idea.memberIds.length}/{idea.targetTeamSize} team members
                {idea.seekingMentor ? ' · Seeking mentor' : ''}
              </Text>
            </Card>
          ))}
        </CardGrid>
      </section>

      {summary.topContributor ? (
        <section aria-labelledby="recognition-heading">
          <div className={styles.sectionHeader}>
            <Text id="recognition-heading" size={600} weight="semibold">Community recognition</Text>
            <Button onClick={() => navigate('/leaderboards')} appearance="subtle">Open leaderboards</Button>
          </div>
          <Card>
            <CardHeader
              header={<Text weight="semibold">{summary.topContributor.memberName}</Text>}
              description={<Text>{summary.topContributor.department}</Text>}
              action={<StatusBadge status={`${summary.topContributor.score} points`} />}
            />
            <Text>Leading this scoring period through verified project, event, idea, and forum contributions.</Text>
          </Card>
        </section>
      ) : null}
    </ServicePage>
  );
}
