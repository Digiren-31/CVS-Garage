import { createPersistentStore } from '../../lib/persistent-store.js';

export const PROJECT_SEEDS = [
  {
    id: 'PRJ-101',
    slug: 'smart-campus-nav',
    name: 'Smart Campus Navigation',
    tagline: 'BLE beacon indoor positioning and accessible routing across college buildings.',
    description:
      'A mobile-first navigation platform that combines Bluetooth beacons with accessibility-aware routing so students and visitors can move through campus with confidence.',
    category: 'Smart Campus',
    status: 'active',
    progress: 33,
    leaderId: 'mem-student-1',
    memberIds: ['mem-student-1', 'mem-student-2', 'mem-student-3'],
    membersCount: 3,
    tags: ['IoT', 'React Native', 'ESP32', 'Accessibility'],
    repositoryUrl: 'https://github.com/cvs-garage/smart-campus-navigation',
    milestones: [
      {
        id: 'MS-101-1',
        title: 'Map the engineering block',
        status: 'in_progress',
        dueDate: '2026-10-15'
      },
      {
        id: 'MS-101-2',
        title: 'Validate accessible routes',
        status: 'completed',
        dueDate: '2026-09-30'
      },
      {
        id: 'MS-101-3',
        title: 'Run the student pilot',
        status: 'planned',
        dueDate: '2026-11-18'
      }
    ],
    createdAt: '2026-07-12T09:00:00.000Z'
  },
  {
    id: 'PRJ-102',
    slug: 'solar-microgrid',
    name: 'Solar Microgrid Energy Optimizer',
    tagline: 'Predictive energy balancing for the campus rooftop solar microgrid.',
    description:
      'An edge analytics service that combines real-time solar telemetry and load forecasts to help facilities teams make better energy-balancing decisions.',
    category: 'Sustainability',
    status: 'active',
    progress: 50,
    leaderId: 'mem-student-3',
    memberIds: ['mem-student-3', 'mem-student-1'],
    membersCount: 2,
    tags: ['IoT', 'Python', 'CleanTech', 'Time-Series'],
    repositoryUrl: 'https://github.com/cvs-garage/solar-microgrid',
    milestones: [
      {
        id: 'MS-102-1',
        title: 'Calibrate telemetry ingestion',
        status: 'completed',
        dueDate: '2026-09-20'
      },
      {
        id: 'MS-102-2',
        title: 'Deploy the forecasting pilot',
        status: 'in_progress',
        dueDate: '2026-10-28'
      }
    ],
    createdAt: '2026-06-03T10:30:00.000Z'
  },
  {
    id: 'PRJ-103',
    slug: 'decentralized-credentials',
    name: 'Decentralized Student Credentials',
    tagline: 'Privacy-aware W3C verifiable credentials for college transcripts.',
    description:
      'A proposal for issuing and verifying cryptographically signed academic credentials while keeping students in control of how their records are shared.',
    category: 'Digital Identity',
    status: 'planning',
    progress: 0,
    leaderId: 'mem-student-2',
    memberIds: ['mem-student-2', 'mem-student-1', 'mem-mentor-1'],
    membersCount: 3,
    tags: ['Web3', 'Node.js', 'Cryptography', 'W3C'],
    milestones: [
      {
        id: 'MS-103-1',
        title: 'Review credential data model',
        status: 'planned',
        dueDate: '2026-10-25'
      },
      {
        id: 'MS-103-2',
        title: 'Prototype issuer and verifier',
        status: 'planned',
        dueDate: '2026-11-30'
      }
    ],
    createdAt: '2026-08-24T08:15:00.000Z'
  }
];

function createProjectsSeed() {
  return {
    projects: structuredClone(PROJECT_SEEDS)
  };
}

export const projectsStore = createPersistentStore('projects', createProjectsSeed);
