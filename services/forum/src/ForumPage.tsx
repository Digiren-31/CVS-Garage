import {
  Avatar,
  Badge,
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Divider,
  Field,
  Input,
  Select,
  Spinner,
  Text,
  Textarea,
  makeStyles,
  mergeClasses,
  shorthands,
  tokens
} from '@fluentui/react-components';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent
} from 'react';
import { api } from '../../../packages/api-client/src';
import type {
  Event,
  ForumPost,
  ForumReply,
  Member,
  Project,
  TagSummary
} from '../../../packages/contracts/src';
import {
  ContentCard,
  ServicePage,
  StatePanel
} from '../../../packages/ui/src';

type ForumView = 'feed' | 'detail' | 'communities' | 'mentors' | 'moderation';
type FeedMode = 'all' | 'following' | 'bookmarks';
type FeedSort = 'newest' | 'trending' | 'unanswered';
type PostStatusFilter = '' | ForumPost['status'];
type VoteTarget = 'post' | 'reply';

interface ModerationReport {
  id: string;
  targetType: 'post' | 'reply' | 'user';
  targetId: string;
  reason: string;
  notes?: string;
  status: string;
  createdAt: string;
  reporter?: { name?: string };
  targetContent?: { title?: string; content?: string };
}

interface CreatePostForm {
  postType: ForumPost['postType'];
  title: string;
  content: string;
  communityId: string;
  tags: string;
  linkedProjectId: string;
  linkedEventId: string;
  problemStatement: string;
  proposedSolution: string;
  expectedImpact: string;
}

interface ReportTarget {
  type: 'post' | 'reply';
  id: string;
}

const emptyCreateForm: CreatePostForm = {
  postType: 'question',
  title: '',
  content: '',
  communityId: '',
  tags: '',
  linkedProjectId: '',
  linkedEventId: '',
  problemStatement: '',
  proposedSolution: '',
  expectedImpact: ''
};

const postTypes: Array<{ value: ForumPost['postType']; label: string }> = [
  { value: 'question', label: 'Question' },
  { value: 'problem', label: 'Problem or challenge' },
  { value: 'doubt', label: 'Technical doubt' },
  { value: 'discussion', label: 'Open discussion' },
  { value: 'idea', label: 'Idea for brainstorming' },
  { value: 'project_discussion', label: 'Project discussion' },
  { value: 'event_discussion', label: 'Event discussion' }
];

