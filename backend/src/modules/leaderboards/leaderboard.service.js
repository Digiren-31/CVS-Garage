import { eventService } from '../../integrations/event.service.js';
import { memberService } from '../../integrations/member.service.js';
import { leaderboardStore } from './leaderboard.store.js';

export const SCORING_POLICY_VERSION = 'forum-contributions-v1';

export const CONTRIBUTION_POINTS = Object.freeze({
  post: 10,
  reply: 5,
  accepted_answer: 25,
  upvote_received: 2
});

const BREAKDOWN_KEYS = Object.freeze({
  post: 'posts',
  reply: 'replies',
  accepted_answer: 'acceptedAnswers',
  upvote_received: 'upvotesReceived'
});

function compareText(left, right) {
  return left.localeCompare(right, 'en', { sensitivity: 'base' });
}

const RANKING_RULES = Object.freeze([
  { name: 'score-descending', compare: (left, right) => right.score - left.score },
  {
    name: 'contribution-count-descending',
    compare: (left, right) => right.contributionCount - left.contributionCount
  },
  {
    name: 'member-name-ascending',
    compare: (left, right) => compareText(left.memberName, right.memberName)
  },
  {
    name: 'member-id-ascending',
    compare: (left, right) => compareText(left.memberId, right.memberId)
  }
]);

export const LEADERBOARD_ORDER = Object.freeze(RANKING_RULES.map((rule) => rule.name));

function compareLeaderboardRows(left, right) {
  for (const rule of RANKING_RULES) {
    const result = rule.compare(left, right);
    if (result !== 0) {
      return result;
    }
  }
  return 0;
}

function toAcademicYear(member) {
  const year = member.batch?.match(/\b20\d{2}\b/)?.[0];
  if (year) {
    return year;
  }
  return member.isMentor ? 'Faculty' : 'Administration';
}

function toStarRating(score) {
  if (score >= 200) return 5;
  if (score >= 150) return 4;
  if (score >= 100) return 3;
  if (score >= 50) return 2;
  return score > 0 ? 1 : 0;
}

function emptyBreakdown() {
  return {
    posts: 0,
    replies: 0,
    acceptedAnswers: 0,
    upvotesReceived: 0
  };
}

function assertContribution(event) {
  if (!event || typeof event !== 'object') {
    throw new TypeError('A contribution event is required.');
  }
  if (typeof event.eventId !== 'string' || !event.eventId.trim()) {
    throw new TypeError('Contribution eventId must be a non-empty string.');
  }
  if (typeof event.memberId !== 'string' || !event.memberId.trim()) {
    throw new TypeError('Contribution memberId must be a non-empty string.');
  }
  if (!Object.hasOwn(CONTRIBUTION_POINTS, event.contributionType)) {
    throw new TypeError('Contribution type is not supported by the active scoring policy.');
  }
  if (!Number.isSafeInteger(event.value ?? 1) || (event.value ?? 1) <= 0) {
    throw new TypeError('Contribution value must be a positive integer.');
  }
}

function validTimestamp(value, fallback) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value)) ? value : fallback;
}

export class LeaderboardDomainService {
  constructor(store = leaderboardStore) {
    this.store = store;
  }

  contributionEvents() {
    this.store.state.contributionEvents ||= [];
    return this.store.state.contributionEvents;
  }

  achievements() {
    this.store.state.achievements ||= [];
    return this.store.state.achievements;
  }

