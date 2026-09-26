export type Area = 'portal' | 'projects' | 'events' | 'member-centre' | 'leaderboards' | 'idea-centre' | 'forum';
export type Role = 'student' | 'mentor' | 'organization' | 'committee' | 'admin';
export interface Member {
  id: string;
  displayName: string;
  headline: string;
  bio: string;
  department: string;
  academicYear: string;
  avatarUrl: string | null;
  roles: Role[];
  skills: string[];
  links: { github?: string; linkedin?: string; website?: string };
}
export interface Session {
  member: Member | null;
  permissions: string[];
  demo: boolean;
  demoAvailable: boolean;
}
export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error?: { code: string; message: string; details?: unknown };
  meta?: { timestamp: string; total?: number; hasMore?: boolean; nextCursor?: string | null };
}
export interface Page<T> { items: T[]; total: number; hasMore: boolean; nextCursor?: string | null }
export interface ServiceProps { session: Session }
export interface Notification {
  id: string; message: string; createdAt: string; readAt: string | null; href: string;
}
export interface SearchResult { id: string; title: string; description: string; area: Area; href: string }
export interface Milestone { id: string; title: string; sequence: number; status: 'pending' | 'in_progress' | 'completed'; dueDate: string | null }
export interface Project {
  id: string; title: string; description: string; category: string; domain: string;
  status: 'active' | 'on_hold' | 'blocked' | 'final_review_submitted' | 'completed' | 'discontinued';
  teamName: string; members: Pick<Member, 'id' | 'displayName' | 'avatarUrl'>[];
  milestones: Milestone[]; academicYear: string; updatedAt: string;
  viewerRole: 'lead' | 'member' | 'mentor' | 'reviewer' | null;
  mentorSignedOff: boolean; committeeSignedOff: boolean;
  showcase: { description: string; githubUrl: string; prototypeUrl: string | null; techStack: string[]; eventsEligible: boolean } | null;
  updates?: { id: string; body: string; author: string; createdAt: string }[];
}
export interface Pitch {
  id: string; title: string; description: string; category: string; domain: string;
  status: 'pending' | 'needs_feedback' | 'approved' | 'rejected' | 'archived';
  author: string; createdAt: string; cooldownUntil: string | null;
  feedback: { id: string; feedback: string; action: string; createdAt: string }[];
}
export type EventCategory = 'Technical' | 'Cultural' | 'Sports' | 'Academic' | 'Social' | 'Competitions' | 'Workshops' | 'Seminars' | 'Other';
export interface CampusEvent {
  id: string; title: string; shortSummary: string; fullDescription: string;
  category: EventCategory; mode: 'Online' | 'Offline' | 'Hybrid';
  status: 'Draft' | 'Submitted' | 'UnderReview' | 'ChangesRequested' | 'Published' | 'Ongoing' | 'Completed' | 'Archived' | 'Rejected';
  organizerName: string; organizerId: string; startsAt: string; endsAt: string;
  registrationStartsAt: string; registrationEndsAt: string;
  location: { venue?: string; roomOrHall?: string; address?: string; platformName?: string; meetingUrl?: string };
  maxCapacity: number | null; registrationCount: number; allowAudience: boolean; allowJudgeApplications: boolean;
  registration: { id: string; role: string; status: string } | null;
  registrationState: 'open' | 'full' | 'closed' | 'not_started';
  rules: string[]; questions: { id: string; question: string; required: boolean }[];
  schedule: { id: string; title: string; startsAt: string; endsAt: string; speaker: string | null }[];
  prizes: { position: number; title: string; description: string }[];
  subtracks: { id: string; title: string; description: string }[];
  canManage: boolean;
}
export interface Idea {
  id: string; ticketCode: string; title: string; tagline: string; description: string;
  track: { id: string; name: string }; difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED'; targetTeamSize: number;
  owner: Member; mentor: Member | null; seekingMentor: boolean; teamCount: number;
  viewerRelation: 'owner' | 'member' | 'pending' | 'none'; isSaved: boolean;
  techStack: { id: string; name: string }[]; githubRepoUrl: string | null;
  awardNote: string | null; usageStats: string | null; createdAt: string;
  members?: Member[];
  comments?: { id: string; content: string; parentId: string | null; author: Member; createdAt: string }[];
  joinRequests?: { id: string; applicant: Member; message: string; skills: string; status: string }[];
  mentorshipRequest?: { id: string; guidanceNeeded: string; status: string } | null;
}
export interface IdeasPage extends Page<Idea> {
  counts: { all: number; open: number; inProgress: number; completed: number; seekingMentor: number };
  tracks: { id: string; name: string; count: number }[];
  techTags: { id: string; name: string }[];
}
export interface Discussion {
  id: string; title: string; content: string;
  postType: 'question' | 'problem' | 'doubt' | 'discussion' | 'idea' | 'announcement' | 'project_discussion' | 'event_discussion';
  author: Member; status: string; voteScore: number; replyCount: number;
  viewerVote: number; isBookmarked: boolean; createdAt: string;
  category: { id: string; name: string } | null; tags: string[];
  community: { id: string; name: string } | null; acceptedReplyId: string | null;
  isLocked: boolean; exportedIdeaId: string | null;
  replies?: { id: string; content: string; author: Member; parentReplyId: string | null; isAcceptedSolution: boolean; createdAt: string }[];
}
export interface ForumPage extends Page<Discussion> {
  categories: { id: string; name: string }[];
  communities: { id: string; name: string; description: string; memberCount: number; isMember: boolean }[];
}
export interface Ranking {
  rank: number; member: Member; score: number; stars: number; teamNames: string[]; eventIds: string[];
}
export interface RankingsPage {
  items: Ranking[]; asOf: string | null; policyVersion: string | null; isDemo: boolean;
  options: { events: { id: string; title: string }[]; departments: string[]; academicYears: string[] };
}
export interface Achievement {
  id: string; title: string; message: string; subjectName: string; position: number | null;
  event: { id: string; title: string } | null; project: { id: string; title: string } | null; achievedAt: string;
}
export interface Overview {
  counts: { projects: number; events: number; ideas: number; members: number };
  events: CampusEvent[]; ideas: Idea[]; discussions: Discussion[]; projects: Project[];
  demo: boolean;
}
