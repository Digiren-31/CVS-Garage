import { leaderboardDomainService } from '../modules/leaderboards/leaderboard.service.js';

export class LeaderboardService {
  constructor(service = leaderboardDomainService) {
    this.service = service;
  }

  async recordContribution(event) {
    return this.service.recordContribution(event);
  }

  async revokeContribution(eventId) {
    return this.service.revokeContribution(eventId);
  }

  async getLeaderboard() {
    return this.service.getLeaderboard();
  }
}

export const leaderboardService = new LeaderboardService();
