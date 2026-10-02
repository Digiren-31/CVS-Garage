import {
  Avatar,
  Badge,
  Card,
  Text,
  Title3,
  makeStyles,
  shorthands,
  tokens
} from '@fluentui/react-components';
import { useCallback, useEffect, useState } from 'react';
import { api } from '../../../packages/api-client/src';
import type {
  Achievement,
  LeaderboardEntry,
  LeaderboardResponse
} from '../../../packages/contracts/src';
import {
  MetricCard,
  MetricGrid,
  ServicePage,
  StatePanel,
  glassTokens
} from '../../../packages/ui/src';
import { CustomLeaderboard } from './CustomLeaderboard';

const useStyles = makeStyles({
  section: {
    display: 'grid',
    minWidth: 0,
    overflowWrap: 'anywhere',
    gap: tokens.spacingVerticalL
  },
  sectionHeading: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    flexWrap: 'wrap',
    minWidth: 0,
    '& > *': {
      minWidth: 0
    }
  },
  secondaryText: {
    color: tokens.colorNeutralForeground2
  },
  metadata: {
    display: 'flex',
    minWidth: 0,
    overflowWrap: 'anywhere',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    flexWrap: 'wrap'
  },
  achievementList: {
    display: 'grid',
    minWidth: 0,
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
    gap: tokens.spacingHorizontalM,
    listStyleType: 'none',
    marginTop: 0,
    marginBottom: 0,
    paddingLeft: 0,
    '& > li': {
      minWidth: 0
    }
  },
  achievementCard: {
    minWidth: 0,
    height: '100%',
    backgroundColor: glassTokens.surface,
    backdropFilter: glassTokens.blur,
    WebkitBackdropFilter: glassTokens.blur,
    boxShadow: glassTokens.shadow,
    ...shorthands.border('1px', 'solid', glassTokens.border),
    ...shorthands.borderRadius(tokens.borderRadiusLarge),
    ...shorthands.padding(tokens.spacingVerticalL)
  },
  achievementIdentity: {
    display: 'flex',
    minWidth: 0,
    alignItems: 'flex-start',
    gap: tokens.spacingHorizontalS
  },
  identityCopy: {
    minWidth: 0
  },
  cardTitle: {
    marginBlock: 0,
    overflowWrap: 'anywhere'
  },
  achievementContent: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    flexGrow: 1,
    gap: tokens.spacingVerticalM
  },
  achievementFooter: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalS,
    minWidth: 0,
    marginTop: 'auto',
    paddingTop: tokens.spacingVerticalM,
    ...shorthands.borderTop('1px', 'solid', tokens.colorNeutralStroke2)
  },
  context: {
    display: 'flex',
    minWidth: 0,
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    flexWrap: 'wrap'
  },
  podiumList: {
    display: 'grid',
    minWidth: 0,
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
    gap: tokens.spacingHorizontalM,
    listStyleType: 'none',
    marginTop: 0,
    marginBottom: 0,
    paddingLeft: 0,
    '& > li': {
      minWidth: 0
    }
  },
  podiumCard: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    gap: tokens.spacingVerticalS,
    alignItems: 'center',
    textAlign: 'center',
    height: '100%',
    backgroundColor: glassTokens.surface,
    backdropFilter: glassTokens.blur,
    WebkitBackdropFilter: glassTokens.blur,
    boxShadow: glassTokens.shadow,
    ...shorthands.padding(tokens.spacingVerticalL),
    ...shorthands.border('1px', 'solid', glassTokens.border),
    ...shorthands.borderRadius(tokens.borderRadiusLarge)
  },
  podiumScore: {
    display: 'grid',
    minWidth: 0,
    gap: tokens.spacingVerticalXXS,
    marginTop: 'auto',
    paddingTop: tokens.spacingVerticalS
  },
  rankings: {
    minWidth: 0,
    maxWidth: '100%',
    // Keep the service layout shrinkable while the table uses its own scroller.
    '& > section, & > section > form > div': {
      minWidth: 0,
      gridTemplateColumns: 'minmax(0, 1fr)'
    },
    '& > section > form': {
      minWidth: 0
    }
  },
  tag: {
    minWidth: 0,
    maxWidth: '100%',
    height: 'auto',
    minHeight: tokens.lineHeightBase400,
    whiteSpace: 'normal',
    overflowWrap: 'anywhere',
    lineHeight: tokens.lineHeightBase200,
    ...shorthands.padding(tokens.spacingVerticalXXS, tokens.spacingHorizontalS)
  },
  empty: {
    minWidth: 0,
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRadius(tokens.borderRadiusLarge),
    ...shorthands.padding(tokens.spacingVerticalL),
    backgroundColor: tokens.colorNeutralBackground1
  }
});

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

