import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Avatar, Button, Menu, MenuItem, MenuList, MenuPopover, MenuTrigger, Select } from '@fluentui/react-components';
import { BuildingHome24Regular, Search20Regular, Navigation24Regular, WeatherMoon20Regular, WeatherSunny20Regular, Alert24Regular, ArrowRight20Regular, SignOut20Regular, Checkmark20Regular, ArrowUpRight20Regular } from '@fluentui/react-icons';
import { AreaIcon, ColorRail, Modal, LoadingState, ErrorState, EmptyState, SearchField, ServiceMark, useTheme, useDebounced, dateLabel, areaLabels } from '@cvs-garage/ui';
import { useApiMutation, useApiQuery } from '@cvs-garage/api-client';
import { useQueryClient } from '@tanstack/react-query';
import type { Notification, SearchResult, Session } from '@cvs-garage/contracts';
import { services, routeArea } from './services';

export function Brand({ compact = false }: { compact?: boolean }) { return <Link to="/" className={`brand ${compact ? 'compact' : ''}`} aria-label="CVS Garage landing page"><span className="brand-icon"><BuildingHome24Regular aria-hidden /></span><span><strong>CVS Garage</strong>{!compact && <small>A shared campus.</small>}</span></Link>; }
export function ThemeSwitch() {
  const { mode, resolved, setMode } = useTheme();
  return <Menu><MenuTrigger disableButtonEnhancement><Button appearance="subtle" aria-label={`Appearance: ${mode}`} icon={resolved === 'dark' ? <WeatherMoon20Regular /> : <WeatherSunny20Regular />} /></MenuTrigger><MenuPopover><MenuList>
    {(['light', 'dark', 'system'] as const).map((value) => <MenuItem key={value} icon={mode === value ? <Checkmark20Regular /> : undefined} onClick={() => setMode(value)}>{value[0].toUpperCase() + value.slice(1)}{value === 'system' ? ' preference' : ' mode'}</MenuItem>)}
  </MenuList></MenuPopover></Menu>;
}
export function Shell({ session }: { session: Session }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const notifications = useApiQuery<Notification[]>('/notifications', { enabled: Boolean(session.member), refetchInterval: 60_000 });
  const mutation = useApiMutation();
  const navigate = useNavigate();
  const client = useQueryClient();
  const location = useLocation();
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setSearchOpen((value) => !value); } if (event.key === 'Escape') setMobileOpen(false); };
    window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler);
  }, []);
  async function signOut() { await mutation.mutateAsync({ path: '/session/sign-out' }); client.clear(); navigate('/'); }
  const nav = <><div className="nav-label">Your campus</div><NavLink to="/home" className="side-link"><AreaIcon area="portal" /><span>Home</span></NavLink><div className="nav-label spaces-label">The spaces</div>{services.map((service) => <NavLink key={service.path} to={service.path} className="side-link" data-service={service.area}><AreaIcon area={service.area} /><span>{service.title}</span><i aria-hidden /></NavLink>)}<div className="sidebar-note"><p>Good things start<br />with a conversation.</p><Link to="/forum" className="text-link">Pull up a chair <ArrowUpRight20Regular /></Link></div></>;
  return <div className="app-shell">
    <aside className="sidebar"><Brand /><nav aria-label="Campus navigation">{nav}</nav><div className="sidebar-bottom"><ColorRail /><span>Made for the in-between.</span><Link to="/">About the Garage <ArrowUpRight20Regular /></Link></div></aside>
    <div className="app-workspace"><header className="app-topbar"><div className="topbar-leading"><Button className="mobile-menu-button" appearance="subtle" icon={<Navigation24Regular />} aria-label="Open campus navigation" onClick={() => setMobileOpen(true)} /><span className="breadcrumb">The Garage <span>/</span> <strong>{areaLabels[routeArea(location.pathname)]}</strong></span></div>
      <div className="topbar-actions"><Button className="global-search-button" appearance="subtle" icon={<Search20Regular />} onClick={() => setSearchOpen(true)}><span>Search campus</span><kbd>Ctrl K</kbd></Button><ThemeSwitch />
      {session.member ? <><Button appearance="subtle" className="notification-button" aria-label="Notifications" icon={<Alert24Regular />} onClick={() => setNotificationOpen(true)}>{notifications.data?.some((n) => !n.readAt) && <i className="notification-dot" />}</Button><Menu><MenuTrigger disableButtonEnhancement><Button appearance="transparent" className="profile-button" aria-label="Account menu" icon={<Avatar name={session.member.displayName} size={32} color="neutral" />} /></MenuTrigger><MenuPopover><MenuList><MenuItem onClick={() => navigate('/members?tab=profile')}>Your profile</MenuItem><MenuItem icon={<SignOut20Regular />} onClick={() => void signOut()}>Sign out</MenuItem></MenuList></MenuPopover></Menu></> : <Link className="text-link sign-in-link" to="/sign-in">Sign in <ArrowRight20Regular /></Link>}
      </div></header>
      {session.demo && <div className="demo-strip"><span className="demo-label">Local demo</span><span>A fictional campus, with real working features.</span><span className="demo-status">{session.member ? 'Changes are saved on this device’s server' : 'Explore freely · sign in to take part'}</span></div>}
      <Outlet />
    </div>
    <Modal open={mobileOpen} onClose={() => setMobileOpen(false)} title="Your campus"><nav className="mobile-navigation" aria-label="Mobile campus navigation">{nav}</nav></Modal>
    <CampusSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    <Modal open={notificationOpen} onClose={() => setNotificationOpen(false)} title="A few things for you">
      {notifications.isPending ? <LoadingState label="Loading notifications" /> : notifications.error ? <ErrorState error={notifications.error} retry={() => void notifications.refetch()} /> : notifications.data?.length ? <div className="notification-list">{notifications.data.map((n) => <div className="notification-row" key={n.id}><Link to={n.href} onClick={() => { setNotificationOpen(false); if (!n.readAt) mutation.mutate({ path: `/notifications/${n.id}/read`, method: 'PATCH' }); }}><p>{n.message}</p><small>{dateLabel(n.createdAt)}</small></Link>{!n.readAt && <Button appearance="subtle" aria-label="Mark as read" icon={<Checkmark20Regular />} onClick={() => mutation.mutate({ path: `/notifications/${n.id}/read`, method: 'PATCH' })} />}</div>)}</div> : <EmptyState title="All caught up" description="Updates from your teams and campus will appear here." />}
    </Modal>
  </div>;
}

function CampusSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState(''); const search = useDebounced(q);
  const result = useApiQuery<SearchResult[]>(`/search?q=${encodeURIComponent(search)}`, { enabled: open && search.length >= 2 });
  return <Modal open={open} onClose={onClose} title="Find your corner of campus" wide><div className="campus-search"><SearchField value={q} onChange={setQ} placeholder="Projects, ideas, events, conversations…" label="Search all campus services" />
    {search.length < 2 ? <div className="search-shortcuts"><p className="eyebrow">Or go straight to a space</p>{services.map((s) => <Link key={s.path} to={s.path} onClick={onClose}><ServiceMark area={s.area} /><span>{s.title}</span><ArrowRight20Regular /></Link>)}</div> : result.isPending ? <LoadingState label="Searching campus" /> : result.error ? <ErrorState error={result.error} retry={() => void result.refetch()} /> : result.data?.length ? <ul className="search-results">{result.data.map((r) => <li key={`${r.area}-${r.id}`}><Link to={r.href} onClick={onClose}><ServiceMark area={r.area} /><div><strong>{r.title}</strong><span>{r.description}</span></div><ArrowRight20Regular /></Link></li>)}</ul> : <EmptyState title="No matches this time" description="Try a different word, or browse one of the six spaces." />}
  </div></Modal>;
}
