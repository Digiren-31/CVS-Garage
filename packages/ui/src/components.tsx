import { Component, useEffect, useRef, useState, type ErrorInfo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Avatar, Badge, Button, Dialog, DialogBody, DialogContent, DialogSurface, DialogTitle, DialogActions, Input, Select, Spinner, Tooltip } from '@fluentui/react-components';
import { ArrowRight20Regular, Dismiss20Regular, Search20Regular, Folder24Regular, CalendarLtr24Regular, People24Regular, Trophy24Regular, Lightbulb24Regular, ChatMultiple24Regular, Home24Regular, ArrowLeft20Regular } from '@fluentui/react-icons';
import type { Area, Member } from '@cvs-garage/contracts';

export const areaLabels: Record<Area, string> = { portal: 'Campus home', projects: 'Projects', events: 'Events', 'member-centre': 'Member Centre', leaderboards: 'Leaderboards', 'idea-centre': 'Idea Centre', forum: 'Forum' };
const icons = { portal: Home24Regular, projects: Folder24Regular, events: CalendarLtr24Regular, 'member-centre': People24Regular, leaderboards: Trophy24Regular, 'idea-centre': Lightbulb24Regular, forum: ChatMultiple24Regular };
export function AreaIcon({ area }: { area: Area }) { const Icon = icons[area]; return <Icon aria-hidden />; }
export function ServiceMark({ area, large = false }: { area: Area; large?: boolean }) { return <span className={`service-mark ${large ? 'large' : ''}`} data-service={area}><AreaIcon area={area} /></span>; }
export function ColorRail() { return <div className="color-rail" aria-hidden>{(['projects', 'events', 'member-centre', 'leaderboards', 'idea-centre', 'forum'] as Area[]).map((area) => <i key={area} data-service={area} />)}</div>; }
export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <header className="page-heading"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1 tabIndex={-1}>{title}</h1>{description && <p>{description}</p>}</div>{action && <div className="heading-action">{action}</div>}</header>;
}
export function SectionHeading({ title, description, to, linkText = 'View all' }: { title: string; description?: string; to?: string; linkText?: string }) {
  return <div className="section-heading"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{to && <Link className="text-link" to={to}>{linkText}<ArrowRight20Regular aria-hidden /></Link>}</div>;
}
export function EmptyState({ title = 'Nothing here just yet', description, action }: { title?: string; description: string; action?: ReactNode }) {
  return <div className="empty-state"><span className="empty-symbol" aria-hidden>↗</span><h3>{title}</h3><p>{description}</p>{action}</div>;
}
export function LoadingState({ label = 'Loading your campus…' }: { label?: string }) {
  return <div className="loading-state" role="status"><Spinner size="small" label={label} /><div className="skeleton-lines" aria-hidden><i /><i /><i /></div></div>;
}
export function ErrorState({ error, retry }: { error: unknown; retry?: () => void }) {
  return <div className="error-state" role="alert"><h3>Couldn’t load this part of campus</h3><p>{error instanceof Error ? error.message : 'Something went wrong. Please try again.'}</p>{retry && <Button onClick={retry}>Try again</Button>}</div>;
}
export function InlineError({ error }: { error: unknown }) { return error ? <p className="form-error" role="alert">{error instanceof Error ? error.message : String(error)}</p> : null; }
export function StatusBadge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'success' | 'warning' | 'brand' }) {
  return <Badge appearance="tint" color={tone === 'success' ? 'success' : tone === 'warning' ? 'warning' : tone === 'brand' ? 'brand' : 'informative'} shape="rounded">{children}</Badge>;
}
export function Person({ member, secondary, size = 36 }: { member: Pick<Member, 'displayName' | 'avatarUrl'>; secondary?: string; size?: 32 | 36 | 40 | 48 | 64 }) {
  return <div className="person"><Avatar name={member.displayName} image={member.avatarUrl ? { src: member.avatarUrl } : undefined} size={size} color="neutral" /><div><strong>{member.displayName}</strong>{secondary && <span>{secondary}</span>}</div></div>;
}
export function SearchField({ value, onChange, placeholder = 'Search', label = 'Search' }: { value: string; onChange: (value: string) => void; placeholder?: string; label?: string }) {
  return <Input className="search-field" aria-label={label} placeholder={placeholder} contentBefore={<Search20Regular />} value={value} onChange={(_, data) => onChange(data.value)} />;
}
export function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) {
  return <label className="filter-select"><span>{label}</span><Select value={value} onChange={(_, data) => onChange(data.value)}>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select></label>;
}
export function Modal({ open, onClose, title, children, actions, wide = false }: { open: boolean; onClose: () => void; title: string; children: ReactNode; actions?: ReactNode; wide?: boolean }) {
  const focus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (open) { focus.current = document.activeElement as HTMLElement; return () => { focus.current?.focus(); }; }
  }, [open]);
  return <Dialog open={open} onOpenChange={(_, data) => { if (!data.open) onClose(); }}><DialogSurface className={wide ? 'modal-surface wide' : 'modal-surface'}><DialogBody>
    <DialogTitle action={<Button appearance="subtle" icon={<Dismiss20Regular />} aria-label="Close dialog" onClick={onClose} />}>{title}</DialogTitle>
    <DialogContent>{children}</DialogContent>{actions && <DialogActions>{actions}</DialogActions>}
  </DialogBody></DialogSurface></Dialog>;
}
export function BackLink({ to, children }: { to: string; children: ReactNode }) { return <Link className="text-link back-link" to={to}><ArrowLeft20Regular />{children}</Link>; }
export function SignInNote() { return <div className="notice"><p>A little more is possible when you’re signed in.</p><Link to="/sign-in" className="text-link">Sign in to take part <ArrowRight20Regular /></Link></div>; }
export function ExternalLink({ href, children, className }: { href?: string | null; children: ReactNode; className?: string }) {
  if (!href || !/^https:\/\//i.test(href)) return null;
  return <a href={href} target="_blank" rel="noopener noreferrer" className={className ?? 'text-link'}>{children}<span className="sr-only"> (opens in a new tab)</span></a>;
}
export function Pager({ hasMore, cursor, onPage, nextCursor }: { hasMore: boolean; cursor: string; onPage: (cursor: string) => void; nextCursor?: string | null }) {
  return cursor !== '0' || hasMore ? <nav aria-label="Results pages" className="pager"><Button disabled={cursor === '0'} onClick={() => onPage(String(Math.max(0, Number(cursor) - 24)))}>Previous</Button><span>Page {Math.floor(Number(cursor) / 24) + 1}</span><Button disabled={!hasMore} onClick={() => onPage(nextCursor ?? String(Number(cursor) + 24))}>Next</Button></nav> : null;
}
export function useDebounced<T>(value: T, delay = 220) { const [debounced, setDebounced] = useState(value); useEffect(() => { const timer = setTimeout(() => setDebounced(value), delay); return () => clearTimeout(timer); }, [value, delay]); return debounced; }
export function dateLabel(value: string, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) { return new Intl.DateTimeFormat('en', options).format(new Date(value)); }
export function statusLabel(value: string) { return value.replace(/_/g, ' ').toLowerCase().replace(/^./, (s) => s.toUpperCase()).replace('In progress', 'In progress'); }
export function IconButton({ label, onClick, icon, disabled = false }: { label: string; onClick: () => void; icon: ReactNode; disabled?: boolean }) { return <Tooltip content={label} relationship="label"><Button appearance="subtle" aria-label={label} icon={icon} onClick={onClick} disabled={disabled} /></Tooltip>; }
export class RenderBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Page render failed', error, info.componentStack); }
  render() { return this.state.failed ? <ErrorState error={new Error('This page could not be displayed. Reload to try again.')} retry={() => location.reload()} /> : this.props.children; }
}
