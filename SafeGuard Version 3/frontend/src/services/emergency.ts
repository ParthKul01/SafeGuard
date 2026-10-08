import { api } from './api';
import type { Coords, RiskLevel } from '../types';
import { listContacts } from './contacts';
import type { EmergencyContact } from './contacts';

export interface EmergencyRecord {
  id: number | string;
  userName: string;
  location: Coords;
  riskLevel: RiskLevel;
  riskScore: number;
  detectedEvent: string;
  timestamp: string;
  status: 'PENDING' | 'CONFIRMED' | 'DISMISSED';
  emergencyContacts?: EmergencyContact[];
  delivery?: { status: 'queued' | 'partial' | 'failed' | 'not_configured' | 'no_contacts'; message: string; results?: Array<{ contactName: string; phone: string; channel: 'sms' | 'call'; status: 'queued' | 'failed'; providerId?: string }> };
}

type NewEmergency = Pick<EmergencyRecord, 'location' | 'riskLevel' | 'riskScore' | 'detectedEvent'> & { status: 'CONFIRMED' | 'DISMISSED' };
const STORAGE_KEY = 'pashuraksha.emergency-history.v1';

function readLocal(): EmergencyRecord[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as EmergencyRecord[]; }
  catch { return []; }
}

export async function recordEmergency(input: NewEmergency): Promise<EmergencyRecord> {
  try {
    const remote = await api<EmergencyRecord>(`/emergency/${input.status === 'CONFIRMED' ? 'confirm' : 'dismiss'}`, {
      method: 'POST', body: JSON.stringify(input),
    });
    return remote;
  } catch {
    const emergencyContacts = await listContacts();
    const record: EmergencyRecord = {
      ...input, id: `local-${Date.now()}`, userName: 'SafeGaurd user', timestamp: new Date().toISOString(),
      emergencyContacts,
      delivery: { status: 'not_configured', message: 'Alert saved on this device. Server delivery is unavailable; use a contact action below.' },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify([record, ...readLocal()]));
    return record;
  }
}

export async function getEmergencyHistory(): Promise<EmergencyRecord[]> {
  try {
    const remote = await api<EmergencyRecord[]>('/emergency/history');
    return [...remote, ...readLocal()];
  } catch { return readLocal(); }
}