  async recordContribution(event) {
    assertContribution(event);
    const eventId = event.eventId.trim();
    const recorded = this.contributionEvents().find(
      (candidate) => candidate.eventId === eventId
    );

    if (recorded) {
      if (recorded.revokedAt) {
        delete recorded.revokedAt;
        recorded.recordedAt = new Date().toISOString();
        await this.store.persist({ actorId: event.memberId });
        return {
          success: true,
          duplicate: false,
          reactivated: true,
          eventId,
          recordedAt: recorded.recordedAt
        };
      }
      return {
        success: true,
        duplicate: true,
        message: 'Event was already recorded. Skipping to prevent duplicate scoring.'
      };
    }

    const value = event.value ?? 1;
    const recordedAt = new Date().toISOString();
    this.contributionEvents().push({
      eventId,
      memberId: event.memberId.trim(),
      contributionType: event.contributionType,
      forumPostId: event.forumPostId || null,
      forumReplyId: event.forumReplyId || null,
      value,
      points: CONTRIBUTION_POINTS[event.contributionType] * value,
      contextEventId: event.contextEventId || null,
      policyVersion: SCORING_POLICY_VERSION,
      occurredAt: validTimestamp(event.timestamp, recordedAt),
      recordedAt
    });
    await this.store.persist({ actorId: event.memberId });

    return {
      success: true,
      duplicate: false,
      eventId,
      recordedAt
    };
  }

  async revokeContribution(eventId) {
    if (typeof eventId !== 'string' || !eventId.trim()) {
      throw new TypeError('Contribution eventId must be a non-empty string.');
    }

    const recorded = this.contributionEvents().find(
      (candidate) => candidate.eventId === eventId.trim()
    );
    if (!recorded || recorded.revokedAt) {
      return {
        success: true,
        changed: false,
        eventId: eventId.trim()
      };
    }

    recorded.revokedAt = new Date().toISOString();
    await this.store.persist({ actorId: recorded.memberId });
    return {
      success: true,
      changed: true,
      eventId: recorded.eventId,
      revokedAt: recorded.revokedAt
    };
  }

  async getLeaderboard() {
    const [members, events] = await Promise.all([
      memberService.getAllMembers(),
      eventService.getAllEvents()
    ]);
    const activeMembers = members.filter((member) => member.status === 'active');
    const membersById = new Map(activeMembers.map((member) => [member.id, member]));
    const rowsByMember = new Map();

    for (const event of this.contributionEvents()) {
      if (event.revokedAt) {
        continue;
      }
      const member = membersById.get(event.memberId);
      if (!member) {
        continue;
      }

      const row =
        rowsByMember.get(member.id) ||
        {
          memberId: member.id,
          memberName: member.name,
          ...(member.avatarUrl ? { avatarUrl: member.avatarUrl } : {}),
          department: member.department,
          academicYear: toAcademicYear(member),
          score: 0,
          contributionCount: 0,
          eventIds: new Set(),
          contributionBreakdown: emptyBreakdown()
        };
      const points =
        Number.isFinite(event.points) && event.points >= 0
          ? event.points
          : CONTRIBUTION_POINTS[event.contributionType] * event.value;

      row.score += points;
      row.contributionCount += event.value;
      row.contributionBreakdown[BREAKDOWN_KEYS[event.contributionType]] += points;
      if (event.contextEventId) {
        row.eventIds.add(event.contextEventId);
      }
      rowsByMember.set(member.id, row);
    }

    const entries = [...rowsByMember.values()]
      .sort(compareLeaderboardRows)
      .map(({ contributionCount: _contributionCount, eventIds, ...entry }, index) => ({
        rank: index + 1,
        ...entry,
        starRating: toStarRating(entry.score),
        eventIds: [...eventIds].sort(compareText)
      }));

    const achievements = this.achievements()
      .filter((achievement) => membersById.has(achievement.memberId))
      .map((achievement) => ({
        ...structuredClone(achievement),
        memberName: membersById.get(achievement.memberId).name
      }))
      .sort(
        (left, right) =>
          Date.parse(right.achievedAt) - Date.parse(left.achievedAt) ||
          compareText(left.id, right.id)
      );

    return {
      generatedAt: new Date().toISOString(),
      scoringPolicyVersion: SCORING_POLICY_VERSION,
      achievements,
      entries,
      filters: {
        events: events
          .map(({ id, title }) => ({ id, title }))
          .sort((left, right) => compareText(left.title, right.title)),
        departments: [...new Set(entries.map((entry) => entry.department))].sort(compareText),
        academicYears: [...new Set(entries.map((entry) => entry.academicYear))].sort(
          compareText
        )
      }
    };
  }
}

export const leaderboardDomainService = new LeaderboardDomainService();
