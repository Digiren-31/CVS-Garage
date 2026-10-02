import {
  Badge,
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
  mergeClasses,
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
  useRef,
  useState
} from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../../../packages/api-client/src';
import type { CreateIdeaInput, Idea } from '../../../packages/contracts/src';
import {
  CardGrid,
  MetricCard,
  MetricGrid,
  Panel,
  ServicePage,
  StatePanel,
  StatusBadge,
  glassTokens
} from '../../../packages/ui/src';

const useStyles = makeStyles({
  routeLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    color: tokens.colorBrandForeground1,
    textDecorationLine: 'none',
    minHeight: '36px',
    ':hover': { textDecorationLine: 'underline' }
  },
  toolbar: {
    display: 'grid',
    minWidth: 0,
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
    gap: tokens.spacingHorizontalM,
    alignItems: 'end',
    '& > *': {
      minWidth: 0
    }
  },
  searchRow: {
    display: 'flex',
    flexWrap: 'wrap',
    minWidth: 0,
    gridColumn: '1 / -1',
    alignItems: 'flex-end',
    gap: tokens.spacingHorizontalS
  },
  searchField: {
    minWidth: 0,
    flex: '1 1 260px'
  },
  field: {
    minWidth: 0,
    maxWidth: '100%',
    gridTemplateColumns: 'minmax(0, 1fr)'
  },
  searchActions: {
    display: 'flex',
    minWidth: 0,
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS
  },
  control: {
    minWidth: 0,
    width: '100%',
    maxWidth: '100%'
  },
  cardBody: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    minWidth: 0,
    gap: tokens.spacingVerticalM
  },
  ideaCard: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    height: '100%',
    gap: tokens.spacingVerticalM,
    overflowWrap: 'anywhere',
    cursor: 'pointer',
    backgroundColor: glassTokens.surface,
    backdropFilter: glassTokens.blur,
    WebkitBackdropFilter: glassTokens.blur,
    boxShadow: glassTokens.shadow,
    ...shorthands.padding(tokens.spacingVerticalL),
    ...shorthands.border('1px', 'solid', glassTokens.border),
    ...shorthands.borderRadius(tokens.borderRadiusLarge),
    ':hover': {
      backgroundColor: glassTokens.surfaceHover,
      boxShadow: glassTokens.shadowHover
    },
    ':focus-visible': {
      outlineStyle: 'solid',
      outlineWidth: '2px',
      outlineColor: tokens.colorStrokeFocus2,
      outlineOffset: '2px'
    }
  },
  ideaCardHeader: {
    display: 'grid',
    minWidth: 0,
    gap: tokens.spacingVerticalS
  },
  ideaHeading: {
    minWidth: 0,
    display: 'grid',
    gap: tokens.spacingVerticalS
  },
  ideaTitleHeading: {
    minWidth: 0,
    marginBlock: 0,
    lineHeight: tokens.lineHeightBase400
  },
  ideaTitleButton: {
    appearance: 'none',
    minWidth: 0,
    width: '100%',
    color: tokens.colorNeutralForeground1,
    backgroundColor: 'transparent',
    textAlign: 'left',
    fontSize: tokens.fontSizeBase400,
    lineHeight: tokens.lineHeightBase400,
    fontWeight: tokens.fontWeightSemibold,
    overflowWrap: 'anywhere',
    ...shorthands.border('0'),
    ...shorthands.padding(0),
    cursor: 'pointer',
    ':hover': {
      color: tokens.colorBrandForeground1
    }
  },
  statusSlot: {
    minWidth: 0,
    maxWidth: '100%',
    display: 'flex',
    alignItems: 'center'
  },
  commentSummary: {
    minWidth: 0,
    alignSelf: 'flex-start'
  },
  cardFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    minWidth: 0,
    gap: tokens.spacingHorizontalS,
    marginTop: 'auto',
    paddingTop: tokens.spacingVerticalM,
    ...shorthands.borderTop('1px', 'solid', tokens.colorNeutralStroke2)
  },
  detailActions: {
    display: 'flex',
    minWidth: 0,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM
  },
  detailCard: {
    display: 'grid',
    minWidth: 0,
    gap: tokens.spacingVerticalL,
    overflowWrap: 'anywhere',
    backgroundColor: glassTokens.surface,
    backdropFilter: glassTokens.blur,
    WebkitBackdropFilter: glassTokens.blur,
    boxShadow: glassTokens.shadow,
    ...shorthands.border('1px', 'solid', glassTokens.border),
    ...shorthands.borderRadius(tokens.borderRadiusLarge),
    ...shorthands.padding(tokens.spacingVerticalXL),
    '& > *': {
      minWidth: 0
    },
    '@media (max-width: 600px)': {
      ...shorthands.padding(tokens.spacingVerticalL)
    }
  },
  detailDescription: {
    whiteSpace: 'pre-wrap',
    lineHeight: tokens.lineHeightBase400
  },
  metadata: {
    display: 'flex',
    minWidth: 0,
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalS,
    alignItems: 'center'
  },
  iconText: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    minWidth: 0,
    marginBlock: 0,
    '& > svg': {
      flexShrink: 0
    }
  },
  muted: {
    color: tokens.colorNeutralForeground2
  },
  tags: {
    display: 'flex',
    minWidth: 0,
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalXS
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
  actions: {
    display: 'flex',
    minWidth: 0,
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalS,
    alignItems: 'center'
  },
  comments: {
    display: 'grid',
    minWidth: 0,
    gap: tokens.spacingVerticalS,
    ...shorthands.padding(tokens.spacingVerticalS, 0, 0),
    ...shorthands.borderTop('1px', 'solid', tokens.colorNeutralStroke2)
  },
  commentList: {
    display: 'grid',
    minWidth: 0,
    gap: tokens.spacingVerticalS,
    listStyleType: 'none',
    ...shorthands.margin(0),
    ...shorthands.padding(0)
  },
  comment: {
    minWidth: 0,
    ...shorthands.padding(tokens.spacingVerticalS),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    backgroundColor: tokens.colorNeutralBackground2
  },
  commentForm: {
    display: 'grid',
    minWidth: 0,
    gridTemplateColumns: 'minmax(0, 1fr) auto',
    gap: tokens.spacingHorizontalS,
    alignItems: 'end',
    '& > *': {
      minWidth: 0
    },
    '@media (max-width: 560px)': {
      gridTemplateColumns: '1fr'
    }
  },
  form: {
    display: 'grid',
    minWidth: 0,
    gap: tokens.spacingVerticalM,
    '& > *': {
      minWidth: 0
    }
  },
  formRow: {
    display: 'grid',
    minWidth: 0,
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: tokens.spacingHorizontalM,
    '& > *': {
      minWidth: 0
    },
    '@media (max-width: 560px)': {
      gridTemplateColumns: '1fr'
    }
  },
  announcement: {
    minWidth: 0,
    overflowWrap: 'anywhere',
    ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalM),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    backgroundColor: tokens.colorNeutralBackground2
  },
  dialogSurface: {
    minWidth: 0,
    width: `min(640px, calc(100vw - ${tokens.spacingHorizontalL} * 2))`,
    maxWidth: '100%',
    maxHeight: `calc(100dvh - ${tokens.spacingVerticalL} * 2)`,
    overflowY: 'auto'
  },
  dialogBody: {
    minWidth: 0,
    overflowWrap: 'anywhere',
    '& > *': {
      minWidth: 0
    }
  },
  dialogActions: {
    display: 'flex',
    minWidth: 0,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: tokens.spacingHorizontalS
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
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') || '';
  const track = searchParams.get('track') || '';
  const difficulty = searchParams.get('difficulty') || '';
  const status = searchParams.get('status') || '';
  const requestVersion = useRef(0);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const loadKey = ideaId ? `idea:${ideaId}` : `list:${searchQuery}`;
  const backLink = <Link className={styles.routeLink} to={`/idea-centre${location.search}`}><ArrowLeft size={16} aria-hidden="true" />Back to ideas</Link>;
  const detailHref = (id: string) => `/idea-centre/ideas/${encodeURIComponent(id)}${location.search}`;
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [search, setSearch] = useState(searchQuery);
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
    const request = ++requestVersion.current;
    const key = ideaId ? `idea:${ideaId}` : `list:${query}`;
    setLoading(true);
    try {
      const result = await api.ideas.list(ideaId ? '' : query);
      if (request === requestVersion.current) {
        setIdeas(result);
        setLoadError(null);
      }
    } catch (error) {
      if (request === requestVersion.current) {
        setLoadError(error instanceof Error ? error.message : 'Ideas could not be loaded.');
      }
    } finally {
      if (request === requestVersion.current) {
        setLoadedKey(key);
        setLoading(false);
      }
    }
  }, [ideaId]);

  useEffect(() => {
    setActionError(null);
    setAnnouncement(null);
    void loadIdeas(searchQuery);
    return () => { requestVersion.current += 1; };
  }, [loadIdeas, searchQuery]);

  useEffect(() => setSearch(searchQuery), [searchQuery]);

  function updateFilter(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  }

  const tracks = useMemo(
    () => [...new Set([...ideas.map((idea) => idea.track), ...(track ? [track] : [])])].sort(),
    [ideas, track]
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
    if (search.trim() === searchQuery) void loadIdeas(searchQuery);
    else updateFilter('q', search.trim());
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
      <DialogSurface className={styles.dialogSurface}>
        <form className={styles.form} onSubmit={submitJoinRequest}>
          <DialogBody className={styles.dialogBody}>
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
            <DialogActions className={styles.dialogActions}>
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

  if (loading || loadedKey !== loadKey) {
    const state = <StatePanel state="loading" message="Loading ideas and collaboration status" />;
    return ideaId ? <ServicePage area="idea-centre" title="Idea details" description="Loading the idea." actions={backLink}>{state}</ServicePage> : state;
  }

  if (loadError) {
    const state = <StatePanel state="error" message={loadError} onRetry={() => void loadIdeas(searchQuery)} />;
    return ideaId ? <ServicePage area="idea-centre" title="Idea unavailable" description="The idea could not be loaded." actions={backLink}>{state}</ServicePage> : state;
  }

  if (ideaId && !selectedIdea) {
    return (
      <ServicePage
        area="idea-centre"
        title="Idea not found"
        description="This idea does not exist or is no longer available."
        actions={backLink}
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
            {backLink}
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
          <Text size={400} weight="semibold">{selectedIdea.tagline}</Text>
          <Text className={styles.detailDescription}>
            {selectedIdea.description}
          </Text>
          <div className={styles.metadata}>
            <StatusBadge status={selectedIdea.difficulty} />
            <Text className={styles.iconText}>
              <Users size={15} aria-hidden="true" /> {selectedIdea.memberIds.length} of{' '}
              {selectedIdea.targetTeamSize} team places filled
            </Text>
            <Text className={styles.iconText}>
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
              <Badge key={technology} appearance="outline" className={styles.tag}>
                {technology}
              </Badge>
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
            <Text as="h2" size={400} weight="semibold" className={styles.iconText}>
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

      <Panel>
        <form role="search" className={styles.toolbar} onSubmit={submitSearch}>
          <div className={styles.searchRow}>
            <Field className={mergeClasses(styles.field, styles.searchField)} label="Search ideas">
              <Input
                className={styles.control}
                type="search"
                value={search}
                onChange={(_, data) => setSearch(data.value)}
                placeholder="Search topics, tracks, people, or technology"
              />
            </Field>
            <div className={styles.searchActions}>
              <Button type="submit" appearance="primary">Search</Button>
              <Button
                type="button"
                appearance="subtle"
                onClick={() => {
                  setSearch('');
                  if (!location.search) void loadIdeas();
                  else setSearchParams({}, { replace: true });
                }}
              >
                Clear
              </Button>
            </div>
          </div>
          <Field className={styles.field} label="Track">
            <Select
              className={styles.control}
              select={{ className: styles.control }}
              value={track}
              onChange={(event) => updateFilter('track', event.target.value)}
            >
              <option value="">All tracks</option>
              {tracks.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </Select>
          </Field>
          <Field className={styles.field} label="Difficulty">
            <Select
              className={styles.control}
              select={{ className: styles.control }}
              value={difficulty}
              onChange={(event) => updateFilter('difficulty', event.target.value)}
            >
              <option value="">All difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </Select>
          </Field>
          <Field className={styles.field} label="Status">
            <Select
              className={styles.control}
              select={{ className: styles.control }}
              value={status}
              onChange={(event) => updateFilter('status', event.target.value)}
            >
              <option value="">All statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In progress</option>
              <option value="Completed">Completed</option>
            </Select>
          </Field>
        </form>
      </Panel>

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
                    navigate(detailHref(idea.id));
                  }
                }}
                onKeyDown={(event) => {
                  if (
                    event.target === event.currentTarget &&
                    (event.key === 'Enter' || event.key === ' ')
                  ) {
                    event.preventDefault();
                    navigate(detailHref(idea.id));
                  }
                }}
              >
                <div className={styles.ideaCardHeader}>
                  <div className={styles.ideaHeading}>
                    <h2 className={styles.ideaTitleHeading}>
                      <Link
                        to={detailHref(idea.id)}
                        className={styles.ideaTitleButton}
                        aria-label={`Open ${idea.title}`}
                      >
                        {idea.title}
                      </Link>
                    </h2>
                    <div className={styles.metadata}>
                      <Text size={200} className={styles.muted}>{idea.ticketCode} · {idea.track}</Text>
                      <span className={styles.statusSlot}>
                        <StatusBadge status={idea.status} />
                      </span>
                    </div>
                  </div>
                </div>
                <div className={styles.cardBody}>
                  <Text>{idea.tagline}</Text>
                  <div className={styles.metadata}>
                    <StatusBadge status={idea.difficulty} />
                    <Text size={200} className={styles.iconText}>
                      <Users size={15} aria-hidden="true" /> {idea.memberIds.length} of{' '}
                      {idea.targetTeamSize} team places filled
                    </Text>
                    <Text size={200} className={styles.iconText}>
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
                      <Badge key={technology} appearance="outline" className={styles.tag}>
                        {technology}
                      </Badge>
                    ))}
                  </div>
                  <div className={styles.cardFooter}>
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
                        navigate(detailHref(idea.id))
                      }
                    >
                      {idea.comments.length} {idea.comments.length === 1 ? 'comment' : 'comments'}
                    </Button>
                  </div>
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
        <DialogSurface className={styles.dialogSurface}>
          <form className={styles.form} onSubmit={submitIdea}>
            <DialogBody className={styles.dialogBody}>
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
                      className={styles.control}
                      select={{ className: styles.control }}
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
              <DialogActions className={styles.dialogActions}>
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
