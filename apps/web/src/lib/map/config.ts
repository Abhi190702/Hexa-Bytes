import { env } from '@/lib/env';

// Single place that resolves the default map view from validated env.
// Delhi NCR by default; city-scale deployments override via env.
export const MAP_DEFAULTS = {
  styleUrl: env.NEXT_PUBLIC_MAP_STYLE_URL,
  longitude: env.NEXT_PUBLIC_MAP_DEFAULT_LON,
  latitude: env.NEXT_PUBLIC_MAP_DEFAULT_LAT,
  zoom: env.NEXT_PUBLIC_MAP_DEFAULT_ZOOM,
} as const;