export function LeaderboardsPage() {
  const styles = useStyles();
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setLeaderboard(await api.leaderboards.get());
    } catch (requestError) {
      setLeaderboard(null);
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Leaderboard data could not be loaded.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !leaderboard) {
    return <StatePanel state="loading" message="Loading leaderboard" />;
  }

  if (error || !leaderboard) {
    return (
      <StatePanel
        state="error"
        message={error || 'Leaderboards are not available right now.'}
        onRetry={() => void load()}
      />
    );
  }

  const topContributors = leaderboard.entries.slice(0, 3);
  const topScore = leaderboard.entries[0]?.score ?? 0;

  return (
    <ServicePage
      area="leaderboards"
      title="Campus contributors"
      description="Celebrate helpful work across the college and explore rankings calculated by the central scoring service."
    >
      <MetricGrid>
        <MetricCard label="Ranked contributors" value={leaderboard.entries.length} />
        <MetricCard label="Leading score" value={topScore} detail="Server calculated" />
        <MetricCard
          label="Recent achievements"
          value={leaderboard.achievements.length}
        />
      </MetricGrid>

      <div className={styles.metadata}>
        <Badge className={styles.tag} appearance="outline">
          Scoring policy: {leaderboard.scoringPolicyVersion}
        </Badge>
        <Text className={styles.secondaryText}>
          Updated{' '}
          <time dateTime={leaderboard.generatedAt}>
            {formatDateTime(leaderboard.generatedAt)}
          </time>
        </Text>
      </div>

      <AchievementsSection achievements={leaderboard.achievements} />
      <PodiumSection entries={topContributors} />

      {leaderboard.entries.length === 0 ? (
        <StatePanel
          state="empty"
          title="No rankings yet"
          message="Contributions will appear after the scoring service records eligible activity."
        />
      ) : (
        <div className={styles.rankings}>
          <CustomLeaderboard
            entries={leaderboard.entries}
            filterOptions={leaderboard.filters}
          />
        </div>
      )}
    </ServicePage>
  );
}

function AchievementsSection({
  achievements
}: {
  achievements: readonly Achievement[];
}) {
  const styles = useStyles();
  return (
    <section aria-labelledby="recent-achievements-heading" className={styles.section}>
      <div className={styles.sectionHeading}>
        <div>
          <Title3 as="h2" id="recent-achievements-heading">
            Recent achievements
          </Title3>
          <Text block className={styles.secondaryText}>
            Public recognition from projects, events, and community contributions.
          </Text>
        </div>
      </div>

      {achievements.length === 0 ? (
        <div className={styles.empty} role="status">
          <Text weight="semibold">No recent achievements</Text>
          <Text block className={styles.secondaryText}>
            New recognition will appear here when it is published.
          </Text>
        </div>
      ) : (
        <ul className={styles.achievementList} aria-label="Recent achievements">
          {achievements.map((achievement) => (
            <li key={achievement.id}>
              <Card className={styles.achievementCard}>
                <div className={styles.achievementContent}>
                  <div className={styles.achievementIdentity}>
                    <Avatar name={achievement.memberName} size={36} />
                    <div className={styles.identityCopy}>
                      <Text as="h3" block size={400} weight="semibold" className={styles.cardTitle}>
                        {achievement.title}
                      </Text>
                      <Text block size={200} className={styles.secondaryText}>
                        {achievement.memberName}
                      </Text>
                    </div>
                  </div>
                  <Text>{achievement.description}</Text>
                  <div className={styles.achievementFooter}>
                    <Text size={200} className={styles.secondaryText}>
                      <time dateTime={achievement.achievedAt}>
                        {formatDateTime(achievement.achievedAt)}
                      </time>
                    </Text>
                    <div className={styles.context}>
                      {achievement.eventId ? (
                        <Badge className={styles.tag} appearance="outline">Event {achievement.eventId}</Badge>
                      ) : null}
                      {achievement.projectId ? (
                        <Badge className={styles.tag} appearance="outline">Project {achievement.projectId}</Badge>
                      ) : null}
                    </div>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function PodiumSection({ entries }: { entries: readonly LeaderboardEntry[] }) {
  const styles = useStyles();
  return (
    <section aria-labelledby="top-contributors-heading" className={styles.section}>
      <div className={styles.sectionHeading}>
        <div>
          <Title3 as="h2" id="top-contributors-heading">
            Top contributors
          </Title3>
          <Text block className={styles.secondaryText}>
            Global ranks are preserved when you filter the detailed table.
          </Text>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className={styles.empty} role="status">
          <Text>No podium positions have been published.</Text>
        </div>
      ) : (
        <ol className={styles.podiumList} aria-label="Top contributors">
          {entries.map((entry) => (
            <li key={entry.memberId}>
              <Card className={styles.podiumCard}>
                <Badge className={styles.tag} appearance="tint" color="brand">
                  Rank {entry.rank}
                </Badge>
                <Avatar
                  name={entry.memberName}
                  image={entry.avatarUrl ? { src: entry.avatarUrl } : undefined}
                  size={64}
                />
                <Text as="h3" size={400} weight="semibold" className={styles.cardTitle}>
                  {entry.memberName}
                </Text>
                <Text size={200} className={styles.secondaryText}>{entry.department}</Text>
                <div className={styles.podiumScore}>
                  <Text size={600} weight="semibold">{entry.score} points</Text>
                  <Text size={200} className={styles.secondaryText}>{entry.starRating} / 5 stars</Text>
                </div>
              </Card>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
