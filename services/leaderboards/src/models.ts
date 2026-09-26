export type EntityId = string;
export type IsoDateTime = string;
export type AcademicYear = string;

export interface Department {
  id: EntityId;
  name: string;
  shortName: string | null;
}

export interface User {
  id: EntityId;
  displayName: string;
  avatarUrl: string | null;
  profileUrl: string | null;
  department: Department;
  academicYear: AcademicYear;
}

export interface Team {
  id: EntityId;
  name: string;
  memberIds: EntityId[];
}

export interface MediaAsset {
  id: EntityId;
  url: string;
  alternativeText: string;
  width: number;
  height: number;
}

export interface EventPlacement {
  teamId: EntityId;
  position: number;
  score: number | null;
}

export interface Event {
  id: EntityId;
  slug: string;
  title: string;
  description: string;
  startsAt: IsoDateTime;
  endsAt: IsoDateTime;
  status: "scheduled" | "active" | "completed" | "cancelled";
  participatingTeamIds: EntityId[];
  finalPlacements: EventPlacement[];
  media: MediaAsset[];
  publicUrl: string;
}

export interface Project {
  id: EntityId;
  slug: string;
  title: string;
  description: string;
  teamId: EntityId;
  eventIds: EntityId[];
  coverImage: MediaAsset | null;
  publicUrl: string;
}

export type AchievementSubject =
  | { type: "user"; userId: EntityId; displayName: string }
  | { type: "team"; teamId: EntityId; displayName: string };

export interface Achievement {
  id: EntityId;
  subject: AchievementSubject;
  title: string;
  message: string;
  position: number | null;
  achievedAt: IsoDateTime;
  event: Pick<Event, "id" | "title" | "publicUrl"> | null;
  project: Pick<Project, "id" | "title" | "publicUrl"> | null;
  image: MediaAsset | null;
}

export interface LeaderboardEntry {
  rank: number;
  user: User;
  teamNames: string[];
  eventIds: EntityId[];
  achievementScore: number;
  starRating: number;
  asOf: IsoDateTime;
  scoringPolicyVersion: string;
}

export interface LeaderboardFilterOptions {
  events: Array<Pick<Event, "id" | "title">>;
  departments: Department[];
  academicYears: AcademicYear[];
}

export interface LeaderboardsPageResponse {
  generatedAt: IsoDateTime;
  scoringPolicyVersion: string;
  recentAchievements: Achievement[];
  allTime: LeaderboardEntry[];
  custom: {
    entries: LeaderboardEntry[];
    options: LeaderboardFilterOptions;
  };
}