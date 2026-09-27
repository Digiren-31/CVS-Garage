import { memberCentreService } from '../modules/member-centre/member.service.js';
export { MOCK_MEMBERS } from '../modules/member-centre/member.store.js';

export class MemberService {
  constructor(service = memberCentreService) {
    this.service = service;
  }

  async getMemberById(memberId) {
    return this.service.getMemberById(memberId);
  }

  async getAllMembers() {
    return this.service.getAllMembers();
  }

  async getMentors(filter = {}) {
    return this.service.getMentors(filter);
  }

  async verifyAuth(req) {
    return this.service.resolveIdentity(req);
  }
}

export const memberService = new MemberService();
