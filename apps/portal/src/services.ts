import type { Area } from '@cvs-garage/contracts';

export const services: { area: Area; path: string; title: string; verb: string; description: string; number: string }[] = [
  { area: 'projects', path: '/projects', title: 'Projects', verb: 'Make it real.', description: 'From a first pitch to something you can point to. Build, learn and ship together.', number: '01' },
  { area: 'events', path: '/events', title: 'Events', verb: 'Be in the room.', description: 'Workshops, open mics and unexpected conversations. Find a reason to show up.', number: '02' },
  { area: 'member-centre', path: '/members', title: 'Member Centre', verb: 'Find your people.', description: 'Different skills. Shared curiosity. Meet the people who make this place what it is.', number: '03' },
  { area: 'leaderboards', path: '/leaderboards', title: 'Leaderboards', verb: 'Good work, noticed.', description: 'A little recognition for the effort, ideas and contributions that move us forward.', number: '04' },
  { area: 'idea-centre', path: '/ideas', title: 'Idea Centre', verb: 'What if starts here.', description: 'An unfinished thought is a fine place to start. Share yours, or help someone else.', number: '05' },
  { area: 'forum', path: '/forum', title: 'Forum', verb: 'Keep talking.', description: 'Ask a question, share a small win or work through the things you haven’t figured out.', number: '06' },
];
export function routeArea(path: string): Area { return services.find((s) => path === s.path || path.startsWith(`${s.path}/`))?.area ?? 'portal'; }
