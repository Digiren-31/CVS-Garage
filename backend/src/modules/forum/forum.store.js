/**
 * CVS Garage — Forum Data Store
 * In-memory persistence engine pre-seeded with realistic college innovation data.
 * Adheres strictly to the database schema defined in backend/database/schema/forum.sql.
 */

export class ForumStore {
  constructor() {
    this.categories = [];
    this.tags = [];
    this.communities = [];
    this.communityMembers = [];
    this.posts = [];
    this.replies = [];
    this.votes = [];
    this.bookmarks = [];
    this.follows = [];
    this.ideaExports = [];
    this.contributionEvents = [];
    this.reports = [];
    this.moderationLogs = [];
    this.notifications = [];

    this.initSeeds();
  }

  initSeeds() {
    this.categories = [
      { id: 'cat-1', name: 'Technical Questions', slug: 'technical-questions', description: 'Ask doubts, debug stack traces, and get peer assistance', icon: 'code', isRestricted: false, displayOrder: 1 },
      { id: 'cat-2', name: 'Architecture & System Design', slug: 'architecture', description: 'Discuss high-level designs, database schemas, and microservice topologies', icon: 'layers', isRestricted: false, displayOrder: 2 },
      { id: 'cat-3', name: 'Project Discussions', slug: 'projects', description: 'Team updates, technical roadblocks, and feature brainstorming for campus projects', icon: 'folder-git2', isRestricted: false, displayOrder: 3 },
      { id: 'cat-4', name: 'Idea Incubator', slug: 'ideas', description: 'Early stage concepts ready for feedback before exporting to Idea Centre', icon: 'lightbulb', isRestricted: false, displayOrder: 4 },
      { id: 'cat-5', name: 'Event & Hackathons', slug: 'events', description: 'HackSprint 2026, team formation, mentor office hours, and judging criteria', icon: 'calendar', isRestricted: false, displayOrder: 5 },
      { id: 'cat-6', name: 'Announcements', slug: 'announcements', description: 'Official notifications from faculty, club leads, and moderators', icon: 'megaphone', isRestricted: true, displayOrder: 6 }
    ];

    this.tags = [
      { id: 'tag-react', name: 'React', slug: 'react', description: 'Front-end JavaScript UI library', postCount: 12 },
      { id: 'tag-python', name: 'Python', slug: 'python', description: 'Backend, scripting, and scientific computing', postCount: 18 },
      { id: 'tag-ai', name: 'AI & ML', slug: 'ai-ml', description: 'Machine learning, deep learning, PyTorch, and NLP', postCount: 15 },
      { id: 'tag-arduino', name: 'IoT & Embedded', slug: 'iot-embedded', description: 'ESP32, Arduino, sensors, and robotics', postCount: 9 },
      { id: 'tag-sysdesign', name: 'System Design', slug: 'system-design', description: 'Scalability, microservices, caches, and database design', postCount: 8 },
      { id: 'tag-security', name: 'Cybersecurity', slug: 'cybersecurity', description: 'CTFs, reverse engineering, web security, and auth', postCount: 6 },
      { id: 'tag-hackathon', name: 'Hackathon 2026', slug: 'hackathon-2026', description: 'Discussions related to HackSprint 2026', postCount: 14 },
      { id: 'tag-cloud', name: 'Cloud & DevOps', slug: 'cloud-devops', description: 'Docker, Kubernetes, AWS, and CI/CD pipelines', postCount: 7 }
    ];

    this.communities = [
      {
        id: 'comm-ai',
        name: 'AI & Machine Learning Guild',
        slug: 'ai-ml-guild',
        description: 'For students and researchers exploring LLMs, computer vision, PyTorch, and autonomous agents.',
        iconUrl: 'brain',
        bannerUrl: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=1200&q=80',
        category: 'Technical',
        type: 'public',
        linkedProjectId: null,
        linkedEventId: null,
        rules: '1. Share code via snippets.\n2. Attribute papers.\n3. Respect peer review.',
        memberCount: 240,
        postCount: 48,
        createdBy: 'mem-mentor-1'
      },
      {
        id: 'comm-webdev',
        name: 'Full-Stack Web & Cloud',
        slug: 'fullstack-web-cloud',
        description: 'Frontend engineering, distributed backend APIs, reactive architectures, and DevOps.',
        iconUrl: 'globe',
        bannerUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80',
        category: 'Technical',
        type: 'public',
        linkedProjectId: null,
        linkedEventId: null,
        rules: '1. Constructive code reviews.\n2. No low-effort duplicate questions.',
        memberCount: 315,
        postCount: 62,
        createdBy: 'mem-student-2'
      },
      {
        id: 'comm-robotics',
        name: 'Robotics & Hardware Lab',
        slug: 'robotics-hardware',
        description: 'Embedded systems, PCB design, ROS2, autonomous navigation, and IoT mesh networks.',
        iconUrl: 'cpu',
        bannerUrl: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1200&q=80',
        category: 'Technical',
        type: 'public',
        linkedProjectId: null,
        linkedEventId: null,
        rules: '1. Safety guidelines for lab battery testing.\n2. Link Gerber files when asking PCB reviews.',
        memberCount: 128,
        postCount: 23,
        createdBy: 'mem-mentor-2'
      },
      {
        id: 'comm-project-nav',
        name: 'Smart Campus Navigation Team',
        slug: 'smart-campus-nav',
        description: 'Dedicated technical community for Project #PRJ-101 (Indoor BLE beacon navigation).',
        iconUrl: 'navigation',
        bannerUrl: 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=1200&q=80',
        category: 'Projects',
        type: 'project_linked',
        linkedProjectId: 'PRJ-101',
        linkedEventId: null,
        rules: 'Open to core contributors and beta testers across campus.',
        memberCount: 45,
        postCount: 16,
        createdBy: 'mem-student-1'
      },
      {
        id: 'comm-hack-2026',
        name: 'HackSprint 2026 Hub',
        slug: 'hacksprint-2026',
        description: 'Official forum for teams participating in HackSprint 2026 36-hour hackathon.',
        iconUrl: 'zap',
        bannerUrl: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80',
        category: 'Events',
        type: 'event_linked',
        linkedProjectId: null,
        linkedEventId: 'EVT-2026-01',
        rules: '1. Use team tags when recruiting teammates.\n2. Mentor hours announced in pinned posts.',
        memberCount: 420,
        postCount: 89,
        createdBy: 'mem-admin-1'
      }
    ];

    this.communityMembers = [
      { id: 'cm-1', communityId: 'comm-project-nav', userId: 'mem-student-1', role: 'admin', joinedAt: new Date().toISOString() },
      { id: 'cm-2', communityId: 'comm-project-nav', userId: 'mem-mentor-2', role: 'moderator', joinedAt: new Date().toISOString() },
      { id: 'cm-3', communityId: 'comm-webdev', userId: 'mem-student-2', role: 'moderator', joinedAt: new Date().toISOString() },
      { id: 'cm-4', communityId: 'comm-ai', userId: 'mem-mentor-1', role: 'admin', joinedAt: new Date().toISOString() }
    ];

    this.posts = [
      {
        id: 'post-1',
        postType: 'question',
        title: 'How should we structure BLE RSSI fingerprinting for indoor campus positioning?',
        content: `We are building **Smart Campus Navigation** (Project #PRJ-101). When testing ESP32 BLE beacons in the CS Department corridor, we noticed multipath interference causes raw RSSI to fluctuate by ±12 dBm, which completely ruins trilateration accuracy.\n\nHas anyone implemented a Kalman filter or Particle filter on ESP32 or client-side in React Native? What is the recommended sampling window without draining mobile battery?`,
        authorId: 'mem-student-1',
        categoryId: 'cat-1',
        communityId: 'comm-project-nav',
        status: 'solved',
        voteScore: 34,
        upvotesCount: 35,
        downvotesCount: 1,
        replyCount: 2,
        viewCount: 420,
        acceptedReplyId: 'reply-1-1',
        linkedProjectId: 'PRJ-101',
        linkedEventId: null,
        tagSlugs: ['iot-embedded', 'react'],
        isPinned: true,
        isLocked: false,
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: 'post-2',
        postType: 'idea',
        title: 'Decentralized Campus Academic Credentials using Verifiable Credentials (W3C)',
        content: `### Problem Statement\nCurrently, requesting transcripts, club certificates, and competition awards requires visiting the admin block and waiting 5-10 business days for manual signatures.\n\n### Proposed Solution\nIssue tamper-proof W3C Verifiable Credentials cryptographically signed by the College Registrar DID. Students store them in an open-source mobile identity wallet. Employers and hackathon judges can verify authenticity instantaneously without an outbound API call to the college database.\n\n### Expected Impact\nEliminates paper forgery, reduces administrative overhead by 90%, and showcases our college as an early adopter of digital sovereignty standards.\n\n### Tech Stack\nNode.js, DIDKit, React Native, IPFS metadata resolver.`,
        authorId: 'mem-student-2',
        categoryId: 'cat-4',
        communityId: 'comm-webdev',
        status: 'open',
        voteScore: 58,
        upvotesCount: 60,
        downvotesCount: 2,
        replyCount: 1,
        viewCount: 780,
        acceptedReplyId: null,
        linkedProjectId: null,
        linkedEventId: null,
        tagSlugs: ['cybersecurity', 'system-design'],
        isPinned: false,
        isLocked: false,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: 'post-3',
        postType: 'problem',
        title: 'Memory leak during distributed model fine-tuning with LoRA on campus GPU cluster',
        content: `When launching a 7B parameter LLM fine-tuning job across node 04 and node 05 with PyTorch FSDP + HuggingFace PEFT, the VRAM consumption steadily creeps up by 200MB every 100 steps until we hit CUDA Out of Memory error at step 650.\n\nGarbage collection \`gc.collect()\` and \`torch.cuda.empty_cache()\` inside the training loop did not solve it. Suspecting optimizer state retention or DataLoader pin_memory leak. Any pointers from ML lab mentors?`,
        authorId: 'mem-student-3',
        categoryId: 'cat-1',
        communityId: 'comm-ai',
        status: 'open',
        voteScore: 22,
        upvotesCount: 23,
        downvotesCount: 1,
        replyCount: 0,
        viewCount: 310,
        acceptedReplyId: null,
        linkedProjectId: null,
        linkedEventId: null,
        tagSlugs: ['ai-ml', 'python'],
        isPinned: false,
        isLocked: false,
        createdAt: new Date(Date.now() - 64800000).toISOString(),
        updatedAt: new Date(Date.now() - 64800000).toISOString()
      },
      {
        id: 'post-4',
        postType: 'announcement',
        title: 'HackSprint 2026: Mentor Office Hours & Technical Tracks Announced!',
        content: `Welcome participants to HackSprint 2026! We have finalized 4 technical tracks:\n\n1. **Autonomous Campus & Green Energy**\n2. **AI-Driven Healthcare & Accessibility**\n3. **Decentralized Finance & Governance**\n4. **Open Innovation & Civic Tech**\n\nMentors will be active in this forum community during the entire 36-hour sprint. Tag questions with \`#hackathon-2026\` for guaranteed mentor triage within 30 minutes!`,
        authorId: 'mem-mentor-1',
        categoryId: 'cat-5',
        communityId: 'comm-hack-2026',
        status: 'open',
        voteScore: 89,
        upvotesCount: 90,
        downvotesCount: 1,
        replyCount: 0,
        viewCount: 1240,
        acceptedReplyId: null,
        linkedProjectId: null,
        linkedEventId: 'EVT-2026-01',
        tagSlugs: ['hackathon-2026'],
        isPinned: true,
        isLocked: false,
        createdAt: new Date(Date.now() - 43200000).toISOString(),
        updatedAt: new Date(Date.now() - 43200000).toISOString()
      },
      {
        id: 'post-5',
        postType: 'doubt',
        title: 'Should we use PostgreSQL Row-Level Security (RLS) or application middleware for tenant isolation?',
        content: `In our college clubs platform, multiple student societies need strictly isolated workspaces. While RLS enforces security right at the database layer, our team is concerned about query optimization and connection pooling limitations when using PgBouncer in transaction mode. Would love insights on real-world tradeoffs.`,
        authorId: 'mem-student-1',
        categoryId: 'cat-2',
        communityId: 'comm-webdev',
        status: 'open',
        voteScore: 19,
        upvotesCount: 20,
        downvotesCount: 1,
        replyCount: 0,
        viewCount: 215,
        acceptedReplyId: null,
        linkedProjectId: null,
        linkedEventId: null,
        tagSlugs: ['system-design'],
        isPinned: false,
        isLocked: false,
        createdAt: new Date(Date.now() - 21600000).toISOString(),
        updatedAt: new Date(Date.now() - 21600000).toISOString()
      }
    ];

    this.replies = [
      {
        id: 'reply-1-1',
        postId: 'post-1',
        parentReplyId: null,
        authorId: 'mem-mentor-2',
        content: `Great question! We faced the exact multipath issue in the Robotics lab last semester. Two critical recommendations:\n\n1. **1D Kalman Filter on RSSI:** Do not run trilateration on raw RSSI. Apply a lightweight 1D Kalman filter with process variance Q = 0.008 and measurement variance R = 4.0. This dampens momentary reflections without introducing perceptible lag.\n2. **K-Nearest Neighbors (KNN) Fingerprinting:** Traditional Euclidean trilateration fails indoors due to concrete wall reflections. Instead, pre-survey 20 reference points (grid of 2m x 2m) and store the RSSI vector. At runtime, perform weighted KNN (k=3) between measured RSSI vector and the offline radio map. We achieved 1.2m median accuracy with this approach!`,
        voteScore: 28,
        upvotesCount: 28,
        downvotesCount: 0,
        isAcceptedSolution: true,
        createdAt: new Date(Date.now() - 150000000).toISOString(),
        updatedAt: new Date(Date.now() - 150000000).toISOString()
      },
      {
        id: 'reply-1-2',
        postId: 'post-1',
        parentReplyId: 'reply-1-1',
        authorId: 'mem-student-1',
        content: `Thank you Dr. Arvind! We just ported your Kalman parameters to our ESP32 C++ firmware and the RSSI variance dropped from ±12 dBm down to ±2.5 dBm. Marking this as the accepted solution!`,
        voteScore: 12,
        upvotesCount: 12,
        downvotesCount: 0,
        isAcceptedSolution: false,
        createdAt: new Date(Date.now() - 130000000).toISOString(),
        updatedAt: new Date(Date.now() - 130000000).toISOString()
      },
      {
        id: 'reply-2-1',
        postId: 'post-2',
        parentReplyId: null,
        authorId: 'mem-mentor-1',
        content: `This is a phenomenal concept and aligns directly with our college innovation incubation mandate. Please use the **"Export to Idea Centre"** button on this post so the Dean of Academic Affairs and the incubation jury can review your technical specifications for campus grant funding.`,
        voteScore: 15,
        upvotesCount: 15,
        downvotesCount: 0,
        isAcceptedSolution: false,
        createdAt: new Date(Date.now() - 72000000).toISOString(),
        updatedAt: new Date(Date.now() - 72000000).toISOString()
      }
    ];

    this.votes = [
      { id: 'vote-1', userId: 'mem-student-2', targetType: 'post', targetId: 'post-1', value: 1 },
      { id: 'vote-2', userId: 'mem-mentor-1', targetType: 'post', targetId: 'post-1', value: 1 },
      { id: 'vote-3', userId: 'mem-student-1', targetType: 'post', targetId: 'post-2', value: 1 },
      { id: 'vote-4', userId: 'mem-mentor-1', targetType: 'reply', targetId: 'reply-1-1', value: 1 }
    ];

    this.bookmarks = [
      { id: 'bm-1', userId: 'mem-student-1', postId: 'post-2', createdAt: new Date().toISOString() },
      { id: 'bm-2', userId: 'mem-student-2', postId: 'post-1', createdAt: new Date().toISOString() }
    ];

    this.follows = [
      { id: 'fol-1', followerId: 'mem-student-1', targetType: 'user', targetId: 'mem-mentor-1' },
      { id: 'fol-2', followerId: 'mem-student-1', targetType: 'community', targetId: 'comm-project-nav' },
      { id: 'fol-3', followerId: 'mem-student-2', targetType: 'topic', targetId: 'cybersecurity' }
    ];

    this.ideaExports = [
      {
        id: 'exp-1',
        postId: 'post-2',
        ideaId: 'IDEA-2026-88',
        exportedBy: 'mem-student-2',
        status: 'in_review',
        ideaUrl: '/idea-centre/ideas/IDEA-2026-88',
        metadata: { juryReviewDate: '2026-10-05', category: 'EdTech & Governance' },
        exportedAt: new Date(Date.now() - 36000000).toISOString(),
        updatedAt: new Date(Date.now() - 36000000).toISOString()
      }
    ];

    this.contributionEvents = [
      { id: 'contrib-1', eventId: 'hash-evt-post-1', memberId: 'mem-student-1', contributionType: 'post', forumPostId: 'post-1', forumReplyId: null, value: 1, syncStatus: 'synced', createdAt: new Date().toISOString() },
      { id: 'contrib-2', eventId: 'hash-evt-ans-1', memberId: 'mem-mentor-2', contributionType: 'accepted_answer', forumPostId: 'post-1', forumReplyId: 'reply-1-1', value: 1, syncStatus: 'synced', createdAt: new Date().toISOString() },
      { id: 'contrib-3', eventId: 'hash-evt-post-2', memberId: 'mem-student-2', contributionType: 'post', forumPostId: 'post-2', forumReplyId: null, value: 1, syncStatus: 'synced', createdAt: new Date().toISOString() }
    ];

    this.reports = [];
  }
}

export const forumStore = new ForumStore();
