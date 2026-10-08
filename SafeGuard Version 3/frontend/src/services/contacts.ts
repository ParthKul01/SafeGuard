import { api, BASE } from './api';

export interface EmergencyContact { id: number | string; name: string; phone: string; relationship: string; isPrimary: boolean; alertEnabled: boolean }
export type ContactInput = Omit<EmergencyContact, 'id'>;
const KEY = 'pashuraksha.contacts.v1';
const local = (): EmergencyContact[] => { try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') as EmergencyContact[]; } catch { return []; } };
const save = (rows: EmergencyContact[]) => localStorage.setItem(KEY, JSON.stringify(rows));

export async function listContacts(): Promise<EmergencyContact[]> {
  try { return await api<EmergencyContact[]>('/contacts'); } catch { return local(); }
}
export async function addContact(input: ContactInput): Promise<EmergencyContact> {
  try { return await api<EmergencyContact>('/contacts', { method: 'POST', body: JSON.stringify(input) }); }
  catch { const rows = local(); const item = { ...input, id: `local-${Date.now()}`, isPrimary: input.isPrimary || rows.length === 0 }; const next = item.isPrimary ? rows.map((r) => ({ ...r, isPrimary: false })) : rows; save([...next, item]); return item; }
}
export async function updateContact(id: number | string, input: ContactInput): Promise<EmergencyContact> {
  try { return await api<EmergencyContact>(`/contacts/${id}`, { method: 'PUT', body: JSON.stringify(input) }); }
  catch { const rows = local(); const next = rows.map((r) => ({ ...r, ...(r.id === id ? input : {}), ...(input.isPrimary && r.id !== id ? { isPrimary: false } : {}) })); save(next); return next.find((r) => r.id === id)!; }
}
export async function deleteContact(id: number | string): Promise<void> {
  try { const res = await fetch(`${BASE}/contacts/${id}`, { method: 'DELETE' }); if (!res.ok) throw new Error('Delete failed'); }
  catch { /* Local fallback is handled below. */ }
  const rows = local(); const remaining = rows.filter((r) => r.id !== id);
  if (!remaining.some((r) => r.isPrimary) && remaining[0]) remaining[0].isPrimary = true;
  save(remaining);
}
