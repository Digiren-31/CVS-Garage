import { z } from 'zod';

const text = (min, max) => z.string().trim().min(min).max(max);
const optionalUrl = z.union([z.literal(''), z.string().url().max(500).refine((value) => {
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
}, 'Use an HTTPS URL.')]).optional();
export const eventCategories = ['Technical', 'Cultural', 'Sports', 'Academic', 'Social', 'Competitions', 'Workshops', 'Seminars', 'Other'];
export const pitchInput = z.object({ title: text(5, 160), description: text(30, 10000), category: text(2, 60), domain: text(2, 80), projectUrl: optionalUrl }).strict();
export const ideaInput = z.object({
  title: text(5, 120), tagline: text(10, 200), description: text(30, 10000), trackId: text(1, 100),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']), targetTeamSize: z.number().int().min(1).max(12),
  techTagIds: z.array(text(1, 100)).max(8).default([]), seekingMentor: z.boolean().default(false), githubRepoUrl: optionalUrl,
}).strict();
export const joinInput = z.object({ message: text(20, 2000), skills: text(2, 300) }).strict();
export const commentInput = z.object({ content: text(1, 4000), parentId: text(1, 100).nullable().optional() }).strict();
export const profileInput = z.object({
  displayName: text(2, 80), headline: z.string().trim().max(160), bio: z.string().trim().max(2000),
  skills: z.array(text(1, 40)).max(12),
  links: z.object({ github: optionalUrl, linkedin: optionalUrl, website: optionalUrl }).strict(),
}).strict();
export const eventInput = z.object({
  title: text(5, 160), shortSummary: text(20, 240), fullDescription: text(30, 10000),
  category: z.enum(eventCategories), mode: z.enum(['Online', 'Offline', 'Hybrid']),
  startsAt: z.iso.datetime(), endsAt: z.iso.datetime(), registrationEndsAt: z.iso.datetime(),
  venue: text(2, 200), maxCapacity: z.number().int().min(1).max(10000),
  allowAudience: z.boolean().default(true), allowJudgeApplications: z.boolean().default(false),
}).strict().refine((v) => v.startsAt < v.endsAt && v.registrationEndsAt <= v.endsAt, 'Check the event and registration dates.');
export const registrationInput = z.object({
  role: z.enum(['Participant', 'Audience', 'Judge']),
  answers: z.record(z.string().max(100), z.string().max(2000)).default({}),
}).strict();
export const postInput = z.object({
  title: text(8, 180), content: text(20, 12000),
  postType: z.enum(['question', 'problem', 'doubt', 'discussion', 'idea', 'announcement', 'project_discussion', 'event_discussion']),
  categoryId: text(1, 100).nullable().optional(), communityId: text(1, 100).nullable().optional(),
  tagNames: z.array(text(1, 32)).max(5).default([]),
}).strict();
export const signInInput = z.object({ email: z.email().max(254), password: z.string().min(1).max(256) }).strict();
export const decisionInput = z.object({ action: z.enum(['approve', 'reject', 'needs_feedback']), reason: text(5, 2000) }).strict();
export const reasonInput = z.object({ reason: text(5, 2000) }).strict();
