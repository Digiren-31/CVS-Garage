/**
 * CVS Garage — Leaderboard Integration Adapter
 * Owns reputation scoring, rankings, and badge rewards.
 * Follows Rule 6: Leaderboard owns scoring/ranking.
 * Follows Rule 7: Forum sends contribution data to Leaderboard but does not decide ranking formulas.
 */

export class LeaderboardService {
  constructor() {
    this.recordedEvents = new Set();
    this.memberScores = new Map();

    // Pre-populate with seed event IDs
    this.recordedEvents.add('hash-evt-post-1');
    this.recordedEvents.add('hash-evt-ans-1');
    this.recordedEvents.add('hash-evt-post-2');
  }

  async recordContribution(event) {
    const { eventId, memberId, contributionType, forumPostId, forumReplyId, value } = event;

    // Idempotency check: strictly prevent double-counting
    if (this.recordedEvents.has(eventId)) {
      return {
        success: true,
        duplicate: true,
        message: 'Event was already recorded. Skipping to prevent duplicate scoring.'
      };
    }

    this.recordedEvents.add(eventId);

    // Track simulated point tally on leaderboard side
    const currentScore = this.memberScores.get(memberId) || 0;
    const pointValues = {
      post: 10,
      reply: 5,
      accepted_answer: 25,
      upvote_received: 2
    };
    const points = (pointValues[contributionType] || 5) * (value || 1);
    this.memberScores.set(memberId, currentScore + points);

    return {
      success: true,
      duplicate: false,
      eventId,
      recordedAt: new Date().toISOString()
    };
  }
}

export const leaderboardService = new LeaderboardService();
