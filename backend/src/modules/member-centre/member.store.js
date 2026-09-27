import { createPersistentStore } from '../../lib/persistent-store.js';

export const MOCK_MEMBERS = [
  {
    id: 'mem-student-1',
    name: 'Rahul Sharma',
    avatarUrl:
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
    email: 'rahul.sharma@college.edu',
    department: 'Computer Science & Engineering',
    batch: 'Batch 2026',
    role: 'Student',
    roles: ['Student'],
    status: 'active',
    isMentor: false,
    mentorExpertise: [],
    bio: 'Core contributor to Smart Campus Nav. Passionate about embedded systems and React Native.',
    skills: ['React Native', 'Embedded Systems', 'JavaScript'],
    stats: { helpfulAnswersCount: 4, discussionsCount: 12 },
    reputationScore: 245
  },
  {
    id: 'mem-student-2',
    name: 'Ananya Verma',
    avatarUrl:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
    email: 'ananya.verma@college.edu',
    department: 'AI & Data Science',
    batch: 'Batch 2026',
    role: 'Student',
    roles: ['Student'],
    status: 'active',
    isMentor: false,
    mentorExpertise: [],
    bio: 'Decentralized identity and web3 researcher. HackSprint 2025 finalist.',
    skills: ['TypeScript', 'Web3', 'Decentralized Identity'],
    stats: { helpfulAnswersCount: 8, discussionsCount: 15 },
    reputationScore: 410
  },
  {
    id: 'mem-student-3',
    name: 'Rohan Das',
    avatarUrl:
      'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80',
    email: 'rohan.das@college.edu',
    department: 'Electronics & Communication',
    batch: 'Batch 2025',
    role: 'Student',
    roles: ['Student'],
    status: 'active',
    isMentor: false,
    mentorExpertise: [],
    bio: 'Deep learning systems and PyTorch GPU cluster engineering.',
    skills: ['Python', 'PyTorch', 'Deep Learning'],
    stats: { helpfulAnswersCount: 3, discussionsCount: 6 },
    reputationScore: 180
  },
  {
    id: 'mem-mentor-1',
    name: 'Dr. Priya Nair',
    avatarUrl:
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80',
    email: 'priya.nair@college.edu',
    department: 'Computer Science & Engineering',
    batch: 'Faculty / Lab Director',
    role: 'Mentor',
    roles: ['Mentor'],
    status: 'active',
    isMentor: true,
    mentorExpertise: ['AI & ML', 'Deep Learning', 'NLP', 'Research Paper Guidance'],
    bio: 'Associate Professor and AI Lab Lead. Mentor for Google Summer of Code and campus hackathons.',
    skills: ['AI & ML', 'Deep Learning', 'NLP'],
    stats: { helpfulAnswersCount: 42, discussionsCount: 28 },
    reputationScore: 1850
  },
  {
    id: 'mem-mentor-2',
    name: 'Dr. Arvind Swaminathan',
    avatarUrl:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    email: 'arvind.swami@college.edu',
    department: 'Robotics & Mechatronics',
    batch: 'Faculty / Makerspace Advisor',
    role: 'Mentor',
    roles: ['Mentor'],
    status: 'active',
    isMentor: true,
    mentorExpertise: [
      'IoT & Embedded',
      'ROS2',
      'ESP32 Firmware',
      'Kalman Filtering',
      'Hardware Design'
    ],
    bio: 'Makerspace faculty advisor with experience in autonomous robotics and sensor fusion.',
    skills: ['Robotics', 'ROS2', 'Embedded Systems'],
    stats: { helpfulAnswersCount: 67, discussionsCount: 34 },
    reputationScore: 2420
  },
  {
    id: 'mem-admin-1',
    name: 'Vikramaditya Sen',
    avatarUrl:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
    email: 'admin.sen@college.edu',
    department: 'Dean of Student Affairs & Innovation',
    batch: 'Administration',
    role: 'Admin',
    roles: ['Admin'],
    status: 'active',
    isMentor: false,
    mentorExpertise: [],
    bio: 'Platform administrator and Innovation Council representative.',
    skills: ['Community Operations'],
    stats: { helpfulAnswersCount: 15, discussionsCount: 18 },
    reputationScore: 920
  }
];

function createMemberSeed() {
  return {
    members: structuredClone(MOCK_MEMBERS)
  };
}

export const memberStore = createPersistentStore('member-centre', createMemberSeed);
