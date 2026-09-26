import { EventEntity } from '../types/events';

export const mockEvents: EventEntity[] = [
  {
    id: 'evt-101',
    title: 'HackSprint 2026',
    shortSummary: '24-hour national hackathon focused on AI and Open Source solutions.',
    fullDescription: 'Join hundreds of developers, designers, and innovators at HackSprint 2026. Build cutting-edge projects, compete for prizes, and connect with top industry mentors.',
    category: 'Technical',
    mode: 'Online',
    posterUrl: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80',
    organizerId: 'org-tech-club',
    organizerName: 'Tech Innovation Society',
    status: 'Published',
    registrationStartDate: '2026-09-01T00:00:00Z',
    registrationEndDate: '2026-10-10T23:59:59Z',
    eventStartDate: '2026-10-15T09:00:00Z',
    eventEndDate: '2026-10-16T09:00:00Z',
    location: {
      mode: 'Online',
      platformName: 'Google Meet & Discord',
      meetingUrl: 'https://meet.google.com/hacksprint-2026-demo',
    },
    rulesAndGuidelines: [
      'Teams must consist of 2 to 4 members.',
      'All code must be written during the 24-hour sprint duration.',
      'Pre-existing open source libraries are permitted with clear attribution.'
    ],
    subTracks: [
      { id: 'st-1', title: 'Generative AI & LLMs', description: 'Build innovative agents and tools.' },
      { id: 'st-2', title: 'Web3 & Decentralized Apps', description: 'Smart contracts and governance.' }
    ],
    schedule: [
      { id: 'sc-1', title: 'Opening Keynote & Rules Briefing', startTime: '2026-10-15T09:00:00Z', endTime: '2026-10-15T10:00:00Z', speakerOrHost: 'Alex Rivera' },
      { id: 'sc-2', title: 'Hacking Phase Commences', startTime: '2026-10-15T10:00:00Z', endTime: '2026-10-16T08:00:00Z' },
      { id: 'sc-3', title: 'Final Demos & Judging', startTime: '2026-10-16T08:00:00Z', endTime: '2026-10-16T09:00:00Z' }
    ],
    prizes: [
      { position: '1st', title: 'Grand Winner', rewardAmount: '$2,500 + Incubation Support' },
      { position: '2nd', title: 'Runner Up', rewardAmount: '$1,200' },
      { position: '3rd', title: 'Second Runner Up', rewardAmount: '$500' }
    ],
    judges: [
      { judgeId: 'jdg-01', name: 'Dr. Aris Thorne', designation: 'AI Research Lead', bio: 'Expert in NLP and neural architectures.', isAppointed: true }
    ],
    registrationRules: {
      maxCapacity: 500,
      allowAudience: true,
      allowJudgeApplications: true
    },
    attendanceTrackingEnabled: true,
    createdAt: '2026-08-15T10:00:00Z',
    updatedAt: '2026-09-01T10:00:00Z',
    isMock: true
  },
  {
    id: 'evt-102',
    title: 'Umeed Ki Udaan',
    shortSummary: 'Annual community social drive and charity awareness initiative.',
    fullDescription: 'Umeed Ki Udaan brings together students and citizens for a community outreach campaign dedicated to education access.',
    category: 'Social',
    mode: 'Offline',
    posterUrl: 'https://images.unsplash.com/photo-1531206715517-5c0ba140b2b8?auto=format&fit=crop&w=1200&q=80',
    organizerId: 'org-social-service',
    organizerName: 'NSS Student Chapter',
    status: 'Published',
    registrationStartDate: '2026-09-10T00:00:00Z',
    registrationEndDate: '2026-10-01T23:59:59Z',
    eventStartDate: '2026-10-05T08:00:00Z',
    eventEndDate: '2026-10-05T17:00:00Z',
    location: {
      mode: 'Offline',
      venue: 'Main Campus Quadrangle',
      roomOrHall: 'Open Amphitheatre',
      address: '742 College Avenue, Sector 4'
    },
    rulesAndGuidelines: [
      'Volunteers must carry valid ID proof.',
      'Follow campus safety instructions.'
    ],
    subTracks: [],
    schedule: [
      { id: 'sc-10', title: 'Assembly & Volunteer Briefing', startTime: '2026-10-05T08:00:00Z', endTime: '2026-10-05T09:00:00Z' }
    ],
    prizes: [],
    judges: [],
    registrationRules: {
      maxCapacity: 200,
      allowAudience: true,
      allowJudgeApplications: false
    },
    attendanceTrackingEnabled: true,
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-10T10:00:00Z',
    isMock: true
  },
  {
    id: 'evt-103',
    title: 'Cultural Night 2026',
    shortSummary: 'A vibrant evening of music, dance, and theatrical performances.',
    fullDescription: 'Experience extraordinary performances by student bands, dance troupes, and drama clubs.',
    category: 'Cultural',
    mode: 'Offline',
    posterUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80',
    organizerId: 'org-cultural-board',
    organizerName: 'Cultural Affairs Committee',
    status: 'Published',
    registrationStartDate: '2026-09-15T00:00:00Z',
    registrationEndDate: '2026-10-20T23:59:59Z',
    eventStartDate: '2026-10-25T18:00:00Z',
    eventEndDate: '2026-10-25T22:00:00Z',
    location: {
      mode: 'Offline',
      venue: 'Central Auditorium',
      roomOrHall: 'Main Stage',
      address: 'Campus Cultural Wing'
    },
    rulesAndGuidelines: ['Entry permitted with valid QR ticket only.'],
    subTracks: [],
    schedule: [],
    prizes: [],
    judges: [],
    registrationRules: {
      maxCapacity: 1000,
      allowAudience: true,
      allowJudgeApplications: false
    },
    attendanceTrackingEnabled: true,
    createdAt: '2026-09-15T10:00:00Z',
    updatedAt: '2026-09-15T10:00:00Z',
    isMock: true
  },
  {
    id: 'evt-104',
    title: 'CodeQuest Hybrid Challenge',
    shortSummary: 'Algorithmic programming contest with online prelims and onsite finals.',
    fullDescription: 'Test your problem-solving skills against complex algorithmic challenges.',
    category: 'Competitions',
    mode: 'Hybrid',
    posterUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80',
    organizerId: 'org-acm-chapter',
    organizerName: 'ACM Student Chapter',
    status: 'Published',
    registrationStartDate: '2026-09-01T00:00:00Z',
    registrationEndDate: '2026-10-12T23:59:59Z',
    eventStartDate: '2026-10-18T10:00:00Z',
    eventEndDate: '2026-10-18T16:00:00Z',
    location: {
      mode: 'Hybrid',
      platformName: 'CodeForces / Online Portal',
      meetingUrl: 'https://codequest.portal.internal',
      venue: 'Computer Science Lab 3',
      roomOrHall: 'CS-301'
    },
    rulesAndGuidelines: ['Individual participation only.'],
    subTracks: [],
    schedule: [],
    prizes: [{ position: '1st', title: 'Top Coder', rewardAmount: '$1,000' }],
    judges: [],
    registrationRules: {
      maxCapacity: 300,
      allowAudience: false,
      allowJudgeApplications: true
    },
    attendanceTrackingEnabled: true,
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-01T10:00:00Z',
    isMock: true
  },
  {
    id: 'evt-105',
    title: 'Math Olympiad',
    shortSummary: 'Rigorous mathematics competition for undergraduate scholars.',
    fullDescription: 'Prove mathematical theorems and solve advanced calculus and discrete math challenges.',
    category: 'Academic',
    mode: 'Offline',
    posterUrl: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=1200&q=80',
    organizerId: 'org-math-dept',
    organizerName: 'Department of Mathematics',
    status: 'Published',
    registrationStartDate: '2026-09-10T00:00:00Z',
    registrationEndDate: '2026-10-15T23:59:59Z',
    eventStartDate: '2026-10-22T10:00:00Z',
    eventEndDate: '2026-10-22T13:00:00Z',
    location: {
      mode: 'Offline',
      venue: 'Science Block B',
      roomOrHall: 'Hall 102'
    },
    rulesAndGuidelines: ['Calculators permitted for Section B only.'],
    subTracks: [],
    schedule: [],
    prizes: [],
    judges: [],
    registrationRules: {
      maxCapacity: 150,
      allowAudience: true,
      allowJudgeApplications: false
    },
    attendanceTrackingEnabled: false,
    createdAt: '2026-09-10T10:00:00Z',
    updatedAt: '2026-09-10T10:00:00Z',
    isMock: true
  },
  {
    id: 'evt-106',
    title: 'Inter-College Football Cup',
    shortSummary: 'High-octane football tournament between regional colleges.',
    fullDescription: 'Cheer for your team as 16 college squads compete for the championship trophy.',
    category: 'Sports',
    mode: 'Offline',
    posterUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80',
    organizerId: 'org-sports-council',
    organizerName: 'Sports Council',
    status: 'Published',
    registrationStartDate: '2026-09-01T00:00:00Z',
    registrationEndDate: '2026-10-05T23:59:59Z',
    eventStartDate: '2026-10-10T08:00:00Z',
    eventEndDate: '2026-10-12T18:00:00Z',
    location: {
      mode: 'Offline',
      venue: 'Main Sports Stadium',
      roomOrHall: 'Ground 1'
    },
    rulesAndGuidelines: ['Standard FIFA tournament regulations apply.'],
    subTracks: [],
    schedule: [],
    prizes: [{ position: '1st', title: 'Championship Trophy', rewardAmount: '$1,500' }],
    judges: [],
    registrationRules: {
      maxCapacity: 16,
      allowAudience: true,
      allowJudgeApplications: false
    },
    attendanceTrackingEnabled: true,
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-01T10:00:00Z',
    isMock: true
  },
  {
    id: 'evt-107',
    title: 'Design Thinking Workshop',
    shortSummary: 'Interactive hands-on session on UX research and rapid prototyping.',
    fullDescription: 'Learn user-centric design methodologies from senior Product Designers.',
    category: 'Workshops',
    mode: 'Online',
    posterUrl: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=1200&q=80',
    organizerId: 'org-design-guild',
    organizerName: 'Design Guild',
    status: 'Published',
    registrationStartDate: '2026-09-20T00:00:00Z',
    registrationEndDate: '2026-10-28T23:59:59Z',
    eventStartDate: '2026-10-30T14:00:00Z',
    eventEndDate: '2026-10-30T17:00:00Z',
    location: {
      mode: 'Online',
      platformName: 'Zoom Webinar',
      meetingUrl: 'https://zoom.us/j/design-thinking-workshop'
    },
    rulesAndGuidelines: ['Figma account required before session.'],
    subTracks: [],
    schedule: [],
    prizes: [],
    judges: [],
    registrationRules: {
      maxCapacity: 250,
      allowAudience: true,
      allowJudgeApplications: false
    },
    attendanceTrackingEnabled: true,
    createdAt: '2026-09-20T10:00:00Z',
    updatedAt: '2026-09-20T10:00:00Z',
    isMock: true
  }
];
