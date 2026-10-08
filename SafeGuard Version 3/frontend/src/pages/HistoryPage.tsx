import { useEffect, useMemo, useState } from 'react';
import { History, ShieldCheck, TriangleAlert } from 'lucide-react';
import Card from '../components/Card';
import { getEmergencyHistory, type EmergencyRecord } from '../services/emergency';

export default function HistoryPage() {
  const [records, setRecords] = useState<EmergencyRecord[]>([]);
  const [filter, setFilter] = useState('ALL');
  const [eventFilter, setEventFilter] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  useEffect(() => { void getEmergencyHistory().then(setRecords); }, []);
  const shown = useMemo(() => records.filter((r) => {
    const date = new Date(r.timestamp);
    const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return (filter === 'ALL' || r.riskLevel === filter) && r.detectedEvent.toLowerCase().includes(eventFilter.toLowerCase()) && (!from || day >= from) && (!to || day <= to);
  }), [filter, records, eventFilter, from, to]);
  return <div className="space-y-5">
    <div><p className="mb-2 text-xs font-semibold uppercase tracking-[.16em] text-primary">Your records</p><h1 className="text-3xl font-semibold tracking-tight">Emergency history</h1><p className="mt-2 text-sm text-muted">Review alerts you confirmed or dismissed.</p></div>
    <Card title="Event log" icon={<History size={16} />}>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className="text-xs font-medium text-muted">Risk level<select aria-label="Filter by risk level" value={filter} onChange={(e) => setFilter(e.target.value)} className="mt-1 block w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg"><option value="ALL">All levels</option><option value="LOW">Low</option><option value="MODERATE">Moderate</option><option value="HIGH">High</option></select></label><label className="text-xs font-medium text-muted">Event type<input value={eventFilter} onChange={(e) => setEventFilter(e.target.value)} placeholder="Search event…" className="mt-1 block w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg" /></label><label className="text-xs font-medium text-muted">From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 block w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg" /></label><label className="text-xs font-medium text-muted">To<input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 block w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg" /></label></div>
      <p className="mb-2 text-sm text-muted">{shown.length} {shown.length === 1 ? 'event' : 'events'}</p>
      {shown.length === 0 ? <div className="rounded-lg border border-dashed border-line p-8 text-center"><ShieldCheck className="mx-auto mb-2 text-safe" /><p className="font-semibold">No events recorded</p><p className="mt-1 text-sm text-muted">Confirmed or dismissed alerts will appear here.</p></div> : <ul className="divide-y divide-line">{shown.map((r) => <li key={r.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="flex items-center gap-2 font-semibold"><TriangleAlert size={16} className={r.riskLevel === 'HIGH' ? 'text-danger' : 'text-warn'} />{r.detectedEvent}</p><p className="mt-1 text-sm text-muted">{new Date(r.timestamp).toLocaleString()} · {r.location.latitude.toFixed(4)}, {r.location.longitude.toFixed(4)}</p>{r.status === 'CONFIRMED' && r.delivery && <p className="mt-1 text-xs text-muted">Contact delivery: {r.delivery.message}</p>}</div><div className="flex flex-wrap items-center gap-3 text-sm"><span className="font-semibold">{r.riskScore} · {r.riskLevel}</span><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${r.status === 'CONFIRMED' ? 'bg-danger/10 text-danger' : 'bg-safe/10 text-safe'}`}>{r.status === 'CONFIRMED' ? 'Emergency confirmed' : 'Dismissed · user safe'}</span></div></li>)}</ul>}
      <p className="mt-4 border-t border-line pt-3 text-xs text-muted">Records are saved by the project backend or, when it is unavailable, in this browser. Provider status means a request was accepted; carrier delivery may differ.</p>
    </Card>
  </div>;
}
