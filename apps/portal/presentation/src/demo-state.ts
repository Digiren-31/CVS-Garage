import { sampleIdeas, sampleProjects, type Idea, type Project, type Reply } from './data';

export interface DemoState {
  projects: Project[];
  ideas: Idea[];
  joined: string[];
  reserved: string[];
  supported: string[];
  profile: { name: string; about: string };
  replies: Record<string, Reply[]>;
}

export function createDemoState(): DemoState {
  return {
    projects: [...sampleProjects], ideas: [...sampleIdeas], joined: [], reserved: [], supported: [],
    profile: { name: 'Alex', about: 'A curious mind. A work in progress. Here to make good things with good people.' },
    replies: {},
  };
}

export type DemoAction =
  | { type: 'join'; id: string }
  | { type: 'reserve'; id: string }
  | { type: 'support'; id: string }
  | { type: 'add-project'; project: Project }
  | { type: 'add-idea'; idea: Idea }
  | { type: 'profile'; profile: DemoState['profile'] }
  | { type: 'reply'; thread: string; reply: Reply }
  | { type: 'reset' };

const toggle = (values: string[], value: string) => values.includes(value)
  ? values.filter((item) => item !== value) : [...values, value];

export function demoReducer(state: DemoState, action: DemoAction): DemoState {
  switch (action.type) {
    case 'join': return { ...state, joined: toggle(state.joined, action.id) };
    case 'reserve': return { ...state, reserved: toggle(state.reserved, action.id) };
    case 'support': return { ...state, supported: toggle(state.supported, action.id) };
    case 'add-project': return { ...state, projects: [action.project, ...state.projects], joined: [...state.joined, action.project.id] };
    case 'add-idea': return { ...state, ideas: [action.idea, ...state.ideas] };
    case 'profile': return { ...state, profile: action.profile };
    case 'reply': return { ...state, replies: { ...state.replies, [action.thread]: [...(state.replies[action.thread] ?? []), action.reply] } };
    case 'reset': return createDemoState();
  }
}