const useStyles = makeStyles({
  navigation: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalS,
    alignItems: 'center'
  },
  feedback: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalL),
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    backgroundColor: tokens.colorNeutralBackground2
  },
  errorFeedback: {
    color: tokens.colorPaletteRedForeground1
  },
  filterPanel: {
    display: 'grid',
    gap: tokens.spacingVerticalM
  },
  searchRow: {
    display: 'grid',
    gridTemplateColumns: 'minmax(220px, 1fr) auto',
    gap: tokens.spacingHorizontalS,
    '@media (max-width: 600px)': {
      gridTemplateColumns: '1fr'
    }
  },
  filters: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(150px, 220px)) minmax(0, 1fr)',
    gap: tokens.spacingHorizontalM,
    alignItems: 'end',
    '@media (max-width: 900px)': {
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))'
    },
    '@media (max-width: 600px)': {
      gridTemplateColumns: '1fr'
    }
  },
  feedModes: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalXS,
    alignItems: 'center',
    justifyContent: 'flex-end',
    '@media (max-width: 900px)': {
      gridColumn: '1 / -1',
      justifyContent: 'flex-start'
    },
    '@media (max-width: 600px)': {
      gridColumn: 'auto'
    }
  },
  contentLayout: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) minmax(230px, 290px)',
    gap: tokens.spacingHorizontalXL,
    alignItems: 'start',
    '@media (max-width: 900px)': {
      gridTemplateColumns: '1fr'
    }
  },
  stream: {
    display: 'grid',
    gap: tokens.spacingVerticalM,
    minWidth: 0
  },
  sidebar: {
    display: 'grid',
    gap: tokens.spacingVerticalM,
    position: 'sticky',
    top: tokens.spacingVerticalL,
    '@media (max-width: 900px)': {
      position: 'static',
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))'
    },
    '@media (max-width: 600px)': {
      gridTemplateColumns: '1fr'
    }
  },
  sidebarList: {
    display: 'grid',
    gap: tokens.spacingVerticalS
  },
  sidebarItem: {
    display: 'grid',
    gap: tokens.spacingVerticalXS,
    justifyItems: 'start',
    textAlign: 'start'
  },
  postCard: {
    ...shorthands.padding(tokens.spacingVerticalL, tokens.spacingHorizontalL),
    display: 'grid',
    gap: tokens.spacingVerticalM
  },
  postTop: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalS,
    alignItems: 'center'
  },
  author: {
    display: 'flex',
    gap: tokens.spacingHorizontalXS,
    alignItems: 'center'
  },
  postTitle: {
    marginBlock: 0,
    fontSize: tokens.fontSizeBase500,
    lineHeight: tokens.lineHeightBase500
  },
  titleButton: {
    minWidth: 0,
    maxWidth: '100%',
    height: 'auto',
    justifyContent: 'flex-start',
    textAlign: 'start',
    whiteSpace: 'normal',
    ...shorthands.padding(0)
  },
  body: {
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
    color: tokens.colorNeutralForeground2
  },
  clampBody: {
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden'
  },
  tags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalXS
  },
  linkedItems: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalXS
  },
  actions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalM
  },
  actionGroup: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalXS,
    alignItems: 'center'
  },
  voteScore: {
    minWidth: '3ch',
    textAlign: 'center',
    fontWeight: tokens.fontWeightSemibold
  },
  detail: {
    display: 'grid',
    gap: tokens.spacingVerticalL
  },
  detailHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalM
  },
  detailTitle: {
    marginBlock: 0,
    fontSize: tokens.fontSizeHero700,
    lineHeight: tokens.lineHeightHero700,
    '@media (max-width: 600px)': {
      fontSize: tokens.fontSizeBase600,
      lineHeight: tokens.lineHeightBase600
    }
  },
  contextPanel: {
    display: 'grid',
    gap: tokens.spacingVerticalXS,
    ...shorthands.padding(tokens.spacingVerticalM),
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    backgroundColor: tokens.colorNeutralBackground2
  },
  accepted: {
    ...shorthands.border('2px', 'solid', tokens.colorPaletteGreenBorder2)
  },
  replies: {
    display: 'grid',
    gap: tokens.spacingVerticalM
  },
  reply: {
    display: 'grid',
    gap: tokens.spacingVerticalS,
    ...shorthands.padding(tokens.spacingVerticalM),
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    backgroundColor: tokens.colorNeutralBackground1
  },
  replyDepthOne: {
    marginInlineStart: tokens.spacingHorizontalXL,
    '@media (max-width: 600px)': {
      marginInlineStart: tokens.spacingHorizontalM
    }
  },
  replyDepthTwo: {
    marginInlineStart: tokens.spacingHorizontalXXXL,
    '@media (max-width: 600px)': {
      marginInlineStart: tokens.spacingHorizontalL
    }
  },
  composer: {
    display: 'grid',
    gap: tokens.spacingVerticalM
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalM
  },
  cards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
    gap: tokens.spacingHorizontalL
  },
  discoveryCard: {
    ...shorthands.padding(tokens.spacingVerticalL),
    display: 'grid',
    gap: tokens.spacingVerticalM
  },
  discoveryHeader: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    alignItems: 'center'
  },
  mentorSearch: {
    maxWidth: '420px'
  },
  dialogContent: {
    display: 'grid',
    gap: tokens.spacingVerticalM,
    maxHeight: 'min(68vh, 680px)',
    overflowY: 'auto',
    ...shorthands.padding(0, tokens.spacingHorizontalXS)
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: tokens.spacingHorizontalM,
    '@media (max-width: 600px)': {
      gridTemplateColumns: '1fr'
    }
  },
  fullSpan: {
    gridColumn: '1 / -1',
    '@media (max-width: 600px)': {
      gridColumn: 'auto'
    }
  },
  hint: {
    color: tokens.colorNeutralForeground3
  },
  touchButton: {
    minHeight: '40px'
  },
  moderationItem: {
    ...shorthands.padding(tokens.spacingVerticalL),
    display: 'grid',
    gap: tokens.spacingVerticalM
  }
});

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function formatLabel(value: string) {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Date unavailable';
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

function statusColor(status: ForumPost['status']) {
  if (status === 'solved') {
    return 'success' as const;
  }
  if (status === 'closed' || status === 'archived') {
    return 'danger' as const;
  }
  if (status === 'under_review') {
    return 'warning' as const;
  }
  return 'informative' as const;
}

function isForumModerator(user: Member | null) {
  return Boolean(
    user?.role === 'Admin' || user?.forumPermissions?.canAccessModeration
  );
}

function canAcceptSolution(user: Member | null, post: ForumPost) {
  return Boolean(
    user &&
      (post.viewerPermissions?.canAcceptSolution ?? post.authorId === user.id)
  );
}

function canExportPost(user: Member | null, post: ForumPost) {
  return Boolean(
    user &&
      (post.viewerPermissions?.canExport ??
        (post.authorId === user.id || user.role === 'Mentor'))
  );
}

function AuthorSummary({
  post,
  compact = false
}: {
  post: Pick<ForumPost, 'author'>;
  compact?: boolean;
}) {
  const styles = useStyles();
  const author = post.author;
  return (
    <span className={styles.author}>
      <Avatar
        size={compact ? 20 : 24}
        name={author?.name || 'Forum member'}
        image={author?.avatarUrl ? { src: author.avatarUrl } : undefined}
      />
      <Text size={compact ? 200 : 300} weight="semibold">
        {author?.name || 'Forum member'}
      </Text>
      {author?.isMentor ? <Badge size="small">Mentor</Badge> : null}
    </span>
  );
}

function VoteControls({
  targetType,
  targetId,
  score,
  userVote,
  disabled,
  onVote
}: {
  targetType: VoteTarget;
  targetId: string;
  score: number;
  userVote?: number;
  disabled: boolean;
  onVote: (targetType: VoteTarget, targetId: string, value: -1 | 1) => void;
}) {
  const styles = useStyles();
  return (
    <div className={styles.actionGroup} aria-label={`${targetType} voting controls`}>
      <Button
        appearance={userVote === 1 ? 'primary' : 'subtle'}
        aria-label={`Upvote ${targetType}`}
        aria-pressed={userVote === 1}
        disabled={disabled}
        onClick={() => onVote(targetType, targetId, 1)}
      >
        Upvote
      </Button>
      <Text className={styles.voteScore} aria-label={`${score} votes`}>
        {score}
      </Text>
      <Button
        appearance={userVote === -1 ? 'primary' : 'subtle'}
        aria-label={`Downvote ${targetType}`}
        aria-pressed={userVote === -1}
        disabled={disabled}
        onClick={() => onVote(targetType, targetId, -1)}
      >
        Downvote
      </Button>
    </div>
  );
}

function PostCard({
  post,
  currentUser,
  busyAction,
  onOpen,
  onVote,
  onBookmark,
  onTag,
  onExport
}: {
  post: ForumPost;
  currentUser: Member | null;
  busyAction: string | null;
  onOpen: (postId: string) => void;
  onVote: (targetType: VoteTarget, targetId: string, value: -1 | 1) => void;
  onBookmark: (postId: string) => void;
  onTag: (slug: string) => void;
  onExport: (post: ForumPost) => void;
}) {
  const styles = useStyles();
  const busy = busyAction?.endsWith(post.id) ?? false;

  return (
    <article aria-labelledby={`forum-post-title-${post.id}`}>
      <Card className={styles.postCard}>
        <div className={styles.postTop}>
          <Badge appearance="tint">{formatLabel(post.postType)}</Badge>
          <Badge color={statusColor(post.status)}>{formatLabel(post.status)}</Badge>
          {post.isPinned ? <Badge color="brand">Pinned</Badge> : null}
          <AuthorSummary post={post} />
          <Text size={200} className={styles.hint}>
            {formatDate(post.createdAt)}
          </Text>
          {post.community ? (
            <Text size={200}>in {post.community.name}</Text>
          ) : null}
        </div>

        <h2 className={styles.postTitle} id={`forum-post-title-${post.id}`}>
          <Button
            appearance="transparent"
            className={styles.titleButton}
            onClick={() => onOpen(post.id)}
          >
            {post.title}
          </Button>
        </h2>

        <Text className={mergeClasses(styles.body, styles.clampBody)}>
          {post.content}
        </Text>

        {post.linkedProject || post.linkedEvent || post.ideaExport ? (
          <div className={styles.linkedItems} aria-label="Linked portal records">
            {post.linkedProject ? (
              <Badge appearance="outline">Project: {post.linkedProject.name}</Badge>
            ) : null}
            {post.linkedEvent ? (
              <Badge appearance="outline">Event: {post.linkedEvent.title}</Badge>
            ) : null}
            {post.ideaExport ? (
              <Badge color="success">Idea Centre: {post.ideaExport.ideaId}</Badge>
            ) : null}
          </div>
        ) : null}

        {post.tags.length ? (
          <div className={styles.tags} aria-label="Discussion tags">
            {post.tags.map((tag) => (
              <Button
                key={tag.id}
                size="small"
                appearance="subtle"
                onClick={() => onTag(tag.slug)}
              >
                #{tag.name}
              </Button>
            ))}
          </div>
        ) : null}

        <Divider />
        <div className={styles.actions}>
          <div className={styles.actionGroup}>
            <VoteControls
              targetType="post"
              targetId={post.id}
              score={post.voteScore}
              userVote={post.userVote}
              disabled={busy}
              onVote={onVote}
            />
            <Button appearance="subtle" onClick={() => onOpen(post.id)}>
              {post.replyCount} {post.replyCount === 1 ? 'reply' : 'replies'}
            </Button>
            <Button
              appearance={post.isBookmarked ? 'primary' : 'subtle'}
              aria-pressed={Boolean(post.isBookmarked)}
              disabled={busy}
              onClick={() => onBookmark(post.id)}
            >
              {post.isBookmarked ? 'Saved' : 'Save'}
            </Button>
          </div>
          {!post.ideaExport && canExportPost(currentUser, post) ? (
            <Button
              appearance="secondary"
              disabled={busy}
              onClick={() => onExport(post)}
            >
              Export to Idea Centre
            </Button>
          ) : null}
        </div>
      </Card>
    </article>
  );
}

function ReplyTree({
  replies,
  post,
  currentUser,
  busyAction,
  onVote,
  onReply,
  onAccept,
  onReport,
  depth = 0
}: {
  replies: ForumReply[];
  post: ForumPost;
  currentUser: Member | null;
  busyAction: string | null;
  onVote: (targetType: VoteTarget, targetId: string, value: -1 | 1) => void;
  onReply: (reply: ForumReply) => void;
  onAccept: (replyId: string) => void;
  onReport: (target: ReportTarget) => void;
  depth?: number;
}) {
  const styles = useStyles();
  return (
    <>
      {replies.map((reply) => {
        const depthClass =
          depth === 1
            ? styles.replyDepthOne
            : depth >= 2
              ? styles.replyDepthTwo
              : '';
        return (
          <div key={reply.id}>
            <article
              className={mergeClasses(styles.reply, depthClass)}
              aria-label={`Reply from ${reply.author?.name || 'Forum member'}`}
            >
              <div className={styles.postTop}>
                <Avatar
                  size={20}
                  name={reply.author?.name || 'Forum member'}
                  image={
                    reply.author?.avatarUrl
                      ? { src: reply.author.avatarUrl }
                      : undefined
                  }
                />
                <Text weight="semibold">
                  {reply.author?.name || 'Forum member'}
                </Text>
                {reply.author?.isMentor ? <Badge size="small">Mentor</Badge> : null}
                {reply.isAcceptedSolution ? (
                  <Badge color="success">Accepted solution</Badge>
                ) : null}
                <Text size={200} className={styles.hint}>
                  {formatDate(reply.createdAt)}
                </Text>
              </div>
              <Text className={styles.body}>{reply.content}</Text>
              <div className={styles.actions}>
                <VoteControls
                  targetType="reply"
                  targetId={reply.id}
                  score={reply.voteScore}
                  userVote={reply.userVote}
                  disabled={busyAction === `vote-reply-${reply.id}`}
                  onVote={onVote}
                />
                <div className={styles.actionGroup}>
                  <Button appearance="subtle" onClick={() => onReply(reply)}>
                    Reply
                  </Button>
                  <Button
                    appearance="subtle"
                    onClick={() => onReport({ type: 'reply', id: reply.id })}
                  >
                    Report
                  </Button>
                  {canAcceptSolution(currentUser, post) &&
                  !reply.isAcceptedSolution ? (
                    <Button
                      appearance="secondary"
                      disabled={busyAction === `accept-${reply.id}`}
                      onClick={() => onAccept(reply.id)}
                    >
                      Accept as solution
                    </Button>
                  ) : null}
                </div>
              </div>
            </article>
            {reply.children?.length ? (
              <ReplyTree
                replies={reply.children}
                post={post}
                currentUser={currentUser}
                busyAction={busyAction}
                onVote={onVote}
                onReply={onReply}
                onAccept={onAccept}
                onReport={onReport}
                depth={depth + 1}
              />
            ) : null}
          </div>
        );
      })}
    </>
  );
}

export function ForumPage() {
  const styles = useStyles();
  const [view, setView] = useState<ForumView>('feed');
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<FeedSort>('newest');
  const [status, setStatus] = useState<PostStatusFilter>('');
  const [feedMode, setFeedMode] = useState<FeedMode>('all');
  const [communityFilter, setCommunityFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');

  const [communities, setCommunities] = useState<
    Array<{ id: string; name: string; slug: string; description: string }>
  >([]);
  const [mentors, setMentors] = useState<Member[]>([]);
  const [tags, setTags] = useState<TagSummary[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [currentUser, setCurrentUser] = useState<Member | null>(null);
  const [supportLoading, setSupportLoading] = useState(true);
  const [supportError, setSupportError] = useState<string | null>(null);
  const [mentorSearch, setMentorSearch] = useState('');

  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyingTo, setReplyingTo] = useState<ForumReply | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] =
    useState<CreatePostForm>(emptyCreateForm);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSubmitting, setCreateSubmitting] = useState(false);

  const [exportPost, setExportPost] = useState<ForumPost | null>(null);
  const [exportProblem, setExportProblem] = useState('');
  const [exportSolution, setExportSolution] = useState('');
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSubmitting, setExportSubmitting] = useState(false);

  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const [reportReason, setReportReason] = useState('spam');
  const [reportNotes, setReportNotes] = useState('');
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportSubmitting, setReportSubmitting] = useState(false);

  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState<string | null>(null);

  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    kind: 'success' | 'error';
    message: string;
  } | null>(null);

  const loadSupportData = useCallback(async () => {
    setSupportLoading(true);
    setSupportError(null);
    const results = await Promise.allSettled([
      api.forum.communities(),
      api.forum.mentors(),
      api.request<TagSummary[]>('/forum/tags'),
      api.projects.list(),
      api.events.list(),
      api.forum.context()
    ]);

    if (results[0].status === 'fulfilled') {
      setCommunities(results[0].value);
    }
    if (results[1].status === 'fulfilled') {
      setMentors(results[1].value);
    }
    if (results[2].status === 'fulfilled') {
      setTags(results[2].value);
    }
    if (results[3].status === 'fulfilled') {
      setProjects(results[3].value);
    }
    if (results[4].status === 'fulfilled') {
      setEvents(results[4].value);
    }
    if (results[5].status === 'fulfilled') {
      setCurrentUser(results[5].value.currentUser);
    }

    const failed = results.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected'
    );
    if (failed) {
      setSupportError(
        getErrorMessage(
          failed.reason,
          'Some Forum discovery information could not be loaded.'
        )
      );
    }
    setSupportLoading(false);
  }, []);

  const loadFeed = useCallback(async () => {
    setFeedLoading(true);
    setFeedError(null);
    const filters: Record<string, string | boolean> = {};
    if (search) {
      filters.search = search;
    }
    if (sort !== 'newest') {
      filters.sort = sort;
    }
    if (status) {
      filters.status = status;
    }
    if (feedMode === 'following') {
      filters.followingOnly = true;
    }
    if (feedMode === 'bookmarks') {
      filters.bookmarkedOnly = true;
    }
    if (communityFilter) {
      filters.community = communityFilter;
    }
    if (tagFilter) {
      filters.tag = tagFilter;
    }

    try {
      setPosts(await api.forum.posts(filters));
    } catch (error) {
      setFeedError(
        getErrorMessage(error, 'Discussions could not be loaded.')
      );
    } finally {
      setFeedLoading(false);
    }
  }, [communityFilter, feedMode, search, sort, status, tagFilter]);

  useEffect(() => {
    void loadSupportData();
  }, [loadSupportData]);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  const loadDetail = useCallback(async (postId: string) => {
    setDetailLoading(true);
    setDetailError(null);
    try {
      const [post, postReplies] = await Promise.all([
        api.forum.post(postId),
        api.forum.replies(postId)
      ]);
      setSelectedPost(post);
      setReplies(postReplies);
    } catch (error) {
      setDetailError(
        getErrorMessage(error, 'This discussion could not be loaded.')
      );
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const loadReports = useCallback(async () => {
    setReportsLoading(true);
    setReportsError(null);
    try {
      setReports(
        await api.request<ModerationReport[]>('/forum/moderation/reports')
      );
    } catch (error) {
      setReportsError(
        getErrorMessage(error, 'The moderation queue could not be loaded.')
      );
    } finally {
      setReportsLoading(false);
    }
  }, []);

  function openPost(postId: string) {
    setView('detail');
    setSelectedPostId(postId);
    setReplyText('');
    setReplyingTo(null);
    setSelectedPost(null);
    void loadDetail(postId);
  }

  function showFeed() {
    setView('feed');
    setDetailError(null);
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearch(searchDraft.trim());
    setView('feed');
  }

  function clearFilters() {
    setSearchDraft('');
    setSearch('');
    setSort('newest');
    setStatus('');
    setFeedMode('all');
    setCommunityFilter('');
    setTagFilter('');
  }

  function filterByTag(slug: string) {
    setTagFilter(slug);
    setCommunityFilter('');
    setFeedMode('all');
    setView('feed');
  }

  function filterByCommunity(slug: string) {
    setCommunityFilter(slug);
    setTagFilter('');
    setFeedMode('all');
    setView('feed');
  }

  function openCommunities() {
    setView('communities');
  }

  function openMentors() {
    setView('mentors');
  }

  function openModeration() {
    setView('moderation');
    void loadReports();
  }

  async function handleVote(
    targetType: VoteTarget,
    targetId: string,
    value: -1 | 1
  ) {
    const action = `vote-${targetType}-${targetId}`;
    setBusyAction(action);
    setFeedback(null);
    try {
      const result = await api.forum.vote(targetType, targetId, value);
      if (targetType === 'post') {
        setPosts((current) =>
          current.map((post) =>
            post.id === targetId
              ? {
                  ...post,
                  voteScore: result.newScore,
                  userVote: result.userVote as -1 | 0 | 1
                }
              : post
          )
        );
        setSelectedPost((current) =>
          current?.id === targetId
            ? {
                ...current,
                voteScore: result.newScore,
                userVote: result.userVote as -1 | 0 | 1
              }
            : current
        );
      } else if (selectedPost) {
        await loadDetail(selectedPost.id);
      }
      setFeedback({ kind: 'success', message: 'Your vote was saved.' });
    } catch (error) {
      setFeedback({
        kind: 'error',
        message: getErrorMessage(error, 'The vote could not be saved.')
      });
    } finally {
      setBusyAction(null);
    }
  }

  async function handleBookmark(postId: string) {
    setBusyAction(`bookmark-${postId}`);
    setFeedback(null);
    try {
      const result = await api.forum.bookmark(postId);
      setPosts((current) =>
        current.map((post) =>
          post.id === postId
            ? { ...post, isBookmarked: result.isBookmarked }
            : post
        )
      );
      setSelectedPost((current) =>
        current?.id === postId
          ? { ...current, isBookmarked: result.isBookmarked }
          : current
      );
      setFeedback({
        kind: 'success',
        message: result.isBookmarked
          ? 'Discussion saved to your bookmarks.'
          : 'Discussion removed from your bookmarks.'
      });
      if (feedMode === 'bookmarks' && !result.isBookmarked) {
        void loadFeed();
      }
    } catch (error) {
      setFeedback({
        kind: 'error',
        message: getErrorMessage(error, 'The bookmark could not be updated.')
      });
    } finally {
      setBusyAction(null);
    }
  }

  async function submitReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPost || !replyText.trim()) {
      return;
    }
    setBusyAction('create-reply');
    setFeedback(null);
    try {
      if (replyingTo) {
        await api.request<ForumReply>(
          `/forum/posts/${selectedPost.id}/replies`,
          {
            method: 'POST',
            body: JSON.stringify({
              content: replyText.trim(),
              parentReplyId: replyingTo.id
            })
          }
        );
      } else {
        await api.forum.createReply(selectedPost.id, replyText.trim());
      }
      setReplyText('');
      setReplyingTo(null);
      await loadDetail(selectedPost.id);
      setFeedback({ kind: 'success', message: 'Your reply was posted.' });
    } catch (error) {
      setFeedback({
        kind: 'error',
        message: getErrorMessage(error, 'Your reply could not be posted.')
      });
    } finally {
      setBusyAction(null);
    }
  }

  async function acceptSolution(replyId: string) {
    if (!selectedPost) {
      return;
    }
    setBusyAction(`accept-${replyId}`);
    setFeedback(null);
    try {
      await api.forum.acceptSolution(selectedPost.id, replyId);
      await Promise.all([loadDetail(selectedPost.id), loadFeed()]);
      setFeedback({
        kind: 'success',
        message: 'The reply is now the accepted solution.'
      });
    } catch (error) {
      setFeedback({
        kind: 'error',
        message: getErrorMessage(error, 'The solution could not be accepted.')
      });
    } finally {
      setBusyAction(null);
    }
  }

  function updateCreateField<Key extends keyof CreatePostForm>(
    key: Key,
    value: CreatePostForm[Key]
  ) {
    setCreateForm((current) => ({ ...current, [key]: value }));
  }

  function startPost(prefill?: Partial<CreatePostForm>) {
    setCreateForm({ ...emptyCreateForm, ...prefill });
    setCreateError(null);
    setCreateOpen(true);
  }

  function askMentor(mentor: Member) {
    startPost({
      postType: 'question',
      title: `Guidance request for ${mentor.name}: `,
      tags: mentor.mentorExpertise.slice(0, 3).join(', ')
    });
  }

  async function submitNewPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError(null);
    const title = createForm.title.trim();
    let content = createForm.content.trim();
    let structuredIdea:
      | {
          problemStatement: string;
          proposedSolution: string;
          expectedImpact?: string;
          techStack: string[];
        }
      | undefined;
    const tagNames = createForm.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 8);

    if (createForm.postType === 'idea') {
      if (
        !createForm.problemStatement.trim() ||
        !createForm.proposedSolution.trim()
      ) {
        setCreateError(
          'Add both a problem statement and a proposed solution for an idea.'
        );
        return;
      }
      structuredIdea = {
        problemStatement: createForm.problemStatement.trim(),
        proposedSolution: createForm.proposedSolution.trim(),
        expectedImpact: createForm.expectedImpact.trim() || undefined,
        techStack: tagNames
      };
      content = [
        `Problem statement\n${structuredIdea.problemStatement}`,
        `Proposed solution\n${structuredIdea.proposedSolution}`,
        `Expected impact\n${structuredIdea.expectedImpact || 'To be explored with the community.'}`
      ].join('\n\n');
    }

    if (title.length < 8 || title.length > 180) {
      setCreateError('Use a title between 8 and 180 characters.');
      return;
    }
    if (content.length < 10) {
      setCreateError('Add at least 10 characters of discussion context.');
      return;
    }

    setCreateSubmitting(true);
    try {
      const created = await api.forum.createPost({
        postType: createForm.postType,
        title,
        content,
        communityId: createForm.communityId || undefined,
        tagNames,
        linkedProjectId: createForm.linkedProjectId || undefined,
        linkedEventId: createForm.linkedEventId || undefined,
        structuredIdea
      });
      setCreateOpen(false);
      setCreateForm(emptyCreateForm);
      await loadFeed();
      setFeedback({
        kind: 'success',
        message: 'Your discussion was published.'
      });
      openPost(created.id);
    } catch (error) {
      setCreateError(
        getErrorMessage(error, 'The discussion could not be published.')
      );
    } finally {
      setCreateSubmitting(false);
    }
  }

  function beginExport(post: ForumPost) {
    setExportPost(post);
    setExportProblem(post.title);
    setExportSolution(post.content.slice(0, 500));
    setExportError(null);
  }

  async function submitExport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!exportPost) {
      return;
    }
    if (!exportProblem.trim() || !exportSolution.trim()) {
      setExportError(
        'Add both a problem statement and a proposed solution.'
      );
      return;
    }
    setExportSubmitting(true);
    setExportError(null);
    try {
      await api.forum.exportIdea(exportPost.id, {
        problemStatement: exportProblem.trim(),
        proposedSolution: exportSolution.trim()
      });
      const exportedId = exportPost.id;
      setExportPost(null);
      await loadFeed();
      if (selectedPost?.id === exportedId) {
        await loadDetail(exportedId);
      }
      setFeedback({
        kind: 'success',
        message: 'The discussion was exported to Idea Centre.'
      });
    } catch (error) {
      setExportError(
        getErrorMessage(error, 'The Idea Centre export could not be completed.')
      );
    } finally {
      setExportSubmitting(false);
    }
  }

  function beginReport(target: ReportTarget) {
    setReportTarget(target);
    setReportReason('spam');
    setReportNotes('');
    setReportError(null);
  }

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reportTarget) {
      return;
    }
    setReportSubmitting(true);
    setReportError(null);
    try {
      await api.request<{ reportId: string }>('/forum/reports', {
        method: 'POST',
        body: JSON.stringify({
          targetType: reportTarget.type,
          targetId: reportTarget.id,
          reason: reportReason,
          notes: reportNotes.trim() || undefined
        })
      });
      setReportTarget(null);
      setFeedback({
        kind: 'success',
        message: 'The report was sent to Forum moderators.'
      });
    } catch (error) {
      setReportError(
        getErrorMessage(error, 'The report could not be submitted.')
      );
    } finally {
      setReportSubmitting(false);
    }
  }

  async function resolveReport(reportId: string, action: 'resolve' | 'dismiss') {
    setBusyAction(`report-${reportId}`);
    setFeedback(null);
    try {
      await api.request(`/forum/moderation/reports/${reportId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          action,
          resolutionNotes: 'Reviewed in the portal moderation queue.'
        })
      });
      await loadReports();
      setFeedback({
        kind: 'success',
        message:
          action === 'dismiss'
            ? 'The report was dismissed.'
            : 'The report was resolved.'
      });
    } catch (error) {
      setFeedback({
        kind: 'error',
        message: getErrorMessage(error, 'The report could not be updated.')
      });
    } finally {
      setBusyAction(null);
    }
  }

  const filteredMentors = useMemo(() => {
    const normalized = mentorSearch.trim().toLowerCase();
    if (!normalized) {
      return mentors;
    }
    return mentors.filter(
      (mentor) =>
        mentor.name.toLowerCase().includes(normalized) ||
        mentor.department.toLowerCase().includes(normalized) ||
        mentor.mentorExpertise.some((item) =>
          item.toLowerCase().includes(normalized)
        )
    );
  }, [mentorSearch, mentors]);

  const activeFilterCount = [
    search,
    sort !== 'newest',
    status,
    feedMode !== 'all',
    communityFilter,
    tagFilter
  ].filter(Boolean).length;

  function renderFeed() {
    return (
      <>
        <ContentCard
          title="Discussion feed"
          description="Search the knowledge base, follow active threads, or narrow the feed by status."
        >
          <div className={styles.filterPanel}>
            <form
              role="search"
              className={styles.searchRow}
              onSubmit={submitSearch}
            >
              <Field label="Search discussions">
                <Input
                  type="search"
                  value={searchDraft}
                  onChange={(_, data) => setSearchDraft(data.value)}
                  placeholder="Search titles, content, or tags"
                />
              </Field>
              <Button
                className={styles.touchButton}
                appearance="primary"
                type="submit"
              >
                Search
              </Button>
            </form>
            <div className={styles.filters}>
              <Field label="Sort">
                <Select
                  aria-label="Sort discussions"
                  value={sort}
                  onChange={(event) =>
                    setSort(event.target.value as FeedSort)
                  }
                >
                  <option value="newest">Newest</option>
                  <option value="trending">Trending</option>
                  <option value="unanswered">Unanswered</option>
                </Select>
              </Field>
              <Field label="Status">
                <Select
                  aria-label="Filter discussions by status"
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as PostStatusFilter)
                  }
                >
                  <option value="">All statuses</option>
                  <option value="open">Open</option>
                  <option value="solved">Solved</option>
                  <option value="closed">Closed</option>
                  <option value="archived">Archived</option>
                  <option value="under_review">Under review</option>
                </Select>
              </Field>
              <div className={styles.feedModes} aria-label="Feed scope">
                {(['all', 'following', 'bookmarks'] as const).map((mode) => (
                  <Button
                    key={mode}
                    appearance={feedMode === mode ? 'primary' : 'subtle'}
                    aria-pressed={feedMode === mode}
                    onClick={() => setFeedMode(mode)}
                  >
                    {mode === 'all'
                      ? 'All'
                      : mode === 'following'
                        ? 'Following'
                        : 'Saved'}
                  </Button>
                ))}
                {activeFilterCount ? (
                  <Button appearance="subtle" onClick={clearFilters}>
                    Clear filters ({activeFilterCount})
                  </Button>
                ) : null}
              </div>
            </div>
            {communityFilter || tagFilter ? (
              <Text role="status">
                Showing{' '}
                {communityFilter
                  ? `community: ${
                      communities.find(
                        (community) => community.slug === communityFilter
                      )?.name || communityFilter
                    }`
                  : `tag: #${tagFilter}`}
              </Text>
            ) : null}
          </div>
        </ContentCard>

        <div className={styles.contentLayout}>
          <section className={styles.stream} aria-live="polite">
            {feedLoading ? (
              <StatePanel
                state="loading"
                message="Loading Forum discussions"
              />
            ) : feedError ? (
              <StatePanel
                state="error"
                title="Discussions are unavailable"
                message={feedError}
                onRetry={() => void loadFeed()}
              />
            ) : posts.length === 0 ? (
              <StatePanel
                state="empty"
                title="No discussions match these filters"
                message="Try clearing a filter or start a new discussion."
                onRetry={clearFilters}
              />
            ) : (
              posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUser={currentUser}
                  busyAction={busyAction}
                  onOpen={openPost}
                  onVote={(targetType, targetId, value) =>
                    void handleVote(targetType, targetId, value)
                  }
                  onBookmark={(postId) => void handleBookmark(postId)}
                  onTag={filterByTag}
                  onExport={beginExport}
                />
              ))
            )}
          </section>

          <aside className={styles.sidebar} aria-label="Forum discovery">
            <ContentCard
              title="Communities"
              description="Browse campus groups and topic guilds."
            >
              {supportLoading && communities.length === 0 ? (
                <Spinner size="small" label="Loading communities" />
              ) : (
                <div className={styles.sidebarList}>
                  {communities.slice(0, 5).map((community) => (
                    <Button
                      key={community.id}
                      appearance="subtle"
                      className={styles.sidebarItem}
                      onClick={() => filterByCommunity(community.slug)}
                    >
                      <Text weight="semibold">{community.name}</Text>
                      <Text size={200}>{community.description}</Text>
                    </Button>
                  ))}
                  <Button appearance="secondary" onClick={openCommunities}>
                    View all communities
                  </Button>
                </div>
              )}
            </ContentCard>

            <ContentCard
              title="Popular tags"
              description="Jump to an active topic."
            >
              {supportLoading && tags.length === 0 ? (
                <Spinner size="small" label="Loading tags" />
              ) : tags.length ? (
                <div className={styles.tags}>
                  {tags.slice(0, 8).map((tag) => (
                    <Button
                      key={tag.id}
                      size="small"
                      appearance="subtle"
                      onClick={() => filterByTag(tag.slug)}
                    >
                      #{tag.name} ({tag.postCount})
                    </Button>
                  ))}
                </div>
              ) : (
                <Text>No tags are available yet.</Text>
              )}
            </ContentCard>
          </aside>
        </div>
      </>
    );
  }

  function renderDetail() {
    if (detailLoading) {
      return (
        <StatePanel
          state="loading"
          message="Loading discussion and replies"
        />
      );
    }
    if (detailError || !selectedPost) {
      return (
        <StatePanel
          state="error"
          title="Discussion unavailable"
          message={detailError || 'The discussion could not be found.'}
          onRetry={
            selectedPostId
              ? () => void loadDetail(selectedPostId)
              : showFeed
          }
        />
      );
    }

    const post = selectedPost;
    return (
      <div className={styles.detail}>
        <Button appearance="subtle" onClick={showFeed}>
          Back to discussion feed
        </Button>
        <Card className={styles.postCard}>
          <div className={styles.detailHeader}>
            <div className={styles.stream}>
              <div className={styles.postTop}>
                <Badge appearance="tint">{formatLabel(post.postType)}</Badge>
                <Badge color={statusColor(post.status)}>
                  {formatLabel(post.status)}
                </Badge>
                <AuthorSummary post={post} />
                <Text size={200} className={styles.hint}>
                  {formatDate(post.createdAt)}
                </Text>
              </div>
              <h2 className={styles.detailTitle}>{post.title}</h2>
            </div>
            <Button
              appearance="subtle"
              onClick={() => beginReport({ type: 'post', id: post.id })}
            >
              Report discussion
            </Button>
          </div>

          {post.linkedProject ? (
            <div className={styles.contextPanel}>
              <Text size={200} weight="semibold">
                Linked project
              </Text>
              <Text weight="semibold">{post.linkedProject.name}</Text>
              <Text>{post.linkedProject.tagline}</Text>
            </div>
          ) : null}
          {post.linkedEvent ? (
            <div className={styles.contextPanel}>
              <Text size={200} weight="semibold">
                Linked event
              </Text>
              <Text weight="semibold">{post.linkedEvent.title}</Text>
              <Text>
                {formatDate(post.linkedEvent.startDate)} –{' '}
                {formatDate(post.linkedEvent.endDate)}
              </Text>
            </div>
          ) : null}

          <Text className={styles.body}>{post.content}</Text>

          {post.tags.length ? (
            <div className={styles.tags} aria-label="Discussion tags">
              {post.tags.map((tag) => (
                <Button
                  key={tag.id}
                  size="small"
                  appearance="subtle"
                  onClick={() => filterByTag(tag.slug)}
                >
                  #{tag.name}
                </Button>
              ))}
            </div>
          ) : null}

          <Divider />
          <div className={styles.actions}>
            <div className={styles.actionGroup}>
              <VoteControls
                targetType="post"
                targetId={post.id}
                score={post.voteScore}
                userVote={post.userVote}
                disabled={busyAction === `vote-post-${post.id}`}
                onVote={(targetType, targetId, value) =>
                  void handleVote(targetType, targetId, value)
                }
              />
              <Button
                appearance={post.isBookmarked ? 'primary' : 'subtle'}
                aria-pressed={Boolean(post.isBookmarked)}
                disabled={busyAction === `bookmark-${post.id}`}
                onClick={() => void handleBookmark(post.id)}
              >
                {post.isBookmarked ? 'Saved' : 'Save discussion'}
              </Button>
            </div>
            {post.ideaExport ? (
              <Badge color="success">
                Exported to Idea Centre as {post.ideaExport.ideaId}
              </Badge>
            ) : canExportPost(currentUser, post) ? (
              <Button appearance="secondary" onClick={() => beginExport(post)}>
                Export to Idea Centre
              </Button>
            ) : (
              <Text size={200} className={styles.hint}>
                Authors, mentors, and moderators can export eligible discussions.
              </Text>
            )}
          </div>
        </Card>

        {post.acceptedReply ? (
          <Card className={mergeClasses(styles.postCard, styles.accepted)}>
            <div className={styles.sectionHeader}>
              <Text size={500} weight="semibold">
                Accepted solution
              </Text>
              <Badge color="success">Solved</Badge>
            </div>
            <div className={styles.postTop}>
              <Avatar
                size={24}
                name={post.acceptedReply.author?.name || 'Forum member'}
                image={
                  post.acceptedReply.author?.avatarUrl
                    ? { src: post.acceptedReply.author.avatarUrl }
                    : undefined
                }
              />
              <Text weight="semibold">
                {post.acceptedReply.author?.name || 'Forum member'}
              </Text>
            </div>
            <Text className={styles.body}>{post.acceptedReply.content}</Text>
          </Card>
        ) : null}

        <section className={styles.replies} aria-labelledby="forum-replies-title">
          <div className={styles.sectionHeader}>
            <Text id="forum-replies-title" size={500} weight="semibold">
              Replies ({post.replyCount})
            </Text>
          </div>
          <Card className={styles.postCard}>
            <form className={styles.composer} onSubmit={submitReply}>
              <Field
                label={
                  replyingTo
                    ? `Reply to ${replyingTo.author?.name || 'Forum member'}`
                    : 'Add a reply'
                }
                hint="Share context, reasoning, or a constructive solution."
              >
                <Textarea
                  aria-label={
                    replyingTo
                      ? `Reply to ${replyingTo.author?.name || 'Forum member'}`
                      : 'Add a reply'
                  }
                  rows={4}
                  required
                  value={replyText}
                  onChange={(_, data) => setReplyText(data.value)}
                />
              </Field>
              <div className={styles.actionGroup}>
                <Button
                  type="submit"
                  appearance="primary"
                  disabled={
                    busyAction === 'create-reply' || !replyText.trim()
                  }
                >
                  {busyAction === 'create-reply'
                    ? 'Posting reply…'
                    : 'Post reply'}
                </Button>
                {replyingTo ? (
                  <Button
                    type="button"
                    appearance="subtle"
                    onClick={() => setReplyingTo(null)}
                  >
                    Cancel nested reply
                  </Button>
                ) : null}
              </div>
            </form>
          </Card>
          {replies.length === 0 ? (
            <StatePanel
              state="empty"
              title="No replies yet"
              message="Be the first person to offer context or a solution."
            />
          ) : (
            <ReplyTree
              replies={replies}
              post={post}
              currentUser={currentUser}
              busyAction={busyAction}
              onVote={(targetType, targetId, value) =>
                void handleVote(targetType, targetId, value)
              }
              onReply={(reply) => {
                setReplyingTo(reply);
                setReplyText('');
              }}
              onAccept={(replyId) => void acceptSolution(replyId)}
              onReport={beginReport}
            />
          )}
        </section>
      </div>
    );
  }

  function renderCommunities() {
    if (supportLoading && communities.length === 0) {
      return (
        <StatePanel state="loading" message="Loading Forum communities" />
      );
    }
    if (supportError && communities.length === 0) {
      return (
        <StatePanel
          state="error"
          title="Communities are unavailable"
          message={supportError}
          onRetry={() => void loadSupportData()}
        />
      );
    }
    if (communities.length === 0) {
      return (
        <StatePanel
          state="empty"
          title="No communities yet"
          message="Campus communities will appear here once available."
        />
      );
    }
    return (
      <section className={styles.stream} aria-labelledby="communities-title">
        <div>
          <Text id="communities-title" size={600} weight="semibold">
            Communities and guilds
          </Text>
          <Text block className={styles.hint}>
            Discover groups for campus technology, research, and collaboration.
          </Text>
        </div>
        <div className={styles.cards}>
          {communities.map((community) => (
            <Card key={community.id} className={styles.discoveryCard}>
              <Text size={500} weight="semibold">
                {community.name}
              </Text>
              <Text>{community.description}</Text>
              <Button
                appearance="secondary"
                onClick={() => filterByCommunity(community.slug)}
              >
                View community feed
              </Button>
            </Card>
          ))}
        </div>
      </section>
    );
  }

  function renderMentors() {
    if (supportLoading && mentors.length === 0) {
      return <StatePanel state="loading" message="Loading Forum mentors" />;
    }
    if (supportError && mentors.length === 0) {
      return (
        <StatePanel
          state="error"
          title="Mentors are unavailable"
          message={supportError}
          onRetry={() => void loadSupportData()}
        />
      );
    }
    return (
      <section className={styles.stream} aria-labelledby="mentors-title">
        <div>
          <Text id="mentors-title" size={600} weight="semibold">
            Mentor discovery
          </Text>
          <Text block className={styles.hint}>
            Find faculty and peer mentors by name, department, or expertise.
          </Text>
        </div>
        <Field label="Search mentors" className={styles.mentorSearch}>
          <Input
            type="search"
            value={mentorSearch}
            onChange={(_, data) => setMentorSearch(data.value)}
          />
        </Field>
        {filteredMentors.length === 0 ? (
          <StatePanel
            state="empty"
            title="No mentors match your search"
            message="Try another name, department, or skill."
            onRetry={() => setMentorSearch('')}
          />
        ) : (
          <div className={styles.cards}>
            {filteredMentors.map((mentor) => (
              <Card key={mentor.id} className={styles.discoveryCard}>
                <div className={styles.discoveryHeader}>
                  <Avatar
                    size={48}
                    name={mentor.name}
                    image={
                      mentor.avatarUrl ? { src: mentor.avatarUrl } : undefined
                    }
                  />
                  <div>
                    <Text block size={500} weight="semibold">
                      {mentor.name}
                    </Text>
                    <Text block size={300} className={styles.hint}>
                      {mentor.department}
                    </Text>
                  </div>
                </div>
                <Text>{mentor.bio}</Text>
                <div className={styles.tags}>
                  {mentor.mentorExpertise.map((expertise) => (
                    <Badge key={expertise} appearance="tint">
                      {expertise}
                    </Badge>
                  ))}
                </div>
                <Button appearance="primary" onClick={() => askMentor(mentor)}>
                  Start a question for {mentor.name}
                </Button>
              </Card>
            ))}
          </div>
        )}
      </section>
    );
  }

  function renderModeration() {
    if (!isForumModerator(currentUser)) {
      return (
        <StatePanel
          state="error"
          title="Moderator access required"
          message="The backend restricts this queue to community moderators and administrators."
          onRetry={showFeed}
        />
      );
    }
    if (reportsLoading) {
      return <StatePanel state="loading" message="Loading moderation reports" />;
    }
    if (reportsError) {
      return (
        <StatePanel
          state="error"
          title="Moderation queue unavailable"
          message={reportsError}
          onRetry={() => void loadReports()}
        />
      );
    }
    if (reports.length === 0) {
      return (
        <StatePanel
          state="empty"
          title="The moderation queue is clear"
          message="There are no unresolved Forum reports."
          onRetry={() => void loadReports()}
        />
      );
    }
    return (
      <section className={styles.stream} aria-labelledby="moderation-title">
        <div>
          <Text id="moderation-title" size={600} weight="semibold">
            Community moderation
          </Text>
          <Text block className={styles.hint}>
            Review reports. The backend remains authoritative for every action.
          </Text>
        </div>
        {reports.map((report) => (
          <Card key={report.id} className={styles.moderationItem}>
            <div className={styles.actions}>
              <div className={styles.postTop}>
                <Badge color="warning">{formatLabel(report.reason)}</Badge>
                <Badge>{formatLabel(report.targetType)}</Badge>
                <Badge appearance="outline">
                  {formatLabel(report.status)}
                </Badge>
              </div>
              <Text size={200}>{formatDate(report.createdAt)}</Text>
            </div>
            {report.targetContent ? (
              <Text className={styles.body}>
                {report.targetContent.title ||
                  report.targetContent.content ||
                  'Reported content'}
              </Text>
            ) : null}
            <Text>
              <strong>Reporter notes:</strong>{' '}
              {report.notes || 'No additional context provided.'}
            </Text>
            <div className={styles.actionGroup}>
              <Button
                appearance="primary"
                disabled={busyAction === `report-${report.id}`}
                onClick={() => void resolveReport(report.id, 'resolve')}
              >
                Resolve report
              </Button>
              <Button
                appearance="secondary"
                disabled={busyAction === `report-${report.id}`}
                onClick={() => void resolveReport(report.id, 'dismiss')}
              >
                Dismiss
              </Button>
            </div>
          </Card>
        ))}
      </section>
    );
  }

  return (
    <ServicePage
      area="forum"
      title="Explore, ask, and solve together"
      description="A campus knowledge space for technical questions, project and event conversations, mentor guidance, and ideas worth developing."
      actions={
        <Button
          appearance="primary"
          className={styles.touchButton}
          onClick={() => startPost()}
        >
          Start a discussion
        </Button>
      }
    >
      <nav className={styles.navigation} aria-label="Forum sections">
        <Button
          appearance={view === 'feed' || view === 'detail' ? 'primary' : 'subtle'}
          aria-current={
            view === 'feed' || view === 'detail' ? 'page' : undefined
          }
          onClick={showFeed}
        >
          Discussions
        </Button>
        <Button
          appearance={view === 'communities' ? 'primary' : 'subtle'}
          aria-current={view === 'communities' ? 'page' : undefined}
          onClick={openCommunities}
        >
          Communities
        </Button>
        <Button
          appearance={view === 'mentors' ? 'primary' : 'subtle'}
          aria-current={view === 'mentors' ? 'page' : undefined}
          onClick={openMentors}
        >
          Mentors
        </Button>
        {isForumModerator(currentUser) ? (
          <Button
            appearance={view === 'moderation' ? 'primary' : 'subtle'}
            aria-current={view === 'moderation' ? 'page' : undefined}
            onClick={openModeration}
          >
            Moderation
          </Button>
        ) : null}
      </nav>

      {supportError ? (
        <div className={styles.feedback} role="status">
          <Text>{supportError}</Text>
          <Button appearance="subtle" onClick={() => void loadSupportData()}>
            Retry discovery data
          </Button>
        </div>
      ) : null}

      {feedback ? (
        <div
          className={mergeClasses(
            styles.feedback,
            feedback.kind === 'error' ? styles.errorFeedback : undefined
          )}
          role={feedback.kind === 'error' ? 'alert' : 'status'}
        >
          <Text>{feedback.message}</Text>
          <Button appearance="subtle" onClick={() => setFeedback(null)}>
            Dismiss
          </Button>
        </div>
      ) : null}

      {view === 'feed'
        ? renderFeed()
        : view === 'detail'
          ? renderDetail()
          : view === 'communities'
            ? renderCommunities()
            : view === 'mentors'
              ? renderMentors()
              : renderModeration()}

      <Dialog
        open={createOpen}
        onOpenChange={(_, data) => {
          if (!createSubmitting) {
            setCreateOpen(data.open);
          }
        }}
      >
        <DialogSurface aria-describedby="create-post-description">
          <form onSubmit={submitNewPost}>
            <DialogBody>
              <DialogTitle>Start a Forum discussion</DialogTitle>
              <DialogContent className={styles.dialogContent}>
                <Text id="create-post-description">
                  Add clear context so the campus community can respond
                  constructively.
                </Text>
                {createError ? (
                  <Text role="alert" className={styles.errorFeedback}>
                    {createError}
                  </Text>
                ) : null}
                <div className={styles.formGrid}>
                  <Field label="Discussion type" required>
                    <Select
                      value={createForm.postType}
                      onChange={(event) =>
                        updateCreateField(
                          'postType',
                          event.target.value as ForumPost['postType']
                        )
                      }
                    >
                      {postTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                      {currentUser &&
                      ['Mentor', 'Admin', 'Community Moderator'].includes(
                        currentUser.role
                      ) ? (
                        <option value="announcement">Announcement</option>
                      ) : null}
                    </Select>
                  </Field>
                  <Field label="Community">
                    <Select
                      value={createForm.communityId}
                      onChange={(event) =>
                        updateCreateField('communityId', event.target.value)
                      }
                    >
                      <option value="">General campus Forum</option>
                      {communities.map((community) => (
                        <option key={community.id} value={community.id}>
                          {community.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Title" required className={styles.fullSpan}>
                    <Input
                      value={createForm.title}
                      minLength={8}
                      maxLength={180}
                      required
                      onChange={(_, data) =>
                        updateCreateField('title', data.value)
                      }
                      placeholder="State the question, challenge, or topic clearly"
                    />
                  </Field>
                  {createForm.postType === 'idea' ? (
                    <>
                      <Field
                        label="Problem statement"
                        required
                        className={styles.fullSpan}
                      >
                        <Textarea
                          rows={3}
                          required
                          value={createForm.problemStatement}
                          onChange={(_, data) =>
                            updateCreateField('problemStatement', data.value)
                          }
                        />
                      </Field>
                      <Field
                        label="Proposed solution"
                        required
                        className={styles.fullSpan}
                      >
                        <Textarea
                          rows={4}
                          required
                          value={createForm.proposedSolution}
                          onChange={(_, data) =>
                            updateCreateField('proposedSolution', data.value)
                          }
                        />
                      </Field>
                      <Field
                        label="Expected impact"
                        className={styles.fullSpan}
                      >
                        <Input
                          value={createForm.expectedImpact}
                          onChange={(_, data) =>
                            updateCreateField('expectedImpact', data.value)
                          }
                        />
                      </Field>
                    </>
                  ) : (
                    <Field
                      label="Discussion context"
                      required
                      className={styles.fullSpan}
                    >
                      <Textarea
                        rows={6}
                        minLength={10}
                        required
                        value={createForm.content}
                        onChange={(_, data) =>
                          updateCreateField('content', data.value)
                        }
                        placeholder="Include background, expected behavior, constraints, or work already tried."
                      />
                    </Field>
                  )}
                  <Field label="Link to a Project">
                    <Select
                      value={createForm.linkedProjectId}
                      onChange={(event) =>
                        updateCreateField(
                          'linkedProjectId',
                          event.target.value
                        )
                      }
                    >
                      <option value="">No linked project</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Link to an Event">
                    <Select
                      value={createForm.linkedEventId}
                      onChange={(event) =>
                        updateCreateField(
                          'linkedEventId',
                          event.target.value
                        )
                      }
                    >
                      <option value="">No linked event</option>
                      {events.map((event) => (
                        <option key={event.id} value={event.id}>
                          {event.title}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field
                    label="Tags"
                    hint="Comma-separated, up to eight tags."
                    className={styles.fullSpan}
                  >
                    <Input
                      value={createForm.tags}
                      onChange={(_, data) =>
                        updateCreateField('tags', data.value)
                      }
                      placeholder="React, robotics, accessibility"
                    />
                  </Field>
                </div>
              </DialogContent>
              <DialogActions>
                <Button
                  type="button"
                  appearance="secondary"
                  disabled={createSubmitting}
                  onClick={() => setCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  appearance="primary"
                  disabled={createSubmitting}
                >
                  {createSubmitting ? 'Publishing…' : 'Publish discussion'}
                </Button>
              </DialogActions>
            </DialogBody>
          </form>
        </DialogSurface>
      </Dialog>

      <Dialog
        open={Boolean(exportPost)}
        onOpenChange={(_, data) => {
          if (!data.open && !exportSubmitting) {
            setExportPost(null);
          }
        }}
      >
        <DialogSurface aria-describedby="export-idea-description">
          <form onSubmit={submitExport}>
            <DialogBody>
              <DialogTitle>Export to Idea Centre</DialogTitle>
              <DialogContent className={styles.dialogContent}>
                <Text id="export-idea-description">
                  Promote this discussion into an Idea Centre entry. A post can
                  be exported only once.
                </Text>
                {exportPost ? (
                  <Text weight="semibold">{exportPost.title}</Text>
                ) : null}
                {exportError ? (
                  <Text role="alert" className={styles.errorFeedback}>
                    {exportError}
                  </Text>
                ) : null}
                <Field label="Problem statement" required>
                  <Textarea
                    rows={3}
                    required
                    value={exportProblem}
                    onChange={(_, data) => setExportProblem(data.value)}
                  />
                </Field>
                <Field label="Proposed solution" required>
                  <Textarea
                    rows={5}
                    required
                    value={exportSolution}
                    onChange={(_, data) => setExportSolution(data.value)}
                  />
                </Field>
              </DialogContent>
              <DialogActions>
                <Button
                  type="button"
                  appearance="secondary"
                  disabled={exportSubmitting}
                  onClick={() => setExportPost(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  appearance="primary"
                  disabled={exportSubmitting}
                >
                  {exportSubmitting
                    ? 'Exporting…'
                    : 'Confirm Idea Centre export'}
                </Button>
              </DialogActions>
            </DialogBody>
          </form>
        </DialogSurface>
      </Dialog>

      <Dialog
        open={Boolean(reportTarget)}
        onOpenChange={(_, data) => {
          if (!data.open && !reportSubmitting) {
            setReportTarget(null);
          }
        }}
      >
        <DialogSurface aria-describedby="report-content-description">
          <form onSubmit={submitReport}>
            <DialogBody>
              <DialogTitle>Report Forum content</DialogTitle>
              <DialogContent className={styles.dialogContent}>
                <Text id="report-content-description">
                  Tell moderators why this content may violate community
                  guidelines.
                </Text>
                {reportError ? (
                  <Text role="alert" className={styles.errorFeedback}>
                    {reportError}
                  </Text>
                ) : null}
                <Field label="Reason" required>
                  <Select
                    value={reportReason}
                    onChange={(event) => setReportReason(event.target.value)}
                  >
                    <option value="spam">Spam</option>
                    <option value="harassment">Harassment</option>
                    <option value="offensive_content">
                      Offensive content
                    </option>
                    <option value="misleading_information">
                      Misleading information
                    </option>
                    <option value="inappropriate_content">
                      Inappropriate content
                    </option>
                    <option value="other">Other</option>
                  </Select>
                </Field>
                <Field label="Additional context">
                  <Textarea
                    rows={4}
                    value={reportNotes}
                    onChange={(_, data) => setReportNotes(data.value)}
                  />
                </Field>
              </DialogContent>
              <DialogActions>
                <Button
                  type="button"
                  appearance="secondary"
                  disabled={reportSubmitting}
                  onClick={() => setReportTarget(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  appearance="primary"
                  disabled={reportSubmitting}
                >
                  {reportSubmitting ? 'Submitting…' : 'Submit report'}
                </Button>
              </DialogActions>
            </DialogBody>
          </form>
        </DialogSurface>
      </Dialog>
    </ServicePage>
  );
}
