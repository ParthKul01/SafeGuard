import { useEffect, useState, type FormEvent } from 'react';
import { MapPin, Pencil, ShieldAlert, ShieldCheck, Trash2 } from 'lucide-react';
import Card from '../components/Card';
import GpsControl from '../components/GpsControl';
import SafetyMap from '../components/SafetyMap';
import { useSafety } from '../context/SafetyContext';
import { USER_COLOR, ZONE_TYPE_COLORS } from '../utils/mapConfig';
import { DEFAULT_COORDS } from '../hooks/useGeolocation';
import { createZone, deleteZone, deleteZoneReport, getZoneReports, submitZoneReport, updateZone, updateZoneReport, type ZoneInput } from '../services/location';
import type { Coords, DangerZone, ZoneReport, ZoneType } from '../types';

const LEGEND = [
  { label: 'Your location', color: USER_COLOR },
  { label: 'Admin-approved danger area', color: ZONE_TYPE_COLORS.DANGER },
  { label: 'Place you consider safe', color: ZONE_TYPE_COLORS.SAFE },
  { label: 'Pending admin review', color: '#d88924' },
];

export default function MapPage() {
  const { location, locationAvailable, zones, zonesLoading, zonesError, refreshZones, geo, live } = useSafety();
  const [reports, setReports] = useState<ZoneReport[]>([]);
  const [reportsError, setReportsError] = useState('');
  const [name, setName] = useState('');
  const [zoneType, setZoneType] = useState<ZoneType>('DANGER');
  const [radius, setRadius] = useState(300);
  const [point, setPoint] = useState<Coords | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingReportId, setEditingReportId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const refreshReports = async () => {
    try { setReports(await getZoneReports()); setReportsError(''); }
    catch (error) { setReportsError(error instanceof Error ? error.message : 'Could not load review statuses.'); }
  };
  useEffect(() => { void refreshReports(); }, []);

  const resetForm = () => {
    setName(''); setZoneType('DANGER'); setRadius(300); setPoint(null); setEditingId(null); setEditingReportId(null);
  };
  const editZone = (zone: DangerZone) => {
    if (!zone.isMine || zone.source !== 'user_report' || zone.zoneType !== 'SAFE') return;
    setEditingId(zone.id); setEditingReportId(null); setName(zone.name); setZoneType('SAFE'); setRadius(zone.radius);
    setPoint({ latitude: zone.latitude, longitude: zone.longitude });
    setMessage('Click the map to move this place, then save your changes.');
  };
  const editReport = (report: ZoneReport) => {
    if (report.status !== 'PENDING') return;
    setEditingId(null); setEditingReportId(report.id); setName(report.name); setZoneType('DANGER'); setRadius(report.radius);
    setPoint({ latitude: report.latitude, longitude: report.longitude });
    setMessage('This report is pending. Edit it and send the updated version for review.');
  };

  const saveZone = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setMessage('');
    if (!point) { setMessage('Click the map to choose a place, or use your current location.'); return; }
    const payload: ZoneInput = { name, latitude: point.latitude, longitude: point.longitude, radius, zoneType };
    setSaving(true);
    try {
      if (zoneType === 'DANGER') {
        if (editingReportId) await updateZoneReport(editingReportId, { name, latitude: point.latitude, longitude: point.longitude, radius });
        else await submitZoneReport({ name, latitude: point.latitude, longitude: point.longitude, radius });
        await refreshReports();
        setMessage(editingReportId ? 'Your updated report is back in the administrator review queue.' : 'Sent to the administrator for review. It will appear as a danger zone only if approved.');
      } else {
        if (editingId) await updateZone(editingId, payload); else await createZone(payload);
        await refreshZones();
        setMessage(editingId ? 'Your safe-place note was updated.' : 'Your safe-place note was saved to your account.');
      }
      resetForm();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save this place.');
    } finally { setSaving(false); }
  };

  const removeSafePlace = async (zone: DangerZone) => {
    if (!zone.isMine || zone.source !== 'user_report' || zone.zoneType !== 'SAFE') return;
    if (!window.confirm('Delete your note for "' + zone.name + '"?')) return;
    setMessage('');
    try { await deleteZone(zone.id); await refreshZones(); if (editingId === zone.id) resetForm(); setMessage('Your place note was deleted.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not delete this place.'); }
  };
  const removeReport = async (report: ZoneReport) => {
    if (!window.confirm('Remove your ' + report.status.toLowerCase() + ' danger report for "' + report.name + '"?')) return;
    try { await deleteZoneReport(report.id); await refreshReports(); if (editingReportId === report.id) resetForm(); }
    catch (error) { setReportsError(error instanceof Error ? error.message : 'Could not remove this report.'); }
  };

  const insideName = geo?.zones.find((zone) => zone.inside)?.name;
  const geofenceText = live.geofence === 'INSIDE DANGER ZONE' ? 'You are inside an administrator-approved danger area.'
    : live.geofence === 'NEAR DANGER ZONE' ? 'An administrator-approved danger area is nearby.'
      : live.geofence === 'NO REPORTED DANGER ZONE' ? 'No approved danger area nearby.' : 'Enable location to check your position.';

  return <div className="space-y-5">
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-[.16em] text-primary">Your places</p>
      <h1 className="text-3xl font-semibold tracking-tight">Location map</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">Submit danger-area reports for administrator review, or save a private place you consider safe. A danger report is never an active danger zone until it is approved.</p>
      <p className="mt-2 max-w-3xl text-xs leading-5 text-muted">Precise danger pins require verification. The public <a className="underline hover:text-fg" href="https://www.data.gov.in/catalog/crime-india-2023" target="_blank" rel="noreferrer">NCRB crime statistics catalog</a> provides statistics, not verified street-level danger points.</p>
    </div>
    <GpsControl />
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="relative isolate h-[55vh] min-h-[340px] overflow-hidden rounded-xl border border-line lg:col-span-2 lg:h-[600px]">
        <SafetyMap coords={locationAvailable ? location : null} zones={zones} pendingReports={reports} fallbackCenter={DEFAULT_COORDS} draftLocation={point} onChooseLocation={setPoint} />
        <div className="absolute left-3 top-3 z-[500] rounded-lg bg-surface/95 px-3 py-2 text-xs shadow">Click the map to choose or move a place marker.</div>
      </div>
      <div className="space-y-5">
        <Card title="Your area status" icon={<ShieldAlert size={16} />}>
          <p role={live.geofence === 'INSIDE DANGER ZONE' ? 'alert' : 'status'} className={'text-base font-bold ' + (live.geofence === 'INSIDE DANGER ZONE' ? 'text-danger' : live.geofence === 'NEAR DANGER ZONE' ? 'text-warn' : 'text-muted')}>{geofenceText}</p>
          {insideName && <p className="mt-1 text-sm font-medium">{insideName}</p>}
          <p className="mt-2 text-xs leading-5 text-muted">Warnings use active danger areas approved or entered by an administrator. No nearby danger area does not prove a place is safe.</p>
          {locationAvailable && <p className="num mt-3 text-sm text-muted"><MapPin size={14} className="mr-1 inline" />{location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</p>}
        </Card>
        <Card title={editingId || editingReportId ? 'Edit your place' : 'Add a place'} icon={zoneType === 'SAFE' ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}>
          <form className="space-y-3" onSubmit={(event) => void saveZone(event)}>
            <label className="block text-sm font-medium">Place name
              <input value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={80} className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm" placeholder="For example, a poorly lit path" />
            </label>
            <label className="block text-sm font-medium">Place type
              <select disabled={Boolean(editingReportId)} value={zoneType} onChange={(event) => { setZoneType(event.target.value as ZoneType); setEditingId(null); setEditingReportId(null); }} className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm">
                <option value="DANGER">Danger area report · admin review</option><option value="SAFE">Place I consider safe</option>
              </select>
            </label>
            <label className="block text-sm font-medium">Radius: {radius} m
              <input type="range" min="50" max="2000" step="50" value={radius} onChange={(event) => setRadius(Number(event.target.value))} className="mt-2 w-full accent-primary" />
            </label>
            <div className="rounded-lg bg-bg p-3 text-xs leading-5 text-muted">
              {point ? 'Selected point: ' + point.latitude.toFixed(5) + ', ' + point.longitude.toFixed(5) : 'No point selected. Click the map or use your GPS location.'}
              <button type="button" disabled={!locationAvailable} onClick={() => setPoint(locationAvailable ? location : null)} className="ml-2 font-semibold text-primary underline disabled:opacity-50">Use my location</button>
            </div>
            <p className="text-xs leading-5 text-muted">{zoneType === 'DANGER' ? 'Pending danger reports are private to you and administrators. Only approval adds them to danger warnings.' : 'Safe-place notes are private to your account and do not reduce your risk score.'}</p>
            <div className="flex gap-2">
              <button disabled={saving} type="submit" className="min-h-10 flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving...' : editingId || editingReportId ? 'Save changes' : 'Submit for review'}</button>
              {(editingId || editingReportId) && <button type="button" onClick={resetForm} className="rounded-lg border border-line px-3 py-2 text-sm">Cancel</button>}
            </div>
            {message && <p role="status" className="text-xs leading-5 text-muted">{message}</p>}
          </form>
        </Card>
        <Card title="Your danger reports">
          {reportsError ? <p role="alert" className="text-sm text-danger">{reportsError}</p>
            : reports.length === 0 ? <p className="text-sm text-muted">You have no danger reports in review.</p>
              : <ul className="space-y-3">{reports.map((report) => <li key={report.id} className="rounded-lg border border-line p-3">
                <div className="flex items-start gap-2"><span className={'mt-1 size-2.5 shrink-0 rounded-full ' + (report.status === 'PENDING' ? 'bg-warn' : report.status === 'APPROVED' ? 'bg-safe' : 'bg-muted')} />
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{report.name}</p><p className="mt-1 text-xs text-muted">{report.radius} m · {report.status === 'PENDING' ? 'Waiting for admin review' : report.status === 'APPROVED' ? 'Approved and active on the map' : 'Not approved'}</p></div>
                </div>
                {(report.status === 'PENDING' || report.status === 'REJECTED') && <div className="mt-2 flex gap-2 border-t border-line pt-2">
                  {report.status === 'PENDING' && <button type="button" onClick={() => editReport(report)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-bg"><Pencil size={13} />Edit</button>}
                  <button type="button" onClick={() => void removeReport(report)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-danger hover:bg-bg"><Trash2 size={13} />Remove</button>
                </div>}
              </li>)}</ul>}
        </Card>
        <Card title="Saved and approved places">
          {zonesLoading ? <p className="text-sm text-muted">Loading map places...</p>
            : zonesError ? <p role="alert" className="text-sm text-danger">{zonesError}</p>
              : zones.length === 0 ? <p className="text-sm text-muted">No places on the map yet.</p>
                : <ul className="space-y-3">{zones.map((zone) => <li key={zone.id} className="rounded-lg border border-line p-3">
                  <div className="flex items-start gap-2"><span className="mt-1 size-2.5 shrink-0 rounded-full" style={{ background: ZONE_TYPE_COLORS[zone.zoneType] }} />
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{zone.name}</p><p className="mt-0.5 text-xs text-muted">{zone.zoneType === 'SAFE' ? 'Your private safe-place note' : 'Admin-approved danger area'} · {zone.radius} m</p></div>
                  </div>
                  {zone.isMine && zone.zoneType === 'SAFE' && <div className="mt-2 flex gap-2 border-t border-line pt-2">
                    <button type="button" onClick={() => editZone(zone)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-bg"><Pencil size={13} />Edit</button>
                    <button type="button" onClick={() => void removeSafePlace(zone)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-danger hover:bg-bg"><Trash2 size={13} />Delete</button>
                  </div>}
                </li>)}</ul>}
        </Card>
        <Card title="Legend"><ul className="grid grid-cols-1 gap-2 text-sm">{LEGEND.map((item) => <li key={item.label} className="flex items-center gap-2"><span className="size-3 rounded-full" style={{ background: item.color }} />{item.label}</li>)}</ul></Card>
      </div>
    </div>
  </div>;
}
