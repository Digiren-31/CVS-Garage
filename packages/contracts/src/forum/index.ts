/**
 * CVS Garage — Shared Forum Contracts & DTOs
 * Used across Central Backend, Forum Service, and Portal Integrations
 */

export type PostType =
  | 'question'
  | 'problem'
  | 'doubt'
  | 'discussion'
  | 'idea'
  | 'announcement'
  | 'project_discussion'
  | 'event_discussion';

export type PostStatus = 'open' | 'solved' | 'closed' | 'archived' | 'under_review';

export type CommunityType =
  | 'public'
  | 'private'
  | 'project_linked'
  | 'event_linked'
  | 'batch_based'
  | 'topic_based';

export type UserRole =
  | 'Student'
  | 'Mentor'
  | 'Community Moderator'
  | 'Admin'
  | 'Organisation'
  | 'Judge';

export type TargetType = 'post' | 'reply' | 'user' | 'topic' | 'community';

export type VoteValue = -1 | 0 | 1;

export type IdeaExportStatus =
  | 'created'
  | 'in_review'
  | 'in_progress'
  | 'converted_to_project'
  | 'completed'
  | 'rejected';

export type ContributionType = 'post' | 'reply' | 'accepted_answer' | 'upvote_received';

// ==========================================
// Entities & Summaries
// ==========================================

export interface MemberSummary {
  id: string;
  name: string;
  avatarUrl?: string;
  department: string;
  batch?: string;
  role: UserRole;
  isMentor: boolean;
  mentorExpertise?: string[];
  reputationScore?: number;
}

export interface TagSummary {
  id: string;
  name: string;
  slug: string;
  description?: string;
  postCount: number;
}

export interface CategorySummary {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  isRestricted: boolean;
}

export interface CommunitySummary {
  id: string;
  name: string;
  slug: string;
  description: string;
  iconUrl?: string;
  bannerUrl?: string;
  category: string;
  type: CommunityType;
  linkedProjectId?: string;
  linkedEventId?: string;
  memberCount: number;
  postCount: number;
  isMember?: boolean;
}

export interface ProjectReference {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  status: string;
}

export interface EventReference {
  id: string;
  title: string;
  slug: string;
  type: string;
  startDate: string;
  endDate: string;
}

export interface IdeaCentreExportRef {
  id: string;
  postId: string;
  ideaId: string;
  status: IdeaExportStatus;
  ideaUrl: string;
  exportedAt: string;
}

export interface ForumReply {
  id: string;
  postId: string;
  parentReplyId?: string | null;
  authorId: string;
  author?: MemberSummary;
  content: string;
  voteScore: number;
  upvotesCount: number;
  downvotesCount: number;
  userVote?: VoteValue;
  isAcceptedSolution: boolean;
  createdAt: string;
  updatedAt: string;
  children?: ForumReply[];
}

export interface ForumPost {
  id: string;
  postType: PostType;
  title: string;
  content: string;
  authorId: string;
  author?: MemberSummary;
  categoryId?: string;
  category?: CategorySummary;
  communityId?: string;
  community?: CommunitySummary;
  status: PostStatus;
  voteScore: number;
  upvotesCount: number;
  downvotesCount: number;
  userVote?: VoteValue;
  replyCount: number;
  viewCount: number;
  isBookmarked?: boolean;
  acceptedReplyId?: string | null;
  acceptedReply?: ForumReply | null;
  tags: TagSummary[];
  linkedProjectId?: string | null;
  linkedProject?: ProjectReference | null;
  linkedEventId?: string | null;
  linkedEvent?: EventReference | null;
  ideaExport?: IdeaCentreExportRef | null;
  isPinned: boolean;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// DTOs & Request Payloads
// ==========================================

export interface CreatePostPayload {
  postType: PostType;
  title: string;
  content: string;
  categoryId?: string;
  communityId?: string;
  tagNames: string[];
  linkedProjectId?: string | null;
  linkedEventId?: string | null;
  structuredIdea?: {
    problemStatement: string;
    proposedSolution: string;
    expectedImpact?: string;
    techStack?: string[];
  };
}

export interface CreateReplyPayload {
  content: string;
  parentReplyId?: string | null;
}

export interface CastVotePayload {
  targetType: 'post' | 'reply';
  targetId: string;
  value: VoteValue;
}

export interface ExportToIdeaPayload {
  sourceForumPostId: string;
  notes?: string;
}

export interface CreateReportPayload {
  targetType: 'post' | 'reply' | 'user';
  targetId: string;
  reason: 'spam' | 'harassment' | 'offensive_content' | 'misleading_information' | 'inappropriate_content' | 'other';
  notes?: string;
}

// ==========================================
// Standard API Envelope
// ==========================================

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  } | null;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
    timestamp: string;
  };
}
