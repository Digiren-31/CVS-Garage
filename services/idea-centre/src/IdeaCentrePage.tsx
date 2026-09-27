import {
  Button,
  Card,
  Checkbox,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Input,
  Select,
  Text,
  Textarea,
  makeStyles,
  shorthands,
  tokens
} from '@fluentui/react-components';
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Lightbulb,
  MessageSquare,
  Plus,
  Users
} from 'lucide-react';
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState
} from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../../packages/api-client/src';
import type { CreateIdeaInput, Idea } from '../../../packages/contracts/src';
import {
  CardGrid,
  MetricCard,
  MetricGrid,
  ServicePage,
  StatePanel,
  StatusBadge
} from '../../../packages/ui/src';

const useStyles = makeStyles({
  toolbar: {
    display: 'grid',
    gridTemplateColumns: 'minmax(220px, 2fr) repeat(3, minmax(140px, 1fr)) auto',
    gap: tokens.spacingHorizontalM,
    alignItems: 'end',
    '@media (max-width: 900px)': {
      gridTemplateColumns: '1fr 1fr'
    },
    '@media (max-width: 560px)': {
      gridTemplateColumns: '1fr'
    }
  },
  searchActions: {
    display: 'flex',
    gap: tokens.spacingHorizontalS
  },
  cardBody: {
    display: 'grid',
    gap: tokens.spacingVerticalM,
    ...shorthands.padding(0, tokens.spacingHorizontalM, tokens.spacingVerticalM)
  },
  ideaCard: {
    position: 'relative',
    cursor: 'pointer',
    ...shorthands.padding(tokens.spacingVerticalM, 0, 0),
    ':focus-visible': {
      outlineStyle: 'solid',
      outlineWidth: '2px',
      outlineColor: tokens.colorStrokeFocus2,
      outlineOffset: '2px'
    }
  },
  ideaCardHeader: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) max-content',
    gap: tokens.spacingHorizontalM,
    alignItems: 'start',
    ...shorthands.padding(0, tokens.spacingHorizontalM)
  },
  ideaHeading: {
    minWidth: 0,
    display: 'grid',
    gap: tokens.spacingVerticalXXS
  },
  ideaTitleButton: {
    appearance: 'none',
    width: '100%',
    color: tokens.colorNeutralForeground1,
    backgroundColor: 'transparent',
    textAlign: 'left',
    fontSize: tokens.fontSizeBase500,
    lineHeight: tokens.lineHeightBase500,
    fontWeight: tokens.fontWeightSemibold,
    ...shorthands.border('0'),
    ...shorthands.padding(0),
    cursor: 'pointer',
    ':hover': {
      color: tokens.colorBrandForeground1
    }
  },
  statusSlot: {
    minWidth: 'max-content',
    justifySelf: 'end',
    whiteSpace: 'nowrap'
  },
  commentSummary: {
    justifySelf: 'start'
  },
  detailActions: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM
  },
  detailCard: {
    display: 'grid',
    gap: tokens.spacingVerticalL,
    ...shorthands.padding(tokens.spacingVerticalXXL)
  },
  detailDescription: {
    whiteSpace: 'pre-wrap',
    lineHeight: tokens.lineHeightBase400
  },
  metadata: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalS,
    alignItems: 'center'
  },
  muted: {
    color: tokens.colorNeutralForeground2
  },
  tags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalXS
  },
  tag: {
    ...shorthands.padding(tokens.spacingVerticalXXS, tokens.spacingHorizontalS),
    ...shorthands.borderRadius(tokens.borderRadiusCircular),
    backgroundColor: tokens.colorNeutralBackground3
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalS,
    alignItems: 'center'
  },
  comments: {
    display: 'grid',
    gap: tokens.spacingVerticalS,
    ...shorthands.padding(tokens.spacingVerticalS, 0, 0),
    ...shorthands.borderTop('1px', 'solid', tokens.colorNeutralStroke2)
  },
  commentList: {
    display: 'grid',
    gap: tokens.spacingVerticalS,
    listStyleType: 'none',
    ...shorthands.margin(0),
    ...shorthands.padding(0)
  },
  comment: {
    ...shorthands.padding(tokens.spacingVerticalS),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    backgroundColor: tokens.colorNeutralBackground2
  },
  commentForm: {
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    gap: tokens.spacingHorizontalS,
    alignItems: 'end',
    '@media (max-width: 560px)': {
      gridTemplateColumns: '1fr'
    }
  },
  form: {
    display: 'grid',
    gap: tokens.spacingVerticalM
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: tokens.spacingHorizontalM,
    '@media (max-width: 560px)': {
      gridTemplateColumns: '1fr'
    }
  },
  announcement: {
    ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalM),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    backgroundColor: tokens.colorNeutralBackground2
  },
  error: {
    color: tokens.colorPaletteRedForeground1
  }
});

