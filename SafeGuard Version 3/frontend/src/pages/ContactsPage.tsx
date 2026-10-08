import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Pencil, Plus, Star, Trash2, Users } from 'lucide-react';
import Card from '../components/Card';
import { addContact, deleteContact, listContacts, updateContact, type ContactInput, type EmergencyContact } from '../services/contacts';

const empty: ContactInput = { name: '', phone: '', relationship: '', isPrimary: false, alertEnabled: false };

export default function ContactsPage() {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [draft, setDraft] = useState<ContactInput>(empty);
  const [editing, setEditing] = useState<number | string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const refresh = async () => setContacts(await listContacts());
  useEffect(() => { void refresh(); }, []);
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setError('');
    try { if (editing !== null) await updateContact(editing, draft); else await addContact(draft); setDraft(empty); setEditing(null); await refresh(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not save contact.'); }
    finally { setBusy(false); }
  };
  const edit = (contact: EmergencyContact) => { setEditing(contact.id); setDraft({ name: contact.name, phone: contact.phone, relationship: contact.relationship, isPrimary: contact.isPrimary, alertEnabled: contact.alertEnabled ?? false }); };
  const remove = async (contact: EmergencyContact) => { await deleteContact(contact.id); await refresh(); };
  return <div className="space-y-5">
    <div><p className="mb-2 text-xs font-semibold uppercase tracking-[.16em] text-primary">People you trust</p><h1 className="text-3xl font-semibold tracking-tight">Emergency contacts</h1><p className="mt-2 max-w-2xl text-sm text-muted">Keep trusted people ready to reach. Choose separately whether each person can receive confirmed alerts by SMS or automated call.</p></div>
    <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
      <Card title={editing === null ? 'Add a contact' : 'Edit contact'} icon={<Plus size={16} />}>
        <form onSubmit={(e) => void submit(e)} className="space-y-3">
          <label className="block text-sm font-medium">Name<input required maxLength={80} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="mt-1 w-full rounded-lg border border-line bg-bg px-3 py-2" placeholder="Name" /></label>
          <label className="block text-sm font-medium">Phone number<input required pattern="\+?[0-9 ()-]{7,20}" maxLength={20} value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} className="mt-1 w-full rounded-lg border border-line bg-bg px-3 py-2" placeholder="+91 98765 43210" /><span className="mt-1 block text-xs font-normal text-muted">Use the full country code (for example, +91) for provider SMS/call delivery.</span></label>
          <label className="block text-sm font-medium">Relationship<input required maxLength={40} value={draft.relationship} onChange={(e) => setDraft({ ...draft, relationship: e.target.value })} className="mt-1 w-full rounded-lg border border-line bg-bg px-3 py-2" placeholder="Friend, family, caregiver…" /></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.isPrimary} onChange={(e) => setDraft({ ...draft, isPrimary: e.target.checked })} />Mark as primary contact</label>
          <label className="flex items-start gap-2 rounded-lg border border-line p-3 text-sm"><input type="checkbox" checked={draft.alertEnabled} onChange={(e) => setDraft({ ...draft, alertEnabled: e.target.checked })} className="mt-0.5" /><span><b>Allow emergency alerts</b><span className="mt-0.5 block text-xs text-muted">Only enable after confirming this person agrees to receive SMS/calls.</span></span></label>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <div className="flex gap-2"><button disabled={busy} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{editing === null ? 'Add contact' : 'Save changes'}</button>{editing !== null && <button type="button" onClick={() => { setEditing(null); setDraft(empty); }} className="rounded-lg border border-line px-4 py-2 text-sm">Cancel</button>}</div>
        </form>
      </Card>
      <Card title="Saved contacts" icon={<Users size={16} />}>
        {contacts.length === 0 ? <div className="rounded-lg border border-dashed border-line p-8 text-center"><p className="font-semibold">No contacts added</p><p className="mt-1 text-sm text-muted">Add a trusted person to include in alert previews.</p></div> : <ul className="divide-y divide-line">{contacts.map((c) => <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0"><div><p className="flex flex-wrap items-center gap-2 font-semibold">{c.name}{c.isPrimary && <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary"><Star size={12} fill="currentColor" />Primary</span>}<span className={`rounded-full px-2 py-0.5 text-xs ${c.alertEnabled ? 'bg-safe/10 text-safe' : 'bg-bg text-muted'}`}>{c.alertEnabled ? 'Alert enabled' : 'No alert permission'}</span></p><p className="mt-1 text-sm text-muted">{c.relationship} · {c.phone}</p></div><div className="flex gap-2"><button aria-label={`Edit ${c.name}`} onClick={() => edit(c)} className="rounded-lg border border-line p-2 text-muted hover:text-primary"><Pencil size={15} /></button><button aria-label={`Delete ${c.name}`} onClick={() => void remove(c)} className="rounded-lg border border-line p-2 text-muted hover:text-danger"><Trash2 size={15} /></button></div></li>)}</ul>}
        <p className="mt-4 border-t border-line pt-3 text-xs text-muted">Contact details are saved in the project database when available; otherwise they stay in this browser. Provider-based SMS/calls require server configuration.</p>
      </Card>
    </div>
  </div>;
}
