export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH';
export type ZoneType = 'DANGER' | 'SAFE';

export interface Signals {
  crime: number;
  threat: number;
  fall: number;
  geofence: number;
}

export interface LiveState {
  voice: 'NORMAL' | 'DISTRESS' | 'THREAT';
  movement: 'UNKNOWN' | 'NORMAL' | 'ABNORMAL' | 'FALL_CANDIDATE';
  geofence: 'UNKNOWN' | 'NO REPORTED DANGER ZONE' | 'NEAR DANGER ZONE' | 'INSIDE DANGER ZONE';
}

export interface MovementSignal {
  classification: 'NORMAL' | 'ABNORMAL' | 'FALL_CANDIDATE';
  fallScore: number;
  acceleration: { x: number; y: number; z: number; magnitude: number };
  rotationRate: { alpha: number; beta: number; gamma: number } | null;
  lastUpdated: number;
}

export interface Coords { latitude: number; longitude: number }
export interface DangerZone {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  riskLevel: RiskLevel;
  zoneType: ZoneType;
  source: string;
  createdAt?: string;
  isMine: boolean;
}
export interface ZoneReport {
  id: number;
  userId?: number;
  userName?: string;
  userEmail?: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  updatedAt?: string;
  reviewedAt?: string | null;
  reviewerName?: string | null;
}
export interface AdminLiveLocation {
  userId: number;
  name: string;
  email: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  updatedAt: string;
}
export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  isActive: boolean;
  createdAt: string;
  sharingEnabled: boolean;
  locationUpdatedAt?: string | null;
}
export interface AdminSummary {
  users: number;
  activeUsers: number;
  pendingReports: number;
  sharingNow: number;
}
export interface ZoneDistance { id: number; name: string; riskLevel: RiskLevel; inside: boolean; distanceM: number }
export interface LocationRisk {
  location: Coords;
  status: 'SAFE' | 'NEAR' | 'INSIDE';
  areaRisk: RiskLevel;
  geofenceScore: number;
  zones: ZoneDistance[];
}
export interface CrimePrediction {
  riskLevel: RiskLevel;
  probability: number;
  factors: string[];
  source: string;
  modelVersion: string;
}
export type VoiceClass = 'NORMAL' | 'DISTRESS' | 'THREAT';
export type DemoPhrase = 'none' | 'normal' | 'distress' | 'threat';
export interface VoiceResult {
  transcription: string;
  classification: VoiceClass;
  probability: number;
  threatProbability: number;
  source: { stt: string; classifier: string };
  analyzedAt: number;
}
