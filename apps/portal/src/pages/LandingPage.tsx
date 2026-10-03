import {
  Badge,
  Button,
  Card,
  Text,
  mergeClasses
} from '@fluentui/react-components';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Lightbulb,
  LogIn,
  MessagesSquare,
  PanelsTopLeft,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  UsersRound,
  type LucideIcon
} from 'lucide-react';
import {
  LazyMotion,
  MotionConfig,
  domAnimation,
  m,
  useReducedMotion
} from 'framer-motion';
import { useEffect, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../../../packages/api-client/src';
import type { DashboardSummary } from '../../../../packages/contracts/src';
import { areaTokens } from '../../../../packages/ui/src';
import { useLandingStyles } from './LandingPage.styles';

type LandingAreaStyle = CSSProperties & {
  '--landing-accent': string;
  '--landing-tint': string;
};

interface WorkspaceCard {
  area:
    | 'projects'
    | 'events'
    | 'member-centre'
    | 'leaderboards'
    | 'idea-centre'
    | 'forum';
  title: string;
  description: string;
  path: string;
  icon: LucideIcon;
}

const workspaces: WorkspaceCard[] = [
  {
    area: 'projects',
    title: 'Projects',
    description: 'Move a campus challenge from proposal to milestones, teammates, and visible progress.',
    path: '/projects',
    icon: PanelsTopLeft
  },
  {
    area: 'events',
    title: 'Events',
    description: 'Discover workshops, competitions, and showcases with live capacity and registration.',
    path: '/events',
    icon: CalendarDays
  },
  {
    area: 'member-centre',
    title: 'Member Centre',
    description: 'Find builders and mentors by department, skills, experience, and shared interests.',
    path: '/member-centre',
    icon: UsersRound
  },
  {
    area: 'leaderboards',
    title: 'Leaderboards',
    description: 'Recognise thoughtful answers, accepted solutions, and meaningful campus contributions.',
    path: '/leaderboards',
    icon: Trophy
  },
  {
    area: 'idea-centre',
    title: 'Idea Centre',
    description: 'Shape rough ideas with feedback, team requests, mentor support, and clear next steps.',
    path: '/idea-centre',
    icon: Lightbulb
  },
  {
    area: 'forum',
    title: 'Forum',
    description: 'Ask hard questions, share working knowledge, and turn discussions into action.',
    path: '/forum',
    icon: MessagesSquare
  }
];

const landingImages = {
  hero:
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1600&q=84',
  code:
    'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=82',
  robotics:
    'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1000&q=82'
};

interface LandingPageProps {
  onSignIn: () => void;
  signInLoading?: boolean;
  signInError?: string | null;
}

export function LandingPage({
  onSignIn,
  signInLoading = false,
  signInError = null
}: LandingPageProps) {
  const styles = useLandingStyles();
  const reducedMotion = useReducedMotion();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summaryVersion, setSummaryVersion] = useState(0);

  useEffect(() => {
    document.title = 'CVS Garage — Build what campus needs';
    return () => {
      document.title = 'Overview — CVS Garage';
    };
  }, []);

  useEffect(() => {
    let active = true;
    setSummaryError(null);
    api.dashboard
      .get()
      .then((result) => {
        if (active) {
          setSummary(result);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setSummaryError(
            error instanceof Error
              ? error.message
              : 'Live campus totals are temporarily unavailable.'
          );
        }
      });
    return () => {
      active = false;
    };
  }, [summaryVersion]);

  const enter = reducedMotion
    ? false
    : { opacity: 0, y: 18 };
  const visible = { opacity: 1, y: 0 };

  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={domAnimation} strict>
        <m.div
          className={styles.page}
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reducedMotion ? 0 : 0.28 }}
        >
          <section className={styles.hero} aria-labelledby="landing-title">
            <m.div
              className={styles.heroCopy}
              initial={enter}
              animate={visible}
              transition={{ duration: reducedMotion ? 0 : 0.3 }}
            >
              <span className={styles.eyebrow}>
                <Sparkles size={15} aria-hidden="true" />
                One campus. Six ways to build.
              </span>
              <h1 id="landing-title" className={styles.heroTitle}>
                Build what <span className={styles.heroAccent}>campus needs.</span>
              </h1>
              <Text className={styles.heroDescription}>
                CVS Garage brings projects, events, ideas, mentors, recognition,
                and practical conversations into one shared college workspace.
              </Text>
              <div className={styles.actions}>
                <Button
                  className={styles.primaryCta}
                  appearance="primary"
                  size="large"
                  icon={<LogIn size={19} aria-hidden="true" />}
                  onClick={onSignIn}
                  disabled={signInLoading}
                >
                  {signInLoading ? 'Checking your session…' : 'Continue with Google'}
                </Button>
                <a className={styles.secondaryCta} href="#workspaces">
                  Explore the workspace <ArrowRight size={17} aria-hidden="true" />
                </a>
              </div>
              {signInError ? (
                <Text role="alert" className={styles.signInError}>{signInError}</Text>
              ) : null}
              <div className={styles.trustLine} aria-label="Access and security">
                <span className={styles.trustItem}>
                  <ShieldCheck size={16} aria-hidden="true" /> Google-verified identity
                </span>
                <span className={styles.trustItem}>
                  <CheckCircle2 size={16} aria-hidden="true" /> Admin-approved access
                </span>
                <span className={styles.trustItem}>
                  <Users size={16} aria-hidden="true" /> Built for campus teams
                </span>
              </div>
            </m.div>

            <m.div
              className={styles.heroVisual}
              initial={reducedMotion ? false : { opacity: 0, x: 22 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.32, delay: 0.08 }}
              aria-label="Students collaborating at a campus innovation event"
            >
              <div className={styles.imageFrame}>
                <img
                  className={styles.heroImage}
                  src={landingImages.hero}
                  alt="Students working together during an innovation event"
                  fetchPriority="high"
                  decoding="async"
                />
                <div className={styles.visualCaption}>
                  <span className={styles.visualCaptionTitle}>Make ideas visible.</span>
                  <Text size={200}>Find the people, momentum, and next step.</Text>
                </div>
              </div>
              <Card className={mergeClasses(styles.floatingCard, styles.floatingTop)}>
                <span className={styles.floatingLabel}>
                  <Lightbulb size={15} aria-hidden="true" /> Idea to action
                </span>
                <Text weight="semibold">Feedback, team requests, mentor support</Text>
              </Card>
              <Card className={mergeClasses(styles.floatingCard, styles.floatingBottom)}>
                <span className={styles.floatingLabel}>
                  <Trophy size={15} aria-hidden="true" /> Contribution matters
                </span>
                <Text weight="semibold">Recognise work that helps the community</Text>
              </Card>
            </m.div>
          </section>

          <section
            className={mergeClasses(styles.section, styles.metrics)}
            aria-label="CVS Garage live campus totals"
            aria-busy={!summary && !summaryError}
          >
            {[
              ['Community members', summary?.memberCount],
              ['Active projects', summary?.activeProjectCount],
              ['Upcoming events', summary?.upcomingEventCount]
            ].map(([label, value]) => (
              <div className={styles.metric} key={String(label)}>
                <Text as="strong" className={styles.metricValue}>
                  {typeof value === 'number' ? value.toLocaleString() : '—'}
                </Text>
                <Text className={styles.metricLabel}>{label}</Text>
              </div>
            ))}
            {summaryError ? (
              <div className={styles.metricError} role="alert">
                <span>{summaryError}</span>
                <Button
                  appearance="subtle"
                  size="small"
                  onClick={() => setSummaryVersion((version) => version + 1)}
                >
                  Retry
                </Button>
              </div>
            ) : null}
          </section>

          <section className={styles.section} id="workspaces" aria-labelledby="workspaces-title">
            <div className={styles.sectionHeader}>
              <span className={styles.kicker}>The shared workspace</span>
              <h2 id="workspaces-title" className={styles.sectionTitle}>
                Everything needed to move campus work forward.
              </h2>
              <Text className={styles.sectionDescription}>
                Each area stays focused, but identity, people, and contributions connect
                across the whole portal.
              </Text>
            </div>
            <div className={styles.workspaceGrid}>
              {workspaces.map((workspace, index) => {
                const Icon = workspace.icon;
                const colors = areaTokens(workspace.area);
                const variables: LandingAreaStyle = {
                  '--landing-accent': colors.foreground,
                  '--landing-tint': colors.background
                };
                return (
                  <m.div
                    key={workspace.area}
                    initial={enter}
                    whileInView={visible}
                    viewport={{ once: true, amount: 0.22 }}
                    transition={{
                      duration: reducedMotion ? 0 : 0.26,
                      delay: reducedMotion ? 0 : Math.min(index * 0.035, 0.16)
                    }}
                  >
                    <Card
                      className={styles.workspaceCard}
                      style={variables}
                      data-pointer-glow
                    >
                      <span className={styles.workspaceIcon}>
                        <Icon size={23} aria-hidden="true" />
                      </span>
                      <h3 className={styles.cardTitle}>{workspace.title}</h3>
                      <Text className={styles.cardDescription}>{workspace.description}</Text>
                      <Link className={styles.cardLink} to={workspace.path}>
                        Open after sign-in <ArrowRight size={16} aria-hidden="true" />
                      </Link>
                    </Card>
                  </m.div>
                );
              })}
            </div>
          </section>

          <m.section
            className={mergeClasses(styles.section, styles.story)}
            id="campus-stories"
            aria-labelledby="story-title"
            initial={enter}
            whileInView={visible}
            viewport={{ once: true, amount: 0.18 }}
            transition={{ duration: reducedMotion ? 0 : 0.3 }}
          >
            <div>
              <div className={styles.storyImages}>
                <img
                  className={mergeClasses(styles.storyImage, styles.storyImageLarge)}
                  src={landingImages.code}
                  alt="A student software project open in a code editor"
                  loading="lazy"
                  decoding="async"
                />
                <img
                  className={styles.storyImage}
                  src={landingImages.robotics}
                  alt="A small collaborative robotics prototype"
                  loading="lazy"
                  decoding="async"
                />
                <img
                  className={styles.storyImage}
                  src={landingImages.hero}
                  alt="Students sharing work at a campus technology event"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <Text className={styles.attribution}>
                Free photography from{' '}
                <a href="https://unsplash.com" target="_blank" rel="noreferrer">Unsplash</a>.
              </Text>
            </div>
            <div className={styles.storyCopy}>
              <span className={styles.kicker}>Made for real campus work</span>
              <h2 id="story-title" className={styles.sectionTitle}>
                Less searching. More building together.
              </h2>
              <Text className={styles.sectionDescription}>
                Follow a project, join an event, ask for help, or find a mentor without
                losing the context that connects the work.
              </Text>
              <div className={styles.storyPoints}>
                {[
                  ['One verified profile', 'Your identity, roles, skills, and contributions travel with you.'],
                  ['Connected conversations', 'Forum solutions can strengthen ideas and recognise helpful contributors.'],
                  ['Visible momentum', 'Milestones, capacity, comments, and activity update where teams need them.']
                ].map(([title, description]) => (
                  <div className={styles.storyPoint} key={title}>
                    <span className={styles.pointIcon}>
                      <CheckCircle2 size={18} aria-hidden="true" />
                    </span>
                    <div className={styles.pointCopy}>
                      <Text weight="semibold">{title}</Text>
                      <Text className={styles.cardDescription}>{description}</Text>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </m.section>

          <section className={styles.section} id="how-it-works" aria-labelledby="steps-title">
            <div className={styles.sectionHeader}>
              <span className={styles.kicker}>Simple, protected access</span>
              <h2 id="steps-title" className={styles.sectionTitle}>
                Join the pilot in three clear steps.
              </h2>
            </div>
            <div className={styles.steps}>
              {[
                ['01', 'Sign in with Google', 'Use a verified Google account. CVS Garage requests only your basic profile and email.'],
                ['02', 'Wait for approval', 'A portal administrator reviews every new account before service workspaces open.'],
                ['03', 'Start contributing', 'Complete your profile, find a workspace, and move useful campus work forward.']
              ].map(([number, title, description], index) => (
                <m.article
                  className={styles.step}
                  key={number}
                  initial={enter}
                  whileInView={visible}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{
                    duration: reducedMotion ? 0 : 0.26,
                    delay: reducedMotion ? 0 : index * 0.06
                  }}
                >
                  <span className={styles.stepNumber}>{number}</span>
                  <Text as="h3" size={500} weight="semibold">{title}</Text>
                  <Text className={styles.cardDescription}>{description}</Text>
                </m.article>
              ))}
            </div>
          </section>

          <section className={mergeClasses(styles.section, styles.cta)} aria-labelledby="cta-title">
            <m.div
              className={styles.ctaCopy}
              initial={enter}
              whileInView={visible}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: reducedMotion ? 0 : 0.3 }}
            >
              <Badge appearance="tint" size="large">CVS Garage pilot</Badge>
              <h2 id="cta-title" className={styles.sectionTitle}>
                Your next campus project needs a place to begin.
              </h2>
              <Text className={styles.sectionDescription}>
                Sign in, get approved, and meet the people already turning questions
                into prototypes, events, and shared knowledge.
              </Text>
              <Button
                className={styles.primaryCta}
                appearance="primary"
                size="large"
                icon={<LogIn size={19} aria-hidden="true" />}
                onClick={onSignIn}
                disabled={signInLoading}
              >
                Continue with Google
              </Button>
            </m.div>
          </section>
        </m.div>
      </LazyMotion>
    </MotionConfig>
  );
}
