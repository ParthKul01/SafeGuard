// Map provider config. Defaults to free OpenStreetMap tiles (no key needed).
const env = import.meta.env;

export const MAP_CONFIG = {
  tileUrl: ((env.VITE_MAP_TILE_URL as string | undefined) ?? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')
    .replace('{key}', (env.VITE_MAP_API_KEY as string | undefined) ?? ''),
  attribution: (env.VITE_MAP_ATTRIBUTION as string | undefined) ?? '&copy; OpenStreetMap contributors',
  defaultZoom: 14,
};

export const ZONE_COLORS = { HIGH: '#ef4444', MODERATE: '#f59e0b', LOW: '#22c55e' } as const;
export const ZONE_TYPE_COLORS = { DANGER: '#dc4b3e', SAFE: '#19866d' } as const;
export const USER_COLOR = '#3b82f6';
