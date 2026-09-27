import { createPersistentStore } from '../../lib/persistent-store.js';

export function createIdeaSeed() {
  return {
    nextTicketNumber: 104,
    ideas: [
      {
        id: 'IDEA-2026-101',
        ticketCode: 'IDEA-2026-101',
        title: 'Solar-powered campus irrigation',
        tagline: 'Use soil data to water campus gardens only when needed',
        description:
          'A low-cost sensor network that schedules irrigation from live soil moisture and local weather data.',
        track: 'Sustainability',
        difficulty: 'Hard',
        status: 'Open',
        ownerId: 'mem-student-1',
        assignedMentorId: 'mem-mentor-2',
        seekingMentor: false,
        targetTeamSize: 4,
        memberIds: ['mem-student-1'],
        techStack: ['ESP32', 'LoRaWAN', 'TypeScript'],
        createdAt: '2026-08-12T09:30:00.000Z'
      },
      {
        id: 'IDEA-2026-102',
        ticketCode: 'IDEA-2026-102',
        title: 'Accessible campus wayfinding',
        tagline: 'Step-free, low-vision-friendly routes between every college building',
        description:
          'Create an accessibility-first map with obstacle reports, indoor landmarks, and screen-reader-ready directions.',
        track: 'Campus Experience',
        difficulty: 'Medium',
        status: 'Open',
        ownerId: 'mem-student-2',
        assignedMentorId: null,
        seekingMentor: true,
        targetTeamSize: 5,
        memberIds: ['mem-student-2'],
        techStack: ['React', 'OpenStreetMap', 'Node.js'],
        createdAt: '2026-08-25T11:15:00.000Z'
      },
      {
        id: 'IDEA-2026-103',
        ticketCode: 'IDEA-2026-103',
        title: 'Peer micro-internship exchange',
        tagline: 'Short campus projects that turn classroom skills into experience',
        description:
          'Match student organisations with small, mentored delivery briefs that can be completed in two weeks.',
        track: 'Student Life',
        difficulty: 'Easy',
        status: 'Open',
        ownerId: 'mem-student-1',
        assignedMentorId: 'mem-mentor-1',
        seekingMentor: false,
        targetTeamSize: 2,
        memberIds: ['mem-student-1', 'mem-student-2'],
        techStack: ['Research', 'Service Design'],
        createdAt: '2026-07-18T14:00:00.000Z'
      },
      {
        id: 'IDEA-2026-88',
        ticketCode: 'IDEA-2026-88',
        title: 'Decentralized Campus Academic Credentials using Verifiable Credentials (W3C)',
        tagline: 'A Forum proposal ready for incubation review',
        description:
          'Explore portable, verifiable academic credentials while protecting student privacy and institutional trust.',
        track: 'Community Innovation',
        difficulty: 'Hard',
        status: 'In Progress',
        ownerId: 'mem-student-2',
        assignedMentorId: null,
        seekingMentor: true,
        targetTeamSize: 5,
        memberIds: ['mem-student-2'],
        techStack: ['W3C Verifiable Credentials', 'Identity'],
        sourceForumPostId: 'post-2',
        exportStatus: 'in_review',
        createdAt: '2026-09-26T18:00:00.000Z'
      }
    ],
    saves: [
      {
        ideaId: 'IDEA-2026-102',
        memberId: 'mem-student-1',
        createdAt: '2026-09-01T08:30:00.000Z'
      }
    ],
    joinRequests: [],
    comments: [
      {
        id: 'idea-comment-1',
        ideaId: 'IDEA-2026-102',
        authorId: 'mem-mentor-1',
        content: 'Please include a route-quality review with students who use mobility aids.',
        createdAt: '2026-09-02T10:00:00.000Z'
      }
    ]
  };
}

export const ideaStore = createPersistentStore('idea-centre', createIdeaSeed);
