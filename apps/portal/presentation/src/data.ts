import type { Area } from '@cvs-garage/ui/presentation';

export type ServiceId = Exclude<Area, 'portal'>;

export const services: {
  id: ServiceId;
  number: string;
  name: string;
  verb: string;
  title: string;
  description: string;
  detail: string;
}[] = [
  {
    id: 'projects', number: '01', name: 'Projects', verb: 'Make',
    title: 'Good ideas deserve good company.',
    description: 'Find your people, bring your skills, and make something that means something.',
    detail: 'For the first sketch. The late-night build. The thing you’re proud to put your name on.',
  },
  {
    id: 'events', number: '02', name: 'Events', verb: 'Meet',
    title: 'You had to be there. So be there.',
    description: 'The workshop that opens a door. The evening that becomes a story. Make room for both.',
    detail: 'Less “I didn’t hear about it.” More “I’m glad I went.”',
  },
  {
    id: 'member-centre', number: '03', name: 'Member Centre', verb: 'Belong',
    title: 'A little more you. A lot more us.',
    description: 'A home for who you are, what you’re learning, and everything you’re becoming.',
    detail: 'Not just a profile. Your own small corner of a much bigger community.',
  },
  {
    id: 'leaderboards', number: '04', name: 'Leaderboards', verb: 'Grow',
    title: 'The work matters. So do the people.',
    description: 'Make meaningful contributions visible, and find a little motivation in each other.',
    detail: 'Recognition for showing up, sharing what you know, and moving things forward.',
  },
  {
    id: 'idea-centre', number: '05', name: 'Idea Centre', verb: 'Imagine',
    title: 'Every great thing starts with “what if.”',
    description: 'Put your half-formed thought out there. A different perspective might be all it needs.',
    detail: 'You don’t need the whole plan. Just a place to start the conversation.',
  },
  {
    id: 'forum', number: '06', name: 'Forum', verb: 'Talk',
    title: 'Someone here is wondering that, too.',
    description: 'Ask the small question. Share the useful answer. Keep the conversation going.',
    detail: 'Good communities are built one generous conversation at a time.',
  },
];

export interface Project { id: string; name: string; description: string; members: number }
export interface Idea { id: string; name: string; description: string; supporters: number }
export interface Reply { id: string; author: string; body: string }

export const sampleProjects: Project[] = [
  { id: 'greener-campus', name: 'A greener campus', description: 'Small experiments for a campus that wastes less.', members: 4 },
  { id: 'student-edit', name: 'The student edit', description: 'An independent journal, made by all kinds of minds.', members: 6 },
  { id: 'after-hours', name: 'After-hours radio', description: 'Good conversations. Questionable playlists.', members: 3 },
];

export const sampleEvents = [
  { id: 'design-evening', day: '08', month: 'Oct', name: 'Design after hours', description: 'An open studio for unfinished things.', place: 'Studio 02', time: '5:30 pm' },
  { id: 'weekend-build', day: '12', month: 'Oct', name: 'The weekend build', description: 'Bring an idea. Leave with a first version.', place: 'Innovation lab', time: '10:00 am' },
  { id: 'campus-social', day: '18', month: 'Oct', name: 'Meet your kind of different', description: 'New faces, familiar interests, no small talk required.', place: 'The courtyard', time: '4:00 pm' },
];

export const sampleIdeas: Idea[] = [
  { id: 'repair-cafe', name: 'A campus repair café', description: 'What if we fixed things together instead of throwing them away?', supporters: 18 },
  { id: 'quiet-corner', name: 'A quieter corner', description: 'A student-shaped map of the best places to think.', supporters: 12 },
  { id: 'skill-swap', name: 'The open skill swap', description: 'One hour teaching what you know. One hour learning something new.', supporters: 9 },
];

export const sampleThreads = [
  {
    id: 'first-year', title: 'What do you wish you knew in first year?',
    excerpt: 'The little things that made campus feel like home.',
    body: 'I’m collecting the advice that doesn’t make it into a handbook. What helped you find your feet, your people, or your favourite place on campus?',
    replies: [{ id: 'reply-1', author: 'A fellow student', body: 'Turn up to something before you feel ready. Most people are looking for a reason to say hello, too.' }],
  },
  {
    id: 'open-data', title: 'Anyone building with open campus data?',
    excerpt: 'Looking for a second pair of eyes on a small experiment.',
    body: 'We’re exploring how to make shared campus resources easier to find. Has anyone tried building a small directory or map? I’d love to hear what worked.',
    replies: [{ id: 'reply-2', author: 'A community member', body: 'Start with one building and a very small set of questions. Happy to share a few notes.' }],
  },
];

export const storySteps: { label: string; area: ServiceId; title: string; body: string; link: string }[] = [
  { label: 'A thought', area: 'idea-centre', title: '“What if we fixed it, instead?”', body: 'An old lamp. A broken zip. One student wonders if a campus repair café could give everyday things a second life. Into the Idea Centre it goes.', link: 'Start with an idea' },
  { label: 'A conversation', area: 'forum', title: 'Turns out, you’re not the only one.', body: 'Someone can sew. Someone knows their way around a circuit. A question in the Forum becomes a conversation with people who care about the same thing.', link: 'Find the conversation' },
  { label: 'A team', area: 'projects', title: 'Different skills. Something shared.', body: 'The conversation becomes a project. A few new faces become a team. The idea is still small, but now it has somewhere to grow.', link: 'Make it a project' },
  { label: 'A beginning', area: 'events', title: 'Now the whole campus is invited.', body: 'A room, an afternoon, and an event on the calendar. What started as a passing thought becomes something everyone can be part of.', link: 'Bring people together' },
];
