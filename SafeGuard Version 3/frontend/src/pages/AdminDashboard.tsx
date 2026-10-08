import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Check, Clock3, MapPin, MapPinned, Radio, ShieldAlert, Trash2, Users, X } from 'lucide-react';
import Card from '../components/Card';
import SafetyMap from '../components/SafetyMap';
import { DEFAULT_COORDS } from '../hooks/useGeolocation';
import type { AdminLiveLocation, AdminSummary, AdminUser, Coords, DangerZone, ZoneReport } from '../types';
import { createAdminZone, deleteAdminZone as removeAdminZone, getAdminLocations, getAdminSummary, getAdminUsers, getAdminZoneReports, getAdminZones, reviewZoneReport, updateAdminUser, updateAdminZone } from '../services/location';

const EMPTY_SUMMARY: AdminSummary = { users: 0, activeUsers: 0, pendingReports: 0, sharingNow: 0 };

export default function AdminDashboard() {
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [locations, setLocations] = useState<AdminLiveLocation[]>([]);
  const [reports, setReports] = useState<ZoneReport[]>([]);
  const [zones, setZones] = useState<DangerZone[]>([]);
  const [point, setPoint] = useState<Coords | null>(null);
  const [name, setName] = useState('');
  const [radius, setRadius] = useState(300);
  const [editing, setEditing] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadMain = useCallback(async () => {
    const [s, u, r, z] = await Promise.all([getAdminSummary(), getAdminUsers(), getAdminZoneReports(), getAdminZones()]);
    setSummary(s); setUsers(u); setReports(r); setZones(z);
  }, []);
  const loadLocations = useCallback(async () => {
    try { setLocations(await getAdminLocations()); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load shared locations.'); }
  }, []);
  useEffect(() => {
    let live = true;
    void Promise.all([loadMain(), getAdminLocations().then(setLocations)]).catch((e) => { if (live) setError(e instanceof Error ? e.message : 'Could not load administrator data.'); })
      .finally(() => { if (live) setLoading(false); });
    const timer = window.setInterval(() => { void loadLocations(); }, 15000);
    return () => { live = false; window.clearInterval(timer); };
  }, [loadMain, loadLocations]);

  const reload = async () => {
    setError('');
    try { await loadMain(); await loadLocations(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not refresh administrator data.'); }
  };
  const selectZone = (zone: DangerZone) => {
    setEditing(zone.id); setName(zone.name); setRadius(zone.radius); setPoint({ latitude: zone.latitude, longitude: zone.longitude });
    setNotice('Edit the details or click the map to move this active danger zone.');
  };
  const resetZone = () => { setEditing(null); setName(''); setRadius(300); setPoint(null); };
  const saveZone = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!point) { setNotice('Click the map to choose a location first.'); return; }
    setSaving(true); setNotice(''); setError('');
    try {
      const payload = { name, radius, latitude: point.latitude, longitude: point.longitude };
      if (editing) await updateAdminZone(editing, payload); else await createAdminZone(payload);
      await reload(); setNotice(editing ? 'Danger zone updated and active.' : 'Admin danger zone added and active.'); resetZone();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save this danger zone.'); }
    finally { setSaving(false); }
  };
  const deleteZone = async (zone: DangerZone) => {
    if (!window.confirm('Remove active danger zone "' + zone.name + '"?')) return;
    try { await removeAdminZone(zone.id); await reload(); if (editing === zone.id) resetZone(); setNotice('Danger zone removed from the active map.'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not remove this zone.'); }
  };
  const decide = async (report: ZoneReport, decision: 'APPROVED' | 'REJECTED') => {
    setError(''); setNotice('');
    try {
      await reviewZoneReport(report.id, decision); await reload();
      setNotice(decision === 'APPROVED' ? report.name + ' approved and now appears as an active danger zone.' : report.name + ' rejected; it will not appear as a danger zone.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not review this report.'); }
  };
  const changeUser = async (user: AdminUser, change: { isActive?: boolean; role?: 'USER' | 'ADMIN' }) => {
    setError('');
    try { await updateAdminUser(user.id, change); await reload(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not update that account.'); }
  };

  const people = locations;
  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="mb-2 text-xs font-semibold uppercase tracking-[.16em] text-primary">Administrator workspace</p><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Admin console</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-muted">Review community danger reports, manage map zones and user accounts, and monitor locations shared by users who opted in.</p></div><button onClick={() => void reload()} className="rounded-lg border border-line px-3 py-2 text-sm font-semibold hover:bg-surface">Refresh</button></div>
    {error && <p role="alert" className="rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm text-danger">{error}</p>}
    {notice && <p role="status" className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-primary">{notice}</p>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[['Total users', summary.users, <Users size={17} />], ['Active accounts', summary.activeUsers, <Users size={17} />], ['Reports awaiting review', summary.pendingReports, <Clock3 size={17} />], ['Sharing location now', summary.sharingNow, <Radio size={17} />]].map(([label, value, icon]) => <div key={String(label)} className="rounded-xl border border-line bg-surface p-4"><div className="flex items-center justify-between text-muted"><span className="text-xs font-semibold uppercase tracking-wider">{label}</span>{icon}</div><p className="mt-3 text-2xl font-semibold">{value}</p></div>)}
    </div>

    <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
      <Card title="Live users and active danger zones" icon={<MapPinned size={16} />}>
        <p className="mb-3 text-xs leading-5 text-muted">Blue markers show only recent locations from users who opted in. Orange markers are awaiting review; red circles are active danger zones.</p>
        <div className="relative isolate h-[420px] overflow-hidden rounded-xl border border-line">
          <SafetyMap coords={null} zones={zones} pendingReports={reports} people={people} fitMarkers fallbackCenter={DEFAULT_COORDS} draftLocation={point} onChooseLocation={setPoint} />
          <div className="absolute left-3 top-3 z-[500] rounded-lg bg-surface/95 px-3 py-2 text-xs shadow">Click the map to choose a danger-zone location.</div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted"><span className="rounded-full bg-bg px-2 py-1">{locations.length} live share{locations.length === 1 ? '' : 's'} · refreshes every 15 seconds</span><span className="rounded-full bg-bg px-2 py-1">{zones.length} active danger zone{zones.length === 1 ? '' : 's'}</span></div>
      </Card>

      <Card title={editing ? 'Edit active danger zone' : 'Add admin danger zone'} icon={<ShieldAlert size={16} />}>
        <p className="mb-4 text-xs leading-5 text-muted">Zones added here become active immediately and are visible to all users. User-submitted reports require approval in the review queue.</p>
        <form className="space-y-3" onSubmit={(event) => void saveZone(event)}>
          <label className="block text-sm font-medium">Zone name<input value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={80} className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm" placeholder="Name the location" /></label>
          <label className="block text-sm font-medium">Radius: {radius} m<input type="range" min="50" max="2000" step="50" value={radius} onChange={(event) => setRadius(Number(event.target.value))} className="mt-2 w-full accent-primary" /></label>
          <p className="rounded-lg bg-bg p-3 text-xs text-muted">{point ? 'Selected point: ' + point.latitude.toFixed(5) + ', ' + point.longitude.toFixed(5) : 'No location selected. Click the map.'}</p>
          <div className="flex gap-2"><button disabled={saving} className="min-h-10 flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : editing ? 'Save active zone' : 'Add active zone'}</button>{editing && <button type="button" onClick={resetZone} className="rounded-lg border border-line px-3 py-2 text-sm">Cancel</button>}</div>
        </form>
        <div className="mt-5 border-t border-line pt-4"><h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">Active map danger zones</h3>
          {zones.length === 0 ? <p className="text-sm text-muted">No active zones. Use the form and map to add one.</p> : <ul className="max-h-64 space-y-2 overflow-auto">{zones.map((zone) => <li key={zone.id} className="flex items-center gap-2 rounded-lg border border-line p-2.5"><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{zone.name}</p><p className="text-xs text-muted">{zone.radius} m · {zone.source === 'admin_approved' ? 'Approved report' : zone.source === 'admin_manual' ? 'Manual admin zone' : 'Imported danger zone'}</p></div>{(zone.source === 'admin_manual' || zone.source === 'admin_approved') ? <><button onClick={() => selectZone(zone)} className="rounded p-1.5 text-primary hover:bg-bg" aria-label={'Edit ' + zone.name}>Edit</button><button onClick={() => void deleteZone(zone)} className="rounded p-1.5 text-danger hover:bg-bg" aria-label={'Delete ' + zone.name}><Trash2 size={15} /></button></> : <span className="px-1 text-[10px] text-muted">Imported</span>}</li>)}</ul>}
        </div>
      </Card>
    </div>

    <Card title={'Danger-zone review queue (' + reports.length + ')'} icon={<ShieldAlert size={16} />}>
      {loading ? <p className="text-sm text-muted">Loading review queue…</p> : reports.length === 0 ? <p className="text-sm text-muted">No user reports are waiting for review.</p> : <ul className="grid gap-3 lg:grid-cols-2">{reports.map((report) => <li key={report.id} className="rounded-xl border border-line p-4">
        <div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{report.name}</p><p className="mt-1 text-xs text-muted">Submitted by {report.userName} · {report.userEmail}</p><p className="mt-1 text-xs text-muted">{report.latitude.toFixed(5)}, {report.longitude.toFixed(5)} · radius {report.radius} m</p><p className="mt-1 text-xs text-muted">Submitted {new Date(report.createdAt).toLocaleString()}</p></div><span className="rounded-full bg-warn/10 px-2 py-1 text-[10px] font-bold text-warn">{report.status}</span></div>
        <div className="mt-4 flex gap-2"><button onClick={() => void decide(report, 'APPROVED')} className="inline-flex items-center gap-1.5 rounded-lg bg-safe px-3 py-2 text-xs font-semibold text-white"><Check size={14} />Approve and activate</button><button onClick={() => void decide(report, 'REJECTED')} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs font-semibold hover:border-danger/40 hover:text-danger"><X size={14} />Reject</button></div>
      </li>)}</ul>}
    </Card>

    <Card title={'User management (' + users.length + ')'} icon={<Users size={16} />}>
      {loading ? <p className="text-sm text-muted">Loading accounts…</p> : users.length === 0 ? <p className="text-sm text-muted">No accounts found.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="border-b border-line text-xs uppercase tracking-wider text-muted"><tr><th className="py-2 pr-3">User</th><th className="py-2 pr-3">Role</th><th className="py-2 pr-3">Status</th><th className="py-2 pr-3">Location sharing</th><th className="py-2">Account action</th></tr></thead><tbody>{users.map((user) => <tr key={user.id} className="border-b border-line/70"><td className="py-3 pr-3"><b>{user.name}</b><span className="block text-xs text-muted">{user.email}</span></td><td className="py-3 pr-3"><select value={user.role} disabled={user.role === 'ADMIN' && user.isActive && users.filter((candidate) => candidate.role === 'ADMIN' && candidate.isActive).length === 1} onChange={(event) => void changeUser(user, { role: event.target.value as 'USER' | 'ADMIN' })} className="rounded border border-line bg-surface px-2 py-1 text-xs"><option value="USER">User</option><option value="ADMIN">Admin</option></select></td><td className="py-3 pr-3"><span className={user.isActive ? 'text-safe' : 'text-danger'}>{user.isActive ? 'Active' : 'Suspended'}</span></td><td className="py-3 pr-3 text-xs text-muted">{user.sharingEnabled ? 'Opted in' : 'Off'}</td><td className="py-3"><button disabled={user.role === 'ADMIN' && user.isActive && users.filter((candidate) => candidate.role === 'ADMIN' && candidate.isActive).length === 1} onClick={() => void changeUser(user, { isActive: !user.isActive })} className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold hover:border-primary disabled:opacity-40">{user.isActive ? 'Suspend' : 'Reactivate'}</button></td></tr>)}</tbody></table></div>}
      <p className="mt-3 text-xs leading-5 text-muted">Suspending an account ends its sessions and stops live-location sharing. The last active administrator cannot be suspended or demoted.</p>
    </Card>

    <Card title={'Opt-in live locations (' + locations.length + ')'} icon={<Radio size={16} />}>
      <p className="mb-3 text-xs leading-5 text-muted">Only enabled, active accounts with an update in the last 90 seconds appear here. Location updates are deleted when sharing is turned off or the user signs out.</p>
      {locations.length === 0 ? <p className="text-sm text-muted">No users are currently sharing a fresh location.</p> : <ul className="grid gap-2 md:grid-cols-2">{locations.map((person) => <li key={person.userId} className="flex items-center gap-3 rounded-lg border border-line p-3"><span className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary"><MapPin size={16} /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{person.name}</p><p className="num text-xs text-muted">{person.latitude.toFixed(5)}, {person.longitude.toFixed(5)}{person.accuracy != null ? ' · ±' + Math.round(person.accuracy) + ' m' : ''}</p><p className="text-[11px] text-muted">Updated {new Date(person.updatedAt + (person.updatedAt.endsWith('Z') ? '' : 'Z')).toLocaleTimeString()}</p></div><a href={'https://maps.google.com/?q=' + person.latitude + ',' + person.longitude} target="_blank" rel="noreferrer" className="rounded-lg border border-line px-2.5 py-2 text-xs font-semibold hover:border-primary">Map</a></li>)}</ul>}
    </Card>
  </div>;
}
