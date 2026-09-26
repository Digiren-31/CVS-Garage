/**
 * CVS Garage — Project Management Integration Adapter
 * Owns projects, team members, milestones, and repositories.
 * Follows Rule 3: Project Management owns projects.
 */

export const MOCK_PROJECTS = [
  {
    id: 'PRJ-101',
    name: 'Smart Campus Navigation',
    slug: 'smart-campus-nav',
    tagline: 'BLE Beacon indoor positioning & accessibility routing across college buildings',
    status: 'in_progress',
    leaderId: 'mem-student-1',
    membersCount: 6,
    tags: ['IoT', 'React Native', 'ESP32', 'BLE']
  },
  {
    id: 'PRJ-102',
    name: 'Solar Microgrid Energy Optimizer',
    slug: 'solar-microgrid',
    tagline: 'Real-time telemetry and edge predictive AI balancing solar rooftop load',
    status: 'in_progress',
    leaderId: 'mem-student-3',
    membersCount: 4,
    tags: ['IoT', 'Python', 'CleanTech', 'Time-Series']
  },
  {
    id: 'PRJ-103',
    name: 'Decentralized Student Credentials',
    slug: 'decentralized-credentials',
    tagline: 'W3C Verifiable Credentials issuing cryptographic college transcripts',
    status: 'planning',
    leaderId: 'mem-student-2',
    membersCount: 3,
    tags: ['Web3', 'Node.js', 'Cryptography']
  }
];

export class ProjectService {
  async getProjectById(projectId) {
    return MOCK_PROJECTS.find((p) => p.id === projectId) || null;
  }

  async getAllProjects() {
    return MOCK_PROJECTS;
  }

  async searchProjects(query = '') {
    const q = query.toLowerCase();
    return MOCK_PROJECTS.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.tagline.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
    );
  }
}

export const projectService = new ProjectService();