const emptyForm: CreateIdeaInput = {
  title: '',
  tagline: '',
  description: '',
  track: '',
  difficulty: 'Medium',
  targetTeamSize: 4,
  techStack: [],
  seekingMentor: true
};

function replaceIdea(ideas: Idea[], updated: Idea) {
  return ideas.map((idea) => (idea.id === updated.id ? updated : idea));
}

export function IdeaCentrePage() {
  const styles = useStyles();
  const navigate = useNavigate();
  const { ideaId } = useParams<{ ideaId?: string }>();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [search, setSearch] = useState('');
  const [track, setTrack] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateIdeaInput>(emptyForm);
  const [techStackText, setTechStackText] = useState('');
  const [joinIdea, setJoinIdea] = useState<Idea | null>(null);
  const [joinMessage, setJoinMessage] = useState('');
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  const loadIdeas = useCallback(async (query = '') => {
    setLoading(true);
    try {
      setIdeas(await api.ideas.list(query));
      setLoadError(null);
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : 'Ideas could not be loaded.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadIdeas();
  }, [loadIdeas]);

  const tracks = useMemo(
    () => [...new Set(ideas.map((idea) => idea.track))].sort(),
    [ideas]
  );
  const visibleIdeas = useMemo(
    () =>
      ideas.filter(
        (idea) =>
          (!track || idea.track === track) &&
          (!difficulty || idea.difficulty === difficulty) &&
          (!status || idea.status === status)
      ),
    [difficulty, ideas, status, track]
  );
  const selectedIdea = useMemo(
    () => ideas.find((idea) => idea.id === ideaId) || null,
    [ideaId, ideas]
  );
  const currentUserId = api.getUserId();

  useEffect(() => {
    document.title = selectedIdea
      ? `${selectedIdea.title} — CVS Garage`
      : 'Idea Centre — CVS Garage';
  }, [selectedIdea]);

  const runAction = useCallback(
    async (key: string, action: () => Promise<void>) => {
      setBusyAction(key);
      setActionError(null);
      setAnnouncement(null);
      try {
        await action();
      } catch (error) {
        setActionError(
          error instanceof Error ? error.message : 'The requested action could not be completed.'
        );
      } finally {
        setBusyAction(null);
      }
    },
    []
  );

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    void loadIdeas(search.trim());
  };

  const submitIdea = (event: FormEvent) => {
    event.preventDefault();
    const techStack = techStackText
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    void runAction('create', async () => {
      const created = await api.ideas.create({ ...createForm, techStack });
      setIdeas((current) => [created, ...current]);
      setCreateForm(emptyForm);
      setTechStackText('');
      setCreateOpen(false);
      setAnnouncement(`${created.title} was submitted to the Idea Centre.`);
    });
  };

  const toggleSave = (idea: Idea) => {
    void runAction(`${idea.id}:save`, async () => {
      const result = await api.ideas.toggleSave(idea.id);
      setIdeas((current) =>
        current.map((candidate) =>
          candidate.id === idea.id
            ? { ...candidate, savedByCurrentUser: result.saved }
            : candidate
        )
      );
      setAnnouncement(
        result.saved
          ? `${idea.title} was added to your saved ideas.`
          : `${idea.title} was removed from your saved ideas.`
      );
    });
  };

  const submitJoinRequest = (event: FormEvent) => {
    event.preventDefault();
    if (!joinIdea) {
      return;
    }
    const idea = joinIdea;
    void runAction(`${idea.id}:join`, async () => {
      const updated = await api.ideas.requestJoin(idea.id, joinMessage.trim());
      setIdeas((current) => replaceIdea(current, updated));
      setJoinIdea(null);
      setJoinMessage('');
      setAnnouncement(`Your request to join ${idea.title} was sent.`);
    });
  };

  const submitComment = (event: FormEvent, idea: Idea) => {
    event.preventDefault();
    const content = commentDrafts[idea.id]?.trim() || '';
    if (!content) {
      return;
    }
    void runAction(`${idea.id}:comment`, async () => {
      const updated = await api.ideas.addComment(idea.id, content);
      setIdeas((current) => replaceIdea(current, updated));
      setCommentDrafts((current) => ({ ...current, [idea.id]: '' }));
      setAnnouncement(`Your comment was added to ${idea.title}.`);
    });
  };

  const joinRequestDialog = (
    <Dialog
      open={joinIdea !== null}
      onOpenChange={(_, data) => {
        if (!data.open) {
          setJoinIdea(null);
          setJoinMessage('');
        }
      }}
    >
      <DialogSurface>
        <form className={styles.form} onSubmit={submitJoinRequest}>
          <DialogBody>
            <DialogTitle>Request to join {joinIdea?.title}</DialogTitle>
            <DialogContent>
              {actionError ? (
                <Text role="alert" className={styles.error}>{actionError}</Text>
              ) : null}
              <Field
                label="How would you contribute?"
                hint="Share the skills, experience, or perspective you would bring."
                required
              >
                <Textarea
                  value={joinMessage}
                  minLength={5}
                  maxLength={500}
                  resize="vertical"
                  onChange={(_, data) => setJoinMessage(data.value)}
                  required
                />
              </Field>
            </DialogContent>
            <DialogActions>
              <Button
                type="button"
                appearance="secondary"
                onClick={() => setJoinIdea(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                appearance="primary"
                disabled={
                  !joinMessage.trim() ||
                  busyAction === `${joinIdea?.id || ''}:join`
                }
              >
                Send request
              </Button>
            </DialogActions>
          </DialogBody>
        </form>
      </DialogSurface>
    </Dialog>
  );

  if (loading) {
    return <StatePanel state="loading" message="Loading ideas and collaboration status" />;
  }

  if (loadError) {
    return <StatePanel state="error" message={loadError} onRetry={() => void loadIdeas(search)} />;
  }

  if (ideaId && !selectedIdea) {
    return (
      <ServicePage
        area="idea-centre"
        title="Idea not found"
        description="This idea does not exist or is no longer available."
        actions={
          <Button
            appearance="primary"
            icon={<ArrowLeft size={18} aria-hidden="true" />}
            onClick={() => navigate('/idea-centre')}
          >
            Back to ideas
          </Button>
        }
      />
    );
  }

  if (selectedIdea) {
    const isOnTeam = selectedIdea.memberIds.includes(currentUserId);
    const teamIsFull = selectedIdea.memberIds.length >= selectedIdea.targetTeamSize;
    const canRequestJoin =
      selectedIdea.status === 'Open' &&
      !isOnTeam &&
      !teamIsFull &&
      selectedIdea.joinRequestStatus === null;

    return (
      <ServicePage
        area="idea-centre"
        title={selectedIdea.title}
        description={`${selectedIdea.ticketCode} · ${selectedIdea.track}`}
        actions={
          <div className={styles.detailActions}>
            <StatusBadge status={selectedIdea.status} />
            <Button
              appearance="secondary"
              icon={<ArrowLeft size={18} aria-hidden="true" />}
              onClick={() => navigate('/idea-centre')}
            >
              Back to ideas
            </Button>
          </div>
        }
      >
        {announcement ? (
          <Text role="status" className={styles.announcement}>{announcement}</Text>
        ) : null}
        {actionError && !joinIdea ? (
          <Text role="alert" className={styles.error}>{actionError}</Text>
        ) : null}

        <Card className={styles.detailCard}>
          <Text size={500} weight="semibold">{selectedIdea.tagline}</Text>
          <Text className={styles.detailDescription}>
            {selectedIdea.description}
          </Text>
          <div className={styles.metadata}>
            <StatusBadge status={selectedIdea.difficulty} />
            <Text>
              <Users size={15} aria-hidden="true" /> {selectedIdea.memberIds.length} of{' '}
              {selectedIdea.targetTeamSize} team places filled
            </Text>
            <Text>
              <Lightbulb size={15} aria-hidden="true" />{' '}
              {selectedIdea.assignedMentorName
                ? `Mentored by ${selectedIdea.assignedMentorName}`
                : selectedIdea.seekingMentor
                  ? 'Seeking a mentor'
                  : 'Mentor support not requested'}
            </Text>
          </div>
          <Text size={200} className={styles.muted}>
            Proposed by {selectedIdea.ownerName}
          </Text>
          <div className={styles.tags} aria-label="Technology and topic tags">
            {selectedIdea.techStack.map((technology) => (
              <Text key={technology} size={200} className={styles.tag}>
                {technology}
              </Text>
            ))}
          </div>
          <div className={styles.actions}>
            <Button
              appearance={selectedIdea.savedByCurrentUser ? 'primary' : 'secondary'}
              icon={
                selectedIdea.savedByCurrentUser
                  ? <BookmarkCheck size={17} aria-hidden="true" />
                  : <Bookmark size={17} aria-hidden="true" />
              }
              disabled={busyAction === `${selectedIdea.id}:save`}
              onClick={() => toggleSave(selectedIdea)}
            >
              {selectedIdea.savedByCurrentUser ? 'Saved' : 'Save'}
            </Button>
            {canRequestJoin ? (
              <Button
                appearance="secondary"
                onClick={() => {
                  setActionError(null);
                  setJoinIdea(selectedIdea);
                  setJoinMessage('');
                }}
              >
                Request to join
              </Button>
            ) : (
              <Text size={200}>
                {isOnTeam
                  ? 'You are on this team'
                  : teamIsFull
                    ? 'Team is full'
                    : selectedIdea.joinRequestStatus
                      ? `Join request ${selectedIdea.joinRequestStatus.toLocaleLowerCase()}`
                      : 'Not accepting requests'}
              </Text>
            )}
          </div>
          <section
            className={styles.comments}
            aria-label={`Comments on ${selectedIdea.title}`}
          >
            <Text weight="semibold">
              <MessageSquare size={16} aria-hidden="true" /> Comments ({selectedIdea.comments.length})
            </Text>
            {selectedIdea.comments.length > 0 ? (
              <ul className={styles.commentList}>
                {selectedIdea.comments.map((comment) => (
                  <li key={comment.id} className={styles.comment}>
                    <Text block size={200} weight="semibold">{comment.authorName}</Text>
                    <Text block>{comment.content}</Text>
                  </li>
                ))}
              </ul>
            ) : (
              <Text size={200} className={styles.muted}>
                Start the feedback conversation.
              </Text>
            )}
            <form
              className={styles.commentForm}
              aria-label={`Comment on ${selectedIdea.title}`}
              onSubmit={(event) => submitComment(event, selectedIdea)}
            >
              <Field label="Add a comment">
                <Textarea
                  value={commentDrafts[selectedIdea.id] || ''}
                  onChange={(_, data) =>
                    setCommentDrafts((current) => ({
                      ...current,
                      [selectedIdea.id]: data.value
                    }))
                  }
                  maxLength={1000}
                  resize="vertical"
                />
              </Field>
              <Button
                type="submit"
                disabled={
                  busyAction === `${selectedIdea.id}:comment` ||
                  !(commentDrafts[selectedIdea.id] || '').trim()
                }
              >
                Comment
              </Button>
            </form>
          </section>
        </Card>
        {joinRequestDialog}
      </ServicePage>
    );
  }

  return (
    <ServicePage
      area="idea-centre"
      title="Turn an idea into shared momentum"
      description="Discover campus challenges, shape proposals with peers and mentors, and form a team around the ideas you want to build."
      actions={
        <Button
          appearance="primary"
          icon={<Plus size={18} aria-hidden="true" />}
          onClick={() => {
            setActionError(null);
            setCreateOpen(true);
          }}
        >
          Submit an idea
        </Button>
      }
    >
      <MetricGrid>
        <MetricCard label="Ideas to explore" value={ideas.length} />
        <MetricCard
          label="Open for collaborators"
          value={ideas.filter((idea) => idea.status === 'Open').length}
        />
        <MetricCard
          label="Seeking mentors"
          value={ideas.filter((idea) => idea.seekingMentor).length}
        />
        <MetricCard
          label="Saved by you"
          value={ideas.filter((idea) => idea.savedByCurrentUser).length}
        />
      </MetricGrid>

      <form role="search" className={styles.toolbar} onSubmit={submitSearch}>
        <Field label="Search ideas">
          <Input
            type="search"
            value={search}
            onChange={(_, data) => setSearch(data.value)}
            placeholder="Search topics, tracks, people, or technology"
          />
        </Field>
        <Field label="Track">
          <Select value={track} onChange={(event) => setTrack(event.target.value)}>
            <option value="">All tracks</option>
            {tracks.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </Select>
        </Field>
        <Field label="Difficulty">
          <Select
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value)}
          >
            <option value="">All difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </Select>
        </Field>
        <Field label="Status">
          <Select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            <option value="Open">Open</option>
            <option value="In Progress">In progress</option>
            <option value="Completed">Completed</option>
          </Select>
        </Field>
        <div className={styles.searchActions}>
          <Button type="submit" appearance="primary">Search</Button>
          <Button
            type="button"
            appearance="subtle"
            onClick={() => {
              setSearch('');
              setTrack('');
              setDifficulty('');
              setStatus('');
              void loadIdeas();
            }}
          >
            Clear
          </Button>
        </div>
      </form>

      {announcement ? (
        <Text role="status" className={styles.announcement}>{announcement}</Text>
      ) : null}
      {actionError && !createOpen && !joinIdea ? (
        <Text role="alert" className={styles.error}>{actionError}</Text>
      ) : null}

      {visibleIdeas.length === 0 ? (
        <StatePanel
          state="empty"
          title="No ideas match these filters"
          message="Try a broader search or clear one of the filters."
        />
      ) : (
        <CardGrid>
          {visibleIdeas.map((idea) => {
            const isOnTeam = idea.memberIds.includes(currentUserId);
            const teamIsFull = idea.memberIds.length >= idea.targetTeamSize;
            const canRequestJoin =
              idea.status === 'Open' &&
              !isOnTeam &&
              !teamIsFull &&
              idea.joinRequestStatus === null;
            const saveBusy = busyAction === `${idea.id}:save`;

            return (
              <Card
                key={idea.id}
                className={styles.ideaCard}
                role="article"
                tabIndex={0}
                aria-label={`${idea.title}. Open idea details`}
                onClick={(event) => {
                  const target = event.target as HTMLElement;
                  if (!target.closest('button, input, select, textarea, a')) {
                    navigate(`/idea-centre/ideas/${encodeURIComponent(idea.id)}`);
                  }
                }}
                onKeyDown={(event) => {
                  if (
                    event.target === event.currentTarget &&
                    (event.key === 'Enter' || event.key === ' ')
                  ) {
                    event.preventDefault();
                    navigate(`/idea-centre/ideas/${encodeURIComponent(idea.id)}`);
                  }
                }}
              >
                <div className={styles.ideaCardHeader}>
                  <div className={styles.ideaHeading}>
                    <button
                      type="button"
                      className={styles.ideaTitleButton}
                      aria-label={`Open ${idea.title}`}
                      onClick={() =>
                        navigate(`/idea-centre/ideas/${encodeURIComponent(idea.id)}`)
                      }
                    >
                      {idea.title}
                    </button>
                    <Text>{idea.ticketCode} · {idea.track}</Text>
                  </div>
                  <span className={styles.statusSlot}>
                    <StatusBadge status={idea.status} />
                  </span>
                </div>
                <div className={styles.cardBody}>
                  <Text weight="semibold">{idea.tagline}</Text>
                  <div className={styles.metadata}>
                    <StatusBadge status={idea.difficulty} />
                    <Text>
                      <Users size={15} aria-hidden="true" /> {idea.memberIds.length} of{' '}
                      {idea.targetTeamSize} team places filled
                    </Text>
                    <Text>
                      <Lightbulb size={15} aria-hidden="true" />{' '}
                      {idea.assignedMentorName
                        ? `Mentored by ${idea.assignedMentorName}`
                        : idea.seekingMentor
                          ? 'Seeking a mentor'
                          : 'Mentor support not requested'}
                    </Text>
                  </div>
                  <Text size={200} className={styles.muted}>
                    Proposed by {idea.ownerName}
                  </Text>
                  <div className={styles.tags} aria-label="Technology and topic tags">
                    {idea.techStack.map((technology) => (
                      <Text key={technology} size={200} className={styles.tag}>
                        {technology}
                      </Text>
                    ))}
                  </div>
                  <div className={styles.actions}>
                    <Button
                      appearance={idea.savedByCurrentUser ? 'primary' : 'secondary'}
                      icon={
                        idea.savedByCurrentUser
                          ? <BookmarkCheck size={17} aria-hidden="true" />
                          : <Bookmark size={17} aria-hidden="true" />
                      }
                      aria-label={`${idea.savedByCurrentUser ? 'Remove' : 'Save'} ${idea.title}${
                        idea.savedByCurrentUser ? ' from saved ideas' : ''
                      }`}
                      disabled={saveBusy}
                      onClick={() => toggleSave(idea)}
                    >
                      {idea.savedByCurrentUser ? 'Saved' : 'Save'}
                    </Button>
                    {canRequestJoin ? (
                      <Button
                        appearance="secondary"
                        onClick={() => {
                          setActionError(null);
                          setJoinIdea(idea);
                          setJoinMessage('');
                        }}
                      >
                        Request to join
                      </Button>
                    ) : (
                      <Text size={200}>
                        {isOnTeam
                          ? 'You are on this team'
                          : teamIsFull
                            ? 'Team is full'
                            : idea.joinRequestStatus
                              ? `Join request ${idea.joinRequestStatus.toLocaleLowerCase()}`
                              : 'Not accepting requests'}
                      </Text>
                    )}
                  </div>
                  <Button
                    className={styles.commentSummary}
                    appearance="subtle"
                    icon={<MessageSquare size={16} aria-hidden="true" />}
                    onClick={() =>
                      navigate(`/idea-centre/ideas/${encodeURIComponent(idea.id)}`)
                    }
                  >
                    {idea.comments.length} {idea.comments.length === 1 ? 'comment' : 'comments'}
                  </Button>
                </div>
              </Card>
            );
          })}
        </CardGrid>
      )}

      <Dialog
        open={createOpen}
        onOpenChange={(_, data) => setCreateOpen(data.open)}
      >
        <DialogSurface>
          <form className={styles.form} onSubmit={submitIdea}>
            <DialogBody>
              <DialogTitle>Submit an idea</DialogTitle>
              <DialogContent className={styles.form}>
                {actionError ? (
                  <Text role="alert" className={styles.error}>{actionError}</Text>
                ) : null}
                <Field label="Title" required>
                  <Input
                    value={createForm.title}
                    minLength={3}
                    maxLength={120}
                    onChange={(_, data) =>
                      setCreateForm((current) => ({ ...current, title: data.value }))
                    }
                    required
                  />
                </Field>
                <Field label="Tagline" required>
                  <Input
                    value={createForm.tagline}
                    minLength={3}
                    maxLength={180}
                    onChange={(_, data) =>
                      setCreateForm((current) => ({ ...current, tagline: data.value }))
                    }
                    required
                  />
                </Field>
                <Field label="Description" required>
                  <Textarea
                    value={createForm.description}
                    minLength={10}
                    maxLength={5000}
                    resize="vertical"
                    onChange={(_, data) =>
                      setCreateForm((current) => ({ ...current, description: data.value }))
                    }
                    required
                  />
                </Field>
                <div className={styles.formRow}>
                  <Field label="Track" required>
                    <Input
                      value={createForm.track}
                      maxLength={80}
                      onChange={(_, data) =>
                        setCreateForm((current) => ({ ...current, track: data.value }))
                      }
                      required
                    />
                  </Field>
                  <Field label="Difficulty" required>
                    <Select
                      value={createForm.difficulty}
                      onChange={(event) =>
                        setCreateForm((current) => ({
                          ...current,
                          difficulty: event.target.value as Idea['difficulty']
                        }))
                      }
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </Select>
                  </Field>
                </div>
                <div className={styles.formRow}>
                  <Field label="Target team size" required>
                    <Input
                      type="number"
                      min={2}
                      max={12}
                      value={String(createForm.targetTeamSize)}
                      onChange={(_, data) =>
                        setCreateForm((current) => ({
                          ...current,
                          targetTeamSize: Number(data.value)
                        }))
                      }
                      required
                    />
                  </Field>
                  <Field
                    label="Technology or skills"
                    hint="Separate entries with commas."
                    required
                  >
                    <Input
                      value={techStackText}
                      onChange={(_, data) => setTechStackText(data.value)}
                      placeholder="React, service design, research"
                      required
                    />
                  </Field>
                </div>
                <Checkbox
                  checked={createForm.seekingMentor}
                  onChange={(_, data) =>
                    setCreateForm((current) => ({
                      ...current,
                      seekingMentor: data.checked === true
                    }))
                  }
                  label="I am seeking a mentor"
                />
              </DialogContent>
              <DialogActions>
                <Button
                  type="button"
                  appearance="secondary"
                  onClick={() => setCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  appearance="primary"
                  disabled={busyAction === 'create'}
                >
                  Submit idea
                </Button>
              </DialogActions>
            </DialogBody>
          </form>
        </DialogSurface>
      </Dialog>

      {joinRequestDialog}
    </ServicePage>
  );
}
