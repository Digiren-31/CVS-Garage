/**
 * CVS Garage — Member Management Integration Adapter
 * Owns user authentication, roles, mentor badges, and profile lookup.
 * Follows Rule 1: Member Management is the source of truth for identity.
 */

export const MOCK_MEMBERS = [
  {
    id: 'mem-student-1',
    name: 'Rahul Sharma',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
    email: 'rahul.sharma@college.edu',
    department: 'Computer Science & Engineering',
    batch: 'Batch 2026',
    role: 'Student',
    isMentor: false,
    bio: 'Core contributor to Smart Campus Nav. Passionate about embedded systems & React Native.',
    stats: { helpfulAnswersCount: 4, discussionsCount: 12 },
    reputationScore: 245
  },
  {
    id: 'mem-student-2',
    name: 'Ananya Verma',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
    email: 'ananya.verma@college.edu',
    department: 'AI & Data Science',
    batch: 'Batch 2026',
    role: 'Student',
    isMentor: false,
    bio: 'Decentralized identity & web3 researcher. HackSprint 2025 finalist.',
    stats: { helpfulAnswersCount: 8, discussionsCount: 15 },
    reputationScore: 410
  },
  {
    id: 'mem-student-3',
    name: 'Rohan Das',
    avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80',
    email: 'rohan.das@college.edu',
    department: 'Electronics & Communication',
    batch: 'Batch 2025',
    role: 'Student',
    isMentor: false,
    bio: 'Deep learning systems & PyTorch GPU cluster engineering.',
    stats: { helpfulAnswersCount: 3, discussionsCount: 6 },
    reputationScore: 180
  },
  {
    id: 'mem-mentor-1',
    name: 'Dr. Priya Nair',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80',
    email: 'priya.nair@college.edu',
    department: 'Computer Science & Engineering',
    batch: 'Faculty / Lab Director',
    role: 'Mentor',
    isMentor: true,
    mentorExpertise: ['AI & ML', 'Deep Learning', 'NLP', 'Research Paper Guidance'],
    bio: 'Associate Professor & AI Lab Lead. Mentor for Google Summer of Code and Campus Hackathons.',
    stats: { helpfulAnswersCount: 42, discussionsCount: 28 },
    reputationScore: 1850
  },
  {
    id: 'mem-mentor-2',
    name: 'Dr. Arvind Swaminathan',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    email: 'arvind.swami@college.edu',
    department: 'Robotics & Mechatronics',
    batch: 'Faculty / Makerspace Advisor',
    role: 'Mentor',
    isMentor: true,
    mentorExpertise: ['IoT & Embedded', 'ROS2', 'ESP32 Firmware', 'Kalman Filtering', 'Hardware Design'],
    bio: 'Makerspace faculty advisor. 15+ years experience in autonomous robotics and sensor fusion.',
    stats: { helpfulAnswersCount: 67, discussionsCount: 34 },
    reputationScore: 2420
  },
  {
    id: 'mem-admin-1',
    name: 'Vikramaditya Sen',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
    email: 'admin.sen@college.edu',
    department: 'Dean of Student Affairs & Innovation',
    batch: 'Administration',
    role: 'Admin',
    isMentor: false,
    bio: 'Platform Administrator & Innovation Council Representative.',
    stats: { helpfulAnswersCount: 15, discussionsCount: 18 },
    reputationScore: 920
  }
];

export class MemberService {
  async getMemberById(memberId) {
    const member = MOCK_MEMBERS.find((m) => m.id === memberId);
    return member || null;
  }

  async getAllMembers() {
    return MOCK_MEMBERS;
  }

  async getMentors(filter = {}) {
    let mentors = MOCK_MEMBERS.filter((m) => m.isMentor);
    if (filter.expertise) {
      const expLower = filter.expertise.toLowerCase();
      mentors = mentors.filter((m) =>
        m.mentorExpertise?.some((e) => e.toLowerCase().includes(expLower))
      );
    }
    if (filter.department) {
      mentors = mentors.filter((m) =>
        m.department.toLowerCase().includes(filter.department.toLowerCase())
      );
    }
    return mentors;
  }

  async verifyAuth(req) {
    // In production: decode JWT bearer token from Authorization header
    // In dev: default to Rahul Sharma (Student) or allow x-user-id header simulation
    const simulatedUserId = req.headers['x-user-id'] || 'mem-student-1';
    const member = await this.getMemberById(simulatedUserId);
    if (!member) {
      return MOCK_MEMBERS[0];
    }
    return member;
  }
}

export const memberService = new MemberService();
