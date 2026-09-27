export interface ApiMeta {
  timestamp: string;
  total?: number;
  page?: number;
  limit?: number;
  hasMore?: boolean;
}

export interface ApiErrorShape {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: ApiErrorShape | null;
  meta: ApiMeta;
}

export type UserRole = 'Student' | 'Mentor' | 'Community Moderator' | 'Admin' | 'Organisation';
export type AccountStatus = 'active' | 'pending' | 'suspended';

export interface Member {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  department: string;
  batch?: string;
  role: UserRole;
  roles: UserRole[];
  status: AccountStatus;
  isMentor: boolean;
  mentorExpertise: string[];
  bio: string;
  skills: string[];
  reputationScore: number;
  forumPermissions?: {
    canAccessModeration: boolean;
    moderatedCommunityIds: string[];
  };
}

export interface MemberStats {
  totalMembers: number;
  activeMembers: number;
  mentors: number;
  pendingMembers: number;
  suspendedMembers: number;
}

export interface ProjectMilestone {
  id: string;
  title: string;
  status: 'planned' | 'in_progress' | 'completed';
  dueDate: string;
}

export interface Project {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'showcase';
  progress: number;
  leaderId: string;
  memberIds: string[];
  tags: string[];
  repositoryUrl?: string;
  milestones: ProjectMilestone[];
  createdAt: string;
}

export interface CreateProjectInput {
  name: string;
  tagline: string;
  description: string;
  category: string;
  tags: string[];
}

export interface EventScheduleItem {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
}

export interface EventRegistration {
  id: string;
  eventId: string;
  memberId: string;
  role: 'Participant' | 'Audience' | 'Judge';
  status: 'Registered' | 'Waitlisted' | 'Cancelled' | 'Attended';
  registeredAt: string;
}

export interface Event {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  category: string;
  mode: 'Online' | 'Offline' | 'Hybrid';
  status: 'Published' | 'Ongoing' | 'Completed' | 'Cancelled';
  startsAt: string;
  endsAt: string;
  registrationEndsAt: string;
  venue: string;
  organizerId: string;
  organizerName: string;
  capacity: number;
  registrationCount: number;
  tags: string[];
  schedule: EventScheduleItem[];
  currentUserRegistration: EventRegistration | null;
}

export interface IdeaComment {
  id: string;
  ideaId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface Idea {
  id: string;
  ticketCode: string;
  title: string;
  tagline: string;
  description: string;
  track: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  status: 'Open' | 'In Progress' | 'Completed';
  ownerId: string;
  ownerName: string;
  assignedMentorId: string | null;
  assignedMentorName: string | null;
  seekingMentor: boolean;
  targetTeamSize: number;
  memberIds: string[];
  techStack: string[];
  savedByCurrentUser: boolean;
  joinRequestStatus: 'Pending' | 'Accepted' | 'Declined' | null;
  comments: IdeaComment[];
  createdAt: string;
}

export interface CreateIdeaInput {
  title: string;
  tagline: string;
  description: string;
  track: string;
  difficulty: Idea['difficulty'];
  targetTeamSize: number;
  techStack: string[];
  seekingMentor: boolean;
}

export interface Achievement {
  id: string;
  memberId: string;
  memberName: string;
  title: string;
  description: string;
  achievedAt: string;
  projectId?: string;
  eventId?: string;
}

export interface LeaderboardEntry {
  rank: number;
  memberId: string;
  memberName: string;
  avatarUrl?: string;
  department: string;
  academicYear: string;
  score: number;
  starRating: number;
  eventIds: string[];
  contributionBreakdown: Record<string, number>;
}

export interface LeaderboardResponse {
  generatedAt: string;
  scoringPolicyVersion: string;
  achievements: Achievement[];
  entries: LeaderboardEntry[];
  filters: {
    events: Array<{ id: string; title: string }>;
    departments: string[];
    academicYears: string[];
  };
}

export interface DashboardSummary {
  memberCount: number;
  activeProjectCount: number;
  upcomingEventCount: number;
  openIdeaCount: number;
  discussionCount: number;
  topContributor: LeaderboardEntry | null;
  featuredProjects: Project[];
  upcomingEvents: Event[];
  recentIdeas: Idea[];
}

export type {
  CommunitySummary,
  ForumPost,
  ForumReply,
  TagSummary,
  MemberSummary as ForumMemberSummary
} from './forum/index';
