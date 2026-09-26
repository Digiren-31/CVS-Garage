/**
 * Events Management & Discovery Platform - Data Contracts & Types
 * Isolation Rule: External entities (Members, Forums, Projects, etc.) are referenced
 * strictly via String/ID strings (e.g., memberId, organizerId, judgeId).
 */

export type EventCategory =
  | 'Technical'
  | 'Cultural'
  | 'Sports'
  | 'Academic'
  | 'Social'
  | 'Competitions'
  | 'Workshops'
  | 'Seminars'
  | 'Other';

export type EventMode = 'Online' | 'Offline' | 'Hybrid';

export type LifecycleStatus =
  | 'Draft'
  | 'Submitted'
  | 'UnderReview'
  | 'ChangesRequested'
  | 'Published'
  | 'Ongoing'
  | 'Completed'
  | 'Archived'
  | 'Rejected';

export type UserEventRole = 'Participant' | 'Judge' | 'Audience' | 'Organizer' | 'Admin';

export type RegistrationStatus = 'Registered' | 'PendingApproval' | 'Waitlisted' | 'Cancelled' | 'Attended';

export interface LocationConfig {
  mode: EventMode;
  // Online
  platformName?: string;
  meetingUrl?: string; // Authorized access only
  // Offline
  venue?: string;
  roomOrHall?: string;
  address?: string;
  mapPreviewUrl?: string;
}

export interface SubTrack {
  id: string;
  title: string;
  description: string;
  maxParticipants?: number;
}

export interface ScheduleItem {
  id: string;
  title: string;
  startTime: string; // ISO String
  endTime: string;   // ISO String
  description?: string;
  speakerOrHost?: string;
}

export interface PrizeBreakdown {
  position: '1st' | '2nd' | '3rd' | 'Honorable Mention';
  title: string;
  rewardAmount?: string;
  description?: string;
}

export interface JudgeProfile {
  judgeId: string; // External Member ID
  name: string;
  designation: string;
  bio: string;
  photoUrl?: string;
  portfolioUrl?: string;
  isAppointed: boolean;
}

export interface EventRegistrationRules {
  maxCapacity?: number;
  allowAudience: boolean;
  allowJudgeApplications: boolean;
  customQuestions?: Array<{
    id: string;
    question: string;
    required: boolean;
  }>;
}

export interface EventEntity {
  id: string;
  title: string;
  shortSummary: string;
  fullDescription: string;
  category: EventCategory;
  mode: EventMode;
  posterUrl: string;
  organizerId: string;
  organizerName: string;
  status: LifecycleStatus;
  
  // Timing
  registrationStartDate: string;
  registrationEndDate: string;
  eventStartDate: string;
  eventEndDate: string;

  // Location & Details
  location: LocationConfig;
  rulesAndGuidelines: string[];
  subTracks: SubTrack[];
  schedule: ScheduleItem[];
  prizes: PrizeBreakdown[];
  judges: JudgeProfile[];
  registrationRules: EventRegistrationRules;

  // Attendance Engine Config
  attendanceTrackingEnabled: boolean;

  // Metadata
  createdAt: string;
  updatedAt: string;
  isMock?: boolean;
}

// Unified Registration Payload
export interface EventRegistrationPayload {
  eventId: string;
  memberId: string;
  requestedRole: 'Participant' | 'Judge' | 'Audience';
  // Participant specific
  teamName?: string;
  teamMembers?: string[];
  experienceLevel?: 'Beginner' | 'Intermediate' | 'Advanced';
  customAnswers?: Record<string, string>;
  // Judge specific
  expertise?: string;
  portfolioUrl?: string;
  statement?: string;
}

export interface RegistrationRecord {
  id: string;
  eventId: string;
  memberId: string;
  role: UserEventRole;
  status: RegistrationStatus;
  registeredAt: string;
  checkInTimestamp?: string;
  payload?: EventRegistrationPayload;
}

// QR Attendance Token Contract
export interface QRAttendancePayload {
  eventId: string;
  sessionToken: string; // Encrypted QR token
  expiresAt: string;
}

export interface CheckInResult {
  success: boolean;
  status: 'VALID' | 'ALREADY_CHECKED_IN' | 'UNAUTHORIZED' | 'EXPIRED';
  attendeeName?: string;
  memberId?: string;
  timestamp?: string;
  message: string;
}

// Multi-faceted Filter State
export interface EventFilterState {
  searchQuery?: string;
  category?: EventCategory | 'All';
  mode?: EventMode | 'All';
  dateRange?: 'Upcoming' | 'Today' | 'ThisWeek' | 'Custom';
  status?: 'Open' | 'ClosingSoon' | 'Full' | 'Completed' | 'All';
  organizerId?: string;
}
