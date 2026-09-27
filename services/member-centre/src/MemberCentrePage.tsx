import {
  Avatar,
  Badge,
  Button,
  Card,
  Input,
  Label,
  Link,
  Text,
  makeStyles,
  shorthands,
  tokens
} from '@fluentui/react-components';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '../../../packages/api-client/src';
import type { Member, MemberStats } from '../../../packages/contracts/src';
import {
  CardGrid,
  MetricCard,
  MetricGrid,
  ServicePage,
  StatePanel,
  StatusBadge
} from '../../../packages/ui/src';

const useStyles = makeStyles({
  searchForm: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: tokens.spacingHorizontalS,
    flexWrap: 'wrap'
  },
  searchField: {
    display: 'grid',
    gap: tokens.spacingVerticalXS,
    flexGrow: 1,
    minWidth: 'min(100%, 260px)'
  },
  searchInput: {
    width: '100%'
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    marginBottom: tokens.spacingVerticalM,
    flexWrap: 'wrap'
  },
  card: {
    height: '100%',
    ...shorthands.padding(tokens.spacingVerticalL)
  },
  memberHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM
  },
  memberIdentity: {
    minWidth: 0
  },
  secondaryText: {
    color: tokens.colorNeutralForeground2
  },
  badges: {
    display: 'flex',
    gap: tokens.spacingHorizontalXS,
    flexWrap: 'wrap'
  },
  details: {
    display: 'grid',
    gap: tokens.spacingVerticalS
  },
  skills: {
    display: 'flex',
    gap: tokens.spacingHorizontalXS,
    flexWrap: 'wrap'
  },
  actions: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    flexWrap: 'wrap',
    marginTop: 'auto',
    paddingTop: tokens.spacingVerticalS,
    ...shorthands.borderTop('1px', 'solid', tokens.colorNeutralStroke2)
  },
  feedback: {
    minHeight: tokens.spacingVerticalL
  },
  error: {
    color: tokens.colorPaletteRedForeground1
  }
});

function isAdmin(member: Member | null) {
  return Boolean(
    member &&
      member.status === 'active' &&
      (member.role === 'Admin' || member.roles.includes('Admin'))
  );
}

function isAdminTarget(member: Member) {
  return member.role === 'Admin' || member.roles.includes('Admin');
}

