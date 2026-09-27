import { createPersistentStore } from '../../lib/persistent-store.js';

export function createEventsSeed() {
  return {
    events: [
      {
        id: 'EVT-2026-01',
        slug: 'hacksprint-2026',
        title: 'HackSprint 2026',
        summary: 'A 36-hour campus hackathon for practical AI and sustainable technology.',
        description:
          'Build with students, mentors, and community partners across AI, accessibility, and climate technology tracks. Teams receive mentor office hours, maker-space access, and a final demo slot.',
        category: 'Technical',
        mode: 'Hybrid',
        status: 'Published',
        startsAt: '2026-10-14T09:00:00.000Z',
        endsAt: '2026-10-15T21:00:00.000Z',
        registrationStartsAt: '2026-08-15T00:00:00.000Z',
        registrationEndsAt: '2026-10-10T23:59:59.000Z',
        venue: 'Innovation Hub and Discord',
        organizerId: 'org-tech-club',
        organizerName: 'Tech Innovation Society',
        capacity: 180,
        allowedRoles: ['Participant', 'Audience', 'Judge'],
        tags: ['Hackathon', 'AI', 'Sustainability', 'Open source'],
        schedule: [
          {
            id: 'EVT-2026-01-S1',
            title: 'Opening and challenge briefing',
            startsAt: '2026-10-14T09:00:00.000Z',
            endsAt: '2026-10-14T10:00:00.000Z'
          },
          {
            id: 'EVT-2026-01-S2',
            title: 'Mentor office hours',
            startsAt: '2026-10-14T16:00:00.000Z',
            endsAt: '2026-10-14T18:00:00.000Z'
          },
          {
            id: 'EVT-2026-01-S3',
            title: 'Final demos and awards',
            startsAt: '2026-10-15T17:00:00.000Z',
            endsAt: '2026-10-15T21:00:00.000Z'
          }
        ]
      },
      {
        id: 'EVT-2026-02',
        slug: 'tech-innovation-fest-2026',
        title: 'Annual Tech Innovation Fest 2026',
        summary: 'Three days of exhibits, startup pitches, research talks, and live demos.',
        description:
          'Explore student-built hardware, meet founders and researchers, and attend practical sessions spanning robotics, clean energy, product engineering, and responsible AI.',
        category: 'Competitions',
        mode: 'Offline',
        status: 'Published',
        startsAt: '2026-11-02T10:00:00.000Z',
        endsAt: '2026-11-04T18:00:00.000Z',
        registrationStartsAt: '2026-09-01T00:00:00.000Z',
        registrationEndsAt: '2026-10-28T23:59:59.000Z',
        venue: 'Main Campus Quadrangle',
        organizerId: 'org-innovation-council',
        organizerName: 'Campus Innovation Council',
        capacity: 600,
        allowedRoles: ['Participant', 'Audience'],
        tags: ['Exhibition', 'Startups', 'Robotics', 'Research'],
        schedule: [
          {
            id: 'EVT-2026-02-S1',
            title: 'Exhibition opens',
            startsAt: '2026-11-02T10:00:00.000Z',
            endsAt: '2026-11-02T12:00:00.000Z'
          },
          {
            id: 'EVT-2026-02-S2',
            title: 'Student startup pitch final',
            startsAt: '2026-11-03T14:00:00.000Z',
            endsAt: '2026-11-03T17:00:00.000Z'
          },
          {
            id: 'EVT-2026-02-S3',
            title: 'People’s choice showcase',
            startsAt: '2026-11-04T15:00:00.000Z',
            endsAt: '2026-11-04T18:00:00.000Z'
          }
        ]
      },
      {
        id: 'EVT-2026-03',
        slug: 'design-thinking-studio',
        title: 'Design Thinking Studio',
        summary: 'A small-group workshop on research, synthesis, and rapid prototyping.',
        description:
          'Work through a complete human-centred design cycle with campus accessibility as the brief. Bring a laptop and expect collaborative exercises throughout.',
        category: 'Workshops',
        mode: 'Online',
        status: 'Published',
        startsAt: '2026-10-30T14:00:00.000Z',
        endsAt: '2026-10-30T17:30:00.000Z',
        registrationStartsAt: '2026-09-15T00:00:00.000Z',
        registrationEndsAt: '2026-10-25T23:59:59.000Z',
        venue: 'Teams workshop room',
        organizerId: 'org-design-guild',
        organizerName: 'Design Guild',
        capacity: 1,
        allowedRoles: ['Participant'],
        tags: ['Design', 'UX research', 'Prototyping'],
        schedule: [
          {
            id: 'EVT-2026-03-S1',
            title: 'Research framing',
            startsAt: '2026-10-30T14:00:00.000Z',
            endsAt: '2026-10-30T15:00:00.000Z'
          },
          {
            id: 'EVT-2026-03-S2',
            title: 'Prototype critique',
            startsAt: '2026-10-30T16:15:00.000Z',
            endsAt: '2026-10-30T17:30:00.000Z'
          }
        ]
      },
      {
        id: 'EVT-2026-04',
        slug: 'robotics-lab-open-house',
        title: 'Robotics Lab Open House',
        summary: 'Tour active robotics research and meet the student engineering teams.',
        description:
          'See autonomous navigation, agricultural robotics, and assistive-device prototypes in the makerspace. Registration has closed so lab staff can prepare access groups.',
        category: 'Seminars',
        mode: 'Offline',
        status: 'Published',
        startsAt: '2026-10-01T11:00:00.000Z',
        endsAt: '2026-10-01T14:00:00.000Z',
        registrationStartsAt: '2026-08-20T00:00:00.000Z',
        registrationEndsAt: '2026-09-20T23:59:59.000Z',
        venue: 'Robotics Lab, Engineering Block',
        organizerId: 'org-robotics-lab',
        organizerName: 'Robotics and Mechatronics Lab',
        capacity: 40,
        allowedRoles: ['Audience'],
        tags: ['Robotics', 'Lab tour', 'Research'],
        schedule: [
          {
            id: 'EVT-2026-04-S1',
            title: 'Safety briefing and lab tour',
            startsAt: '2026-10-01T11:00:00.000Z',
            endsAt: '2026-10-01T12:30:00.000Z'
          },
          {
            id: 'EVT-2026-04-S2',
            title: 'Student team demonstrations',
            startsAt: '2026-10-01T12:30:00.000Z',
            endsAt: '2026-10-01T14:00:00.000Z'
          }
        ]
      },
      {
        id: 'EVT-2026-05',
        slug: 'responsible-ai-symposium',
        title: 'Responsible AI Symposium',
        summary: 'Faculty and student perspectives on safe, useful, and accountable AI.',
        description:
          'A completed half-day symposium covering evaluation, privacy, accessibility, and the social impact of deployed AI systems.',
        category: 'Academic',
        mode: 'Hybrid',
        status: 'Completed',
        startsAt: '2026-09-12T09:30:00.000Z',
        endsAt: '2026-09-12T14:30:00.000Z',
        registrationStartsAt: '2026-08-01T00:00:00.000Z',
        registrationEndsAt: '2026-09-08T23:59:59.000Z',
        venue: 'Central Auditorium and campus stream',
        organizerId: 'org-ai-lab',
        organizerName: 'Centre for Responsible Computing',
        capacity: 220,
        allowedRoles: ['Audience'],
        tags: ['Responsible AI', 'Research', 'Policy'],
        schedule: [
          {
            id: 'EVT-2026-05-S1',
            title: 'Opening keynote',
            startsAt: '2026-09-12T09:30:00.000Z',
            endsAt: '2026-09-12T10:30:00.000Z'
          },
          {
            id: 'EVT-2026-05-S2',
            title: 'Student research panel',
            startsAt: '2026-09-12T12:00:00.000Z',
            endsAt: '2026-09-12T13:15:00.000Z'
          }
        ]
      }
    ],
    registrations: [
      {
        id: 'EVT-REG-001',
        eventId: 'EVT-2026-01',
        memberId: 'mem-student-2',
        role: 'Participant',
        status: 'Registered',
        registeredAt: '2026-09-18T09:30:00.000Z'
      },
      {
        id: 'EVT-REG-002',
        eventId: 'EVT-2026-02',
        memberId: 'mem-student-1',
        role: 'Audience',
        status: 'Registered',
        registeredAt: '2026-09-21T13:15:00.000Z'
      },
      {
        id: 'EVT-REG-003',
        eventId: 'EVT-2026-03',
        memberId: 'mem-student-3',
        role: 'Participant',
        status: 'Registered',
        registeredAt: '2026-09-22T08:45:00.000Z'
      }
    ]
  };
}

export function createEventsStore(options = {}) {
  return createPersistentStore('events', createEventsSeed, options);
}

export const eventsStore = createEventsStore();
