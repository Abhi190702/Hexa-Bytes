import { z } from 'zod';

// Validates the public runtime config once, at module load. The app fails fast
// (build or first import) on missing/invalid env rather than producing a broken map.
//
// Next.js statically inlines `process.env.NEXT_PUBLIC_*`, so each var must be
// referenced by its full literal name — do not access process.env dynamically here.

// Only the API URL is required (must point at the deployed backend). Everything else has
// a sensible default, so hosting on Vercel needs just NEXT_PUBLIC_API_URL set.
const schema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url(),
  NEXT_PUBLIC_WS_URL: z.string().url().default('ws://localhost:8000'),
  NEXT_PUBLIC_MAP_STYLE_URL: z
    .string()
    .url()
    // Light basemap — clearest backdrop for the ESI heatmap overlay.
    .default('https://tiles.openfreemap.org/styles/liberty'),
  NEXT_PUBLIC_MAP_DEFAULT_LON: z.coerce.number().min(-180).max(180).default(77.209),
  NEXT_PUBLIC_MAP_DEFAULT_LAT: z.coerce.number().min(-90).max(90).default(28.6139),
  NEXT_PUBLIC_MAP_DEFAULT_ZOOM: z.coerce.number().min(0).max(24).default(11),
});

const parsed = schema.safeParse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
  NEXT_PUBLIC_MAP_STYLE_URL: process.env.NEXT_PUBLIC_MAP_STYLE_URL,
  NEXT_PUBLIC_MAP_DEFAULT_LON: process.env.NEXT_PUBLIC_MAP_DEFAULT_LON,
  NEXT_PUBLIC_MAP_DEFAULT_LAT: process.env.NEXT_PUBLIC_MAP_DEFAULT_LAT,
  NEXT_PUBLIC_MAP_DEFAULT_ZOOM: process.env.NEXT_PUBLIC_MAP_DEFAULT_ZOOM,
});

if (!parsed.success) {
  throw new Error(
    `Invalid public environment configuration:\n${parsed.error.toString()}`,
  );
}

export const env = parsed.data;
