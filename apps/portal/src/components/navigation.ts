import {
  CalendarDays,
  Home,
  Lightbulb,
  MessageSquareText,
  PanelsTopLeft,
  Trophy,
  Users,
  type LucideIcon
} from 'lucide-react';
import type { AreaId } from '../../../../packages/ui/src';

interface WorkspaceLink {
  to: string;
  label: string;
  tabLabel?: string;
  description: string;
  area: AreaId;
  icon: LucideIcon;
}

export const workspaceNavigation: WorkspaceLink[] = [
  { to: '/', label: 'Overview', description: 'Your campus, all in one place', area: 'portal', icon: Home },
  { to: '/projects', label: 'Projects', description: 'Build something that matters', area: 'projects', icon: PanelsTopLeft },
  { to: '/events', label: 'Events', description: 'Show up. Get inspired.', area: 'events', icon: CalendarDays },
  { to: '/member-centre', label: 'Member Centre', tabLabel: 'Members', description: 'Find your people and mentors', area: 'member-centre', icon: Users },
  { to: '/leaderboards', label: 'Leaderboards', tabLabel: 'Rankings', description: 'Celebrate the people making a difference', area: 'leaderboards', icon: Trophy },
  { to: '/idea-centre', label: 'Idea Centre', tabLabel: 'Ideas', description: 'Give your next big idea a home', area: 'idea-centre', icon: Lightbulb },
  { to: '/forum', label: 'Forum', description: 'Good questions start great conversations', area: 'forum', icon: MessageSquareText }
];
