import { Avatar, Badge, Button, Card, Input, Label, Link, Text, makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link as RouteLink, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../../../packages/api-client/src';
import type { ManagedMemberRole, Member, MemberStats } from '../../../packages/contracts/src';
import { CardGrid, MetricCard, MetricGrid, ServicePage, StatePanel, StatusBadge, glassTokens } from '../../../packages/ui/src';
import { ProfileEditor } from './ProfileEditor';

const useStyles = makeStyles({
  searchForm: { display: 'flex', minWidth: 0, flex: '1 1 320px', maxWidth: '560px', alignItems: 'flex-end', gap: tokens.spacingHorizontalS, flexWrap: 'wrap' },
  searchField: { display: 'grid', gap: tokens.spacingVerticalXS, flex: '1 1 220px', minWidth: 0, maxWidth: '100%' },
  searchInput: { width: '100%', minWidth: 0 },
  sectionHeader: {
    display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
    gap: tokens.spacingHorizontalL, marginBottom: tokens.spacingVerticalXL, flexWrap: 'wrap', minWidth: 0
  },
  card: {
    display: 'flex', flexDirection: 'column', minWidth: 0, height: '100%',
    gap: tokens.spacingVerticalL, overflowWrap: 'anywhere', backgroundColor: glassTokens.surface,
    backdropFilter: glassTokens.blur, boxShadow: glassTokens.shadow,
    ...shorthands.border('1px', 'solid', glassTokens.border),
    borderRadius: tokens.borderRadiusLarge,
    ...shorthands.padding(tokens.spacingVerticalXL, tokens.spacingHorizontalXL)
  },
  memberHeader: { display: 'flex', minWidth: 0, alignItems: 'center', gap: tokens.spacingHorizontalM },
  memberIdentity: { minWidth: 0, flexGrow: 1 },
  memberName: { marginBlock: 0, overflowWrap: 'anywhere' },
  profileLink: { color: tokens.colorBrandForeground1, textDecorationLine: 'none', ':hover': { textDecorationLine: 'underline' } },
  secondaryText: { color: tokens.colorNeutralForeground2 },
  badges: { display: 'flex', minWidth: 0, alignItems: 'center', gap: tokens.spacingHorizontalS, flexWrap: 'wrap' },
  details: { display: 'grid', minWidth: 0, gap: tokens.spacingVerticalL, maxWidth: '72ch' },
  bioPreview: { display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden', color: tokens.colorNeutralForeground2 },
  tag: {
    minWidth: 0, maxWidth: '100%', height: 'auto', minHeight: '24px', whiteSpace: 'normal',
    overflowWrap: 'anywhere', lineHeight: tokens.lineHeightBase200,
    ...shorthands.padding(tokens.spacingVerticalXXS, tokens.spacingHorizontalS)
  },
  actions: { display: 'flex', minWidth: 0, alignItems: 'center', gap: tokens.spacingHorizontalM, flexWrap: 'wrap', marginTop: 'auto', paddingTop: tokens.spacingVerticalM },
  feedback: { display: 'grid', gap: tokens.spacingVerticalS },
  error: { color: tokens.colorPaletteRedForeground1 }
});

function isAdmin(member: Member) {
  return member.status === 'active' && (member.role === 'Admin' || member.roles.includes('Admin'));
}

function isAdminTarget(member: Member) {
  return member.role === 'Admin' || member.roles.includes('Admin');
}

export function MemberCentrePage() {
  const styles = useStyles();
  const { memberId } = useParams<{ memberId?: string }>();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const submittedQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(submittedQuery);
  const [members, setMembers] = useState<Member[]>([]);
  const [stats, setStats] = useState<MemberStats | null>(null);
  const [currentMember, setCurrentMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const requestVersion = useRef(0);
  const loadKey = memberId ? `member:${memberId}` : `list:${submittedQuery}`;
  const backPath = `/member-centre${location.search}`;
  const backLink = <RouteLink className={styles.profileLink} to={backPath}>Back to members</RouteLink>;

  const load = useCallback(async (searchQuery = '') => {
    const request = ++requestVersion.current;
    setLoading(true);
    setError(null);
    try {
      const [nextMembers, nextCurrentMember, nextStats] = await Promise.all([
        api.members.list(memberId ? '' : searchQuery),
        api.members.current(),
        memberId ? Promise.resolve(null) : api.members.stats()
      ]);
      if (request !== requestVersion.current) return;
      setMembers(nextMembers);
      setStats(nextStats);
      setCurrentMember(nextCurrentMember);
    } catch (requestError) {
      if (request === requestVersion.current) {
        setError(requestError instanceof Error ? requestError.message : 'Member profiles could not be loaded.');
      }
    } finally {
      if (request === requestVersion.current) {
        setLoadedKey(memberId ? `member:${memberId}` : `list:${searchQuery}`);
        setLoading(false);
      }
    }
  }, [memberId]);

  useEffect(() => {
    setActionError(null);
    setActionMessage(null);
    setEditingProfile(false);
    void load(submittedQuery);
    return () => { requestVersion.current += 1; };
  }, [load, submittedQuery]);

  useEffect(() => setQuery(submittedQuery), [submittedQuery]);
  const selectedMember = memberId ? members.find((member) => member.id === memberId) : undefined;
  useEffect(() => {
    document.title = selectedMember ? `${selectedMember.name} — CVS Garage` : 'Member Centre — CVS Garage';
  }, [selectedMember]);

  async function refreshStats() {
    try {
      setStats(await api.members.stats());
    } catch {
      setActionError('The profile changed, but the member totals could not be refreshed.');
    }
  }

  function replaceMember(updated: Member) {
    setMembers((current) => current.map((member) => member.id === updated.id ? updated : member));
  }

  async function changeStatus(member: Member) {
    const status = member.status === 'active' ? 'suspended' : 'active';
    setPendingAction(`${member.id}:status`);
    setActionError(null);
    setActionMessage(null);
    try {
      replaceMember(await api.members.updateStatus(member.id, status));
      setActionMessage(`${member.name} is now ${status}.`);
      await refreshStats();
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError.message : `${member.name}'s status could not be changed.`);
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
      replaceMember(await api.members.setMentor(member.id, enabled));
      setActionMessage(enabled ? `${member.name} now has mentor access.` : `${member.name} no longer has mentor access.`);
      await refreshStats();
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError.message : `${member.name}'s mentor access could not be changed.`);
    } finally {
      setPendingAction(null);
    }
  }

  async function changeRole(member: Member, role: ManagedMemberRole) {
    const enabled = !member.roles.includes(role);
    setPendingAction(`${member.id}:${role}`);
    setActionError(null);
    setActionMessage(null);
    try {
      replaceMember(await api.members.setRole(member.id, role, enabled));
      setActionMessage(
        enabled
          ? `${member.name} now has ${role.toLocaleLowerCase()} access.`
          : `${member.name} no longer has ${role.toLocaleLowerCase()} access.`
      );
    } catch (requestError) {
      setActionError(
        requestError instanceof Error
          ? requestError.message
          : `${member.name}'s role could not be changed.`
      );
    } finally {
      setPendingAction(null);
    }
  }

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = query.trim();
    if (normalized === submittedQuery) {
      void load(normalized);
      return;
    }
    const next = new URLSearchParams(searchParams);
    if (normalized) next.set('q', normalized);
    else next.delete('q');
    setSearchParams(next, { replace: true });
  }

  if ((loading || loadedKey !== loadKey) && (memberId || !stats)) {
    return memberId ? (
      <ServicePage area="member-centre" title="Member profile" description="Loading profile details." actions={backLink}>
        <StatePanel state="loading" message="Loading member profile" />
      </ServicePage>
    ) : <StatePanel state="loading" message="Loading member profiles" />;
  }

  if (error || !currentMember || (!memberId && !stats)) {
    const failure = <StatePanel state="error" message={error || 'Member Centre is not available right now.'} onRetry={() => void load(submittedQuery)} />;
    return memberId ? <ServicePage area="member-centre" title="Profile unavailable" description="This member profile could not be loaded." actions={backLink}>{failure}</ServicePage> : failure;
  }

  if (memberId && !selectedMember) {
    return <ServicePage area="member-centre" title="Member not found" description="This member does not exist or is no longer available." actions={backLink} />;
  }

  if (selectedMember) {
    const protectedTarget =
      selectedMember.id === currentMember.id ||
      isAdminTarget(selectedMember) ||
      selectedMember.isDemo;
    const statusAction = selectedMember.status === 'suspended' ? 'Restore' : selectedMember.status === 'pending' ? 'Activate' : 'Suspend';
    return (
      <ServicePage area="member-centre" title={selectedMember.name} description={selectedMember.department} actions={backLink}>
        <div className={styles.feedback} aria-live="polite">
          {actionMessage ? <Text role="status">{actionMessage}</Text> : null}
          {actionError ? <Text role="alert" className={styles.error}>{actionError}</Text> : null}
        </div>
        <Card className={styles.card} role="region" aria-label={`${selectedMember.name} profile details`}>
          <div className={styles.memberHeader}>
            <Avatar name={selectedMember.name} image={selectedMember.avatarUrl ? { src: selectedMember.avatarUrl } : undefined} size={48} />
            <div className={styles.badges}>
              <StatusBadge status={selectedMember.status} />
              {selectedMember.roles.map((role) => <Badge key={role} className={styles.tag} appearance="outline">{role}</Badge>)}
            </div>
          </div>
          <div className={styles.details}>
            <Text>{selectedMember.bio}</Text>
            {selectedMember.batch ? <Text>{selectedMember.batch}</Text> : null}
            <Link href={`mailto:${selectedMember.email}`}>{selectedMember.email}</Link>
            <Text>Reputation {selectedMember.reputationScore.toLocaleString()}</Text>
            {selectedMember.skills.length ? (
              <section aria-label={`${selectedMember.name}'s skills`}>
                <Text as="h2" size={400}>Skills</Text>
                <div className={styles.badges}>{selectedMember.skills.map((skill) => <Badge key={skill} className={styles.tag} appearance="tint">{skill}</Badge>)}</div>
              </section>
            ) : null}
            {selectedMember.mentorExpertise.length ? <Text>Mentor expertise: {selectedMember.mentorExpertise.join(', ')}</Text> : null}
          </div>
          {selectedMember.id === currentMember.id && !selectedMember.isDemo ? (
            editingProfile ? (
              <ProfileEditor
                member={selectedMember}
                onSaved={(updated) => {
                  replaceMember(updated);
                  setCurrentMember(updated);
                  setEditingProfile(false);
                  setActionMessage('Your profile has been updated.');
                }}
                onCancel={() => setEditingProfile(false)}
              />
            ) : (
              <div className={styles.actions}>
                <Button onClick={() => setEditingProfile(true)}>Edit profile</Button>
              </div>
            )
          ) : null}
          {isAdmin(currentMember) && !protectedTarget ? (
            <div className={styles.actions} aria-label={`Actions for ${selectedMember.name}`}>
              <Button disabled={pendingAction !== null} aria-label={`${statusAction} ${selectedMember.name}`} onClick={() => void changeStatus(selectedMember)}>{statusAction}</Button>
              <Button disabled={pendingAction !== null} aria-label={`${selectedMember.isMentor ? 'Revoke mentor role from' : 'Grant mentor role to'} ${selectedMember.name}`} onClick={() => void changeMentor(selectedMember)}>
                {selectedMember.isMentor ? 'Revoke mentor' : 'Make mentor'}
              </Button>
              <Button
                disabled={pendingAction !== null}
                aria-label={`${selectedMember.roles.includes('Community Moderator') ? 'Revoke moderator role from' : 'Grant moderator role to'} ${selectedMember.name}`}
                onClick={() => void changeRole(selectedMember, 'Community Moderator')}
              >
                {selectedMember.roles.includes('Community Moderator') ? 'Revoke moderator' : 'Make moderator'}
              </Button>
            </div>
          ) : null}
        </Card>
      </ServicePage>
    );
  }

  return (
    <ServicePage area="member-centre" title="Find your people" description="Discover peers and mentors. Open a profile to view their experience, contact information, and skills.">
      {stats ? <MetricGrid>
        <MetricCard label="Total members" value={stats.totalMembers} />
        <MetricCard label="Active members" value={stats.activeMembers} />
        <MetricCard label="Mentors" value={stats.mentors} />
      </MetricGrid> : null}
      <section aria-labelledby="member-directory-heading">
        <div className={styles.sectionHeader}>
          <div>
            <Text as="h2" id="member-directory-heading" size={500} weight="semibold">Member directory</Text>
            <Text block className={styles.secondaryText}>{members.length} {members.length === 1 ? 'profile' : 'profiles'} shown</Text>
            {stats && isAdmin(currentMember) ? <Text block size={200} className={styles.secondaryText}>{stats.pendingMembers} pending · {stats.suspendedMembers} suspended</Text> : null}
          </div>
          <form role="search" className={styles.searchForm} onSubmit={search}>
            <div className={styles.searchField}>
              <Label htmlFor="member-search">Search members</Label>
              <Input id="member-search" type="search" value={query} onChange={(_, data) => setQuery(data.value)} placeholder="Name, department, skill, or role" className={styles.searchInput} />
            </div>
            <Button type="submit" appearance="primary" disabled={loading}>Search</Button>
          </form>
        </div>
        {loading ? <StatePanel state="loading" message="Searching member profiles" /> : members.length === 0 ? (
          <StatePanel state="empty" title={submittedQuery ? 'No members match your search' : 'No member profiles are available'} message={submittedQuery ? 'Try a name, department, skill, or role with different wording.' : 'Member profiles will appear here when they become available.'} />
        ) : (
          <CardGrid>
            {members.map((member) => {
              const href = `/member-centre/members/${encodeURIComponent(member.id)}${location.search}`;
              return (
                <Card key={member.id} className={styles.card} role="article" aria-label={`${member.name} member profile`}>
                  <div className={styles.memberHeader}>
                    <Avatar name={member.name} image={member.avatarUrl ? { src: member.avatarUrl } : undefined} size={40} />
                    <div className={styles.memberIdentity}>
                      <Text as="h3" block size={400} className={styles.memberName}><RouteLink className={styles.profileLink} to={href}>{member.name}</RouteLink></Text>
                      <Text block size={200} className={styles.secondaryText}>{member.department}</Text>
                    </div>
                  </div>
                  <div className={styles.badges}><StatusBadge status={member.status} />{member.roles.map((role) => <Badge key={role} className={styles.tag} appearance="outline">{role}</Badge>)}</div>
                  <Text className={styles.bioPreview}>{member.bio}</Text>
                  <div className={styles.badges}>
                    {member.skills.slice(0, 3).map((skill) => <Badge key={skill} className={styles.tag} appearance="tint">{skill}</Badge>)}
                    {member.skills.length > 3 ? <Text size={200}>+{member.skills.length - 3} skills</Text> : null}
                  </div>
                  <div className={styles.actions}><RouteLink className={styles.profileLink} to={href}>View profile</RouteLink></div>
                </Card>
              );
            })}
          </CardGrid>
        )}
      </section>
    </ServicePage>
  );
}