export function MemberCentrePage() {
  const styles = useStyles();
  const [members, setMembers] = useState<Member[]>([]);
  const [stats, setStats] = useState<MemberStats | null>(null);
  const [currentMember, setCurrentMember] = useState<Member | null>(null);
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const load = useCallback(async (searchQuery = '') => {
    setLoading(true);
    try {
      const [nextMembers, nextStats, nextCurrentMember] = await Promise.all([
        api.members.list(searchQuery),
        api.members.stats(),
        api.members.current()
      ]);
      setMembers(nextMembers);
      setStats(nextStats);
      setCurrentMember(nextCurrentMember);
      setError(null);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Member profiles could not be loaded.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function refreshStats() {
    try {
      setStats(await api.members.stats());
    } catch {
      setActionError('The profile changed, but the member totals could not be refreshed.');
    }
  }

  function replaceMember(updated: Member) {
    setMembers((current) =>
      current.map((member) => (member.id === updated.id ? updated : member))
    );
  }

  async function changeStatus(member: Member) {
    const status = member.status === 'active' ? 'suspended' : 'active';
    setPendingAction(`${member.id}:status`);
    setActionError(null);
    setActionMessage(null);
    try {
      const updated = await api.members.updateStatus(member.id, status);
      replaceMember(updated);
      setActionMessage(`${member.name} is now ${status}.`);
      await refreshStats();
    } catch (requestError) {
      setActionError(
        requestError instanceof Error
          ? requestError.message
          : `${member.name}'s status could not be changed.`
      );
    } finally {
      setPendingAction(null);
    }
  }

  async function changeMentor(member: Member) {
    const enabled = !member.isMentor;
    setPendingAction(`${member.id}:mentor`);
    setActionError(null);
    setActionMessage(null);
    try {
      const updated = await api.members.setMentor(member.id, enabled);
      replaceMember(updated);
      setActionMessage(
        enabled
          ? `${member.name} now has mentor access.`
          : `${member.name} no longer has mentor access.`
      );
      await refreshStats();
    } catch (requestError) {
      setActionError(
        requestError instanceof Error
          ? requestError.message
          : `${member.name}'s mentor access could not be changed.`
      );
    } finally {
      setPendingAction(null);
    }
  }

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedQuery = query.trim();
    setSubmittedQuery(normalizedQuery);
    void load(normalizedQuery);
  }

  if (loading && !stats) {
    return <StatePanel state="loading" message="Loading member profiles" />;
  }

  if (error || !stats || !currentMember) {
    return (
      <StatePanel
        state="error"
        message={error || 'Member Centre is not available right now.'}
        onRetry={() => void load(submittedQuery)}
      />
    );
  }

  const canAdminister = isAdmin(currentMember);

  return (
    <ServicePage
      area="member-centre"
      title="Find your people"
      description="Discover peers and mentors across campus, explore their skills, and connect with the people who can help move your work forward."
    >
      <MetricGrid>
        <MetricCard label="Total members" value={stats.totalMembers} />
        <MetricCard label="Active members" value={stats.activeMembers} />
        <MetricCard label="Mentors" value={stats.mentors} />
        <MetricCard label="Pending" value={stats.pendingMembers} />
        <MetricCard label="Suspended" value={stats.suspendedMembers} />
      </MetricGrid>

      <section aria-labelledby="member-directory-heading">
        <div className={styles.sectionHeader}>
          <div>
            <Text as="h2" id="member-directory-heading" size={600} weight="semibold">
              Member directory
            </Text>
            <Text block className={styles.secondaryText}>
              {members.length} {members.length === 1 ? 'profile' : 'profiles'} shown
            </Text>
          </div>
          <form role="search" className={styles.searchForm} onSubmit={search}>
            <div className={styles.searchField}>
              <Label htmlFor="member-search">Search members</Label>
              <Input
                id="member-search"
                type="search"
                value={query}
                onChange={(_event, data) => setQuery(data.value)}
                placeholder="Name, department, skill, or role"
                className={styles.searchInput}
              />
            </div>
            <Button type="submit" appearance="primary" disabled={loading}>
              Search
            </Button>
          </form>
        </div>

        <div className={styles.feedback} aria-live="polite">
          {actionMessage ? <Text>{actionMessage}</Text> : null}
          {actionError ? (
            <Text role="alert" className={styles.error}>
              {actionError}
            </Text>
          ) : null}
        </div>

        {loading ? (
          <StatePanel state="loading" message="Searching member profiles" />
        ) : members.length === 0 ? (
          <StatePanel
            state="empty"
            title={
              submittedQuery
                ? 'No members match your search'
                : 'No member profiles are available'
            }
            message={
              submittedQuery
                ? 'Try a name, department, skill, or role with different wording.'
                : 'Member profiles will appear here when they become available.'
            }
          />
        ) : (
          <CardGrid>
            {members.map((member) => {
              const protectedTarget =
                member.id === currentMember.id || isAdminTarget(member);
              const statusAction =
                member.status === 'suspended'
                  ? 'Restore'
                  : member.status === 'pending'
                    ? 'Activate'
                    : 'Suspend';
              const mentorAction = member.isMentor ? 'Revoke mentor role from' : 'Grant mentor role to';

              return (
                <Card
                  key={member.id}
                  className={styles.card}
                  role="article"
                  aria-label={`${member.name} member profile`}
                >
                  <div className={styles.memberHeader}>
                    <Avatar
                      name={member.name}
                      image={member.avatarUrl ? { src: member.avatarUrl } : undefined}
                      size={48}
                    />
                    <div className={styles.memberIdentity}>
                      <Text block size={500} weight="semibold">
                        {member.name}
                      </Text>
                      <Text block className={styles.secondaryText}>
                        {member.department}
                      </Text>
                    </div>
                  </div>

                  <div className={styles.badges}>
                    <StatusBadge status={member.status} />
                    {member.roles.map((role) => (
                      <Badge key={role} appearance="outline">
                        {role}
                      </Badge>
                    ))}
                  </div>

                  <div className={styles.details}>
                    <Text>{member.bio}</Text>
                    {member.batch ? (
                      <Text size={200} className={styles.secondaryText}>
                        {member.batch}
                      </Text>
                    ) : null}
                    <Link href={`mailto:${member.email}`}>{member.email}</Link>
                    <Text size={200}>
                      Reputation {member.reputationScore.toLocaleString()}
                    </Text>
                    {member.skills.length > 0 ? (
                      <div className={styles.skills} aria-label={`${member.name}'s skills`}>
                        {member.skills.map((skill) => (
                          <Badge key={skill} appearance="tint">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                    {member.mentorExpertise.length > 0 ? (
                      <Text size={200} className={styles.secondaryText}>
                        Mentor expertise: {member.mentorExpertise.join(', ')}
                      </Text>
                    ) : null}
                  </div>

                  {canAdminister && !protectedTarget ? (
                    <div className={styles.actions} aria-label={`Actions for ${member.name}`}>
                      <Button
                        appearance={member.status === 'suspended' ? 'primary' : 'secondary'}
                        disabled={pendingAction !== null}
                        aria-label={`${statusAction} ${member.name}`}
                        onClick={() => void changeStatus(member)}
                      >
                        {statusAction}
                      </Button>
                      <Button
                        appearance="secondary"
                        disabled={pendingAction !== null}
                        aria-label={`${mentorAction} ${member.name}`}
                        onClick={() => void changeMentor(member)}
                      >
                        {member.isMentor ? 'Revoke mentor' : 'Make mentor'}
                      </Button>
                    </div>
                  ) : null}
                </Card>
              );
            })}
          </CardGrid>
        )}
      </section>
    </ServicePage>
  );
}
