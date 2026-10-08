import { api } from './api';
import type { AdminLiveLocation, AdminSummary, AdminUser, Coords, DangerZone, LocationRisk, ZoneReport, ZoneType } from '../types';

export interface ZoneInput extends Coords {
  name: string;
  radius: number;
  zoneType: ZoneType;
}
export interface AdminZoneInput extends Coords { name: string; radius: number }
export interface LocationSharingStatus { isSharing: boolean; consentedAt: string | null; updatedAt: string | null }

export const getLocationRisk = ({ latitude, longitude }: Coords) =>
  api<LocationRisk>('/location/risk?lat=' + latitude + '&lng=' + longitude);

export const getZones = () => api<DangerZone[]>('/zones');
export const getZoneReports = () => api<ZoneReport[]>('/zones/reports');
export const submitZoneReport = (zone: Omit<ZoneInput, 'zoneType'>) =>
  api<ZoneReport>('/zones/reports', { method: 'POST', body: JSON.stringify(zone) });
export const updateZoneReport = (id: number, zone: Omit<ZoneInput, 'zoneType'>) =>
  api<ZoneReport>('/zones/reports/' + id, { method: 'PUT', body: JSON.stringify(zone) });
export const deleteZoneReport = (id: number) =>
  api<{ ok: boolean }>('/zones/reports/' + id, { method: 'DELETE' });

export const createZone = (zone: ZoneInput) =>
  api<DangerZone>('/zones', { method: 'POST', body: JSON.stringify(zone) });
export const updateZone = (id: number, zone: ZoneInput) =>
  api<DangerZone>('/zones/' + id, { method: 'PUT', body: JSON.stringify(zone) });
export const deleteZone = (id: number) =>
  api<{ ok: boolean }>('/zones/' + id, { method: 'DELETE' });

export const getLocationSharing = () => api<LocationSharingStatus>('/location/sharing');
export const updateLocationSharing = (enabled: boolean) =>
  api<{ isSharing: boolean }>('/location/sharing', { method: 'PUT', body: JSON.stringify({ enabled }) });
export const postSharedLocation = (data: Coords & { accuracy: number | null }) =>
  api<{ ok: boolean; updatedAt: string }>('/location/sharing/location', { method: 'POST', body: JSON.stringify(data) });

export const getAdminSummary = () => api<AdminSummary>('/admin/summary');
export const getAdminUsers = () => api<AdminUser[]>('/admin/users');
export const updateAdminUser = (id: number, change: { isActive?: boolean; role?: 'USER' | 'ADMIN' }) =>
  api<{ ok: boolean }>('/admin/users/' + id, { method: 'PATCH', body: JSON.stringify(change) });
export const getAdminLocations = () => api<AdminLiveLocation[]>('/admin/locations');
export const getAdminZoneReports = (status = 'PENDING') =>
  api<ZoneReport[]>('/admin/zone-reports?status=' + encodeURIComponent(status));
export const reviewZoneReport = (id: number, decision: 'APPROVED' | 'REJECTED') =>
  api<{ ok: boolean; decision: string; zoneId: number | null }>('/admin/zone-reports/' + id + '/review', { method: 'POST', body: JSON.stringify({ decision }) });
export const getAdminZones = () => api<DangerZone[]>('/admin/zones');
export const createAdminZone = (zone: AdminZoneInput) =>
  api<DangerZone>('/admin/zones', { method: 'POST', body: JSON.stringify(zone) });
export const updateAdminZone = (id: number, zone: AdminZoneInput) =>
  api<DangerZone>('/admin/zones/' + id, { method: 'PUT', body: JSON.stringify(zone) });
export const deleteAdminZone = (id: number) =>
  api<{ ok: boolean }>('/admin/zones/' + id, { method: 'DELETE' });
