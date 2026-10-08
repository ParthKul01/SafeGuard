import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, LogOut, Moon, ShieldCheck, Sun } from 'lucide-react';
import { NAV } from './nav';
import { useTheme } from '../hooks/useTheme';
import { useBackendStatus } from '../hooks/useBackendStatus';
import { api } from '../services/api';
import { clearAuthSession, getAuthSession } from '../services/auth';
import { useSafety } from '../context/SafetyContext';
import MicrophonePermissionNotice from './MicrophonePermissionNotice';
import LocationSharingControl from './LocationSharingControl';

const STATUS = { checking: { label: 'Connecting...', dot: 'bg-muted' }, online: { label: 'Service connected', dot: 'bg-safe' }, offline: { label: 'Service unavailable', dot: 'bg-warn' } } as const;
const link = ({ isActive }: { isActive: boolean }) => 'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ' + (isActive ? 'bg-primary/15 text-primary' : 'text-muted hover:text-fg');

export default function Layout() {
  const { dark, toggle } = useTheme();
  const backend = useBackendStatus();
  const status = STATUS[backend];
  const location = useLocation();
  const navigate = useNavigate();
  const session = getAuthSession();
  const { geo, locationAvailable } = useSafety();
  const isAdmin = session?.user.role === 'ADMIN';
  const navItems = NAV.filter((item) => !item.adminOnly || isAdmin);
  const current = navItems.find((item) => item.to === location.pathname);
  const dangerArea = geo?.status === 'INSIDE' ? geo.zones.find((zone) => zone.inside) : undefined;
  async function signOut() {
    try { await api<{ ok: boolean }>('/auth/logout', { method: 'POST' }); } catch { /* Clear the local session if offline. */ }
    clearAuthSession();
    navigate('/login', { replace: true });
  }
  return <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
    <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-surface px-4 py-6 lg:flex">
      <Link to="/dashboard" className="mb-9 flex items-center gap-3 px-2"><span className="grid size-10 place-items-center rounded-xl bg-primary text-white"><ShieldCheck size={21} /></span><span><b className="block text-lg leading-tight">SafeGaurd</b><small className="text-xs text-muted">Personal safety</small></span></Link>
      <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-muted">Workspace</p>
      <nav className="flex flex-col gap-1" aria-label="Main navigation">{navItems.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end={to === '/dashboard'} className={({ isActive }) => link({ isActive }) + ' ' + (isActive ? 'border-l-2 border-primary' : 'border-l-2 border-transparent')}><Icon size={18} strokeWidth={1.8} />{label}</NavLink>)}</nav>
      <div className="mt-auto rounded-xl border border-line bg-bg p-3"><p className="text-xs font-semibold">Stay prepared</p><p className="mt-1 text-xs leading-5 text-muted">Keep your location permission and trusted contacts up to date.</p></div>
    </aside>
    <div className="flex min-w-0 flex-col pb-20 lg:pb-0">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-bg/95 px-4 py-3 backdrop-blur lg:px-8"><Link to="/dashboard" className="flex items-center gap-2 font-semibold lg:hidden"><span className="grid size-8 place-items-center rounded-lg bg-primary text-white"><ShieldCheck size={17} /></span>SafeGaurd</Link><div className="hidden text-xs font-semibold uppercase tracking-[.14em] text-muted lg:block">{current?.label ?? 'Workspace'}</div>
        <div className="flex items-center gap-2 sm:gap-3"><span className="hidden max-w-40 truncate text-xs font-medium text-muted sm:inline">{session?.user.name ?? 'Your account'}</span><span className="flex items-center gap-2 text-xs text-muted sm:text-sm"><span className={'size-2 rounded-full ' + status.dot} /><span className="hidden sm:inline">{status.label}</span><span className="sm:hidden">{backend === 'online' ? 'Online' : backend === 'offline' ? 'Offline' : 'Checking'}</span></span><button onClick={toggle} aria-label="Toggle theme" className="rounded-lg border border-line p-2 text-muted hover:text-fg">{dark ? <Sun size={16} /> : <Moon size={16} />}</button><button onClick={() => void signOut()} aria-label="Sign out" title="Sign out" className="rounded-lg border border-line p-2 text-muted hover:border-danger/40 hover:text-danger"><LogOut size={16} /></button></div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-8 pt-6 lg:px-9 lg:py-9">
        {!location.pathname.startsWith('/admin') && <MicrophonePermissionNotice />}<LocationSharingControl />
        {locationAvailable && dangerArea && <div role="alert" aria-live="assertive" className="mb-5 flex items-start gap-3 rounded-xl border border-danger/50 bg-danger/10 p-4 text-danger">
          <AlertTriangle size={19} className="mt-0.5 shrink-0" />
          <div><p className="font-bold">You are in a danger zone: {dangerArea.name}.</p><p className="mt-1 text-sm">This area is marked as dangerous by an administrator. Check your surroundings and move away if you feel unsafe.</p><Link to="/map" className="mt-2 inline-block text-sm font-semibold underline">View map</Link></div>
        </div>}
        <Outlet />
      </main>
    </div>
    <nav className={'fixed inset-x-0 bottom-0 z-20 grid border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_20px_rgba(20,40,37,.06)] backdrop-blur lg:hidden ' + (isAdmin ? 'grid-cols-6' : 'grid-cols-5')} aria-label="Primary navigation">{navItems.filter((item) => item.mobile).map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end={to === '/dashboard'} className={({ isActive }) => 'flex min-h-14 flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium ' + (isActive ? 'text-primary' : 'text-muted')}><Icon size={19} strokeWidth={1.8} />{label}</NavLink>)}</nav>
  </div>;
}
