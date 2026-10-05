// Annual-average PM2.5 (µg/m³) grid over Delhi NCR — the correct input for the AQLI
// life-expectancy figure (AQLI is calibrated on ANNUAL averages, not current readings).
//
// Source: Open-Meteo air-quality (CAMS), mean of the trailing 365 days of hourly PM2.5 at a
// 6×6 grid over the NCR bbox. Regenerate periodically (annual PM2.5 changes slowly):
//   apps/api  →  the build snippet in the commit message / scripts.
// Caveat: CAMS PM2.5 includes wind-blown dust; AQLI removes dust/sea-salt, so this runs a
// little lower than AQLI's dust-removed value (NCR mean here 86 µg/m³ vs AQLI's 88.4 for
// Delhi — within ~3%). It is a regional-resolution (~11 km model) estimate, not 1 km.

export interface PmPoint {
  lat: number;
  lng: number;
  pm25: number;
}

export const ANNUAL_PM25_GRID: PmPoint[] = [
  { lat: 28.08, lng: 76.65, pm25: 60.5 },
  { lat: 28.08, lng: 76.868, pm25: 60.5 },
  { lat: 28.08, lng: 77.086, pm25: 86.9 },
  { lat: 28.08, lng: 77.304, pm25: 86.9 },
  { lat: 28.08, lng: 77.522, pm25: 90.9 },
  { lat: 28.08, lng: 77.74, pm25: 90.9 },
  { lat: 28.25, lng: 76.65, pm25: 83.9 },
  { lat: 28.25, lng: 76.868, pm25: 83.9 },
  { lat: 28.25, lng: 77.086, pm25: 100.7 },
  { lat: 28.25, lng: 77.304, pm25: 100.7 },
  { lat: 28.25, lng: 77.522, pm25: 91.4 },
  { lat: 28.25, lng: 77.74, pm25: 91.4 },
  { lat: 28.42, lng: 76.65, pm25: 83.9 },
  { lat: 28.42, lng: 76.868, pm25: 83.9 },
  { lat: 28.42, lng: 77.086, pm25: 100.7 },
  { lat: 28.42, lng: 77.304, pm25: 100.7 },
  { lat: 28.42, lng: 77.522, pm25: 91.4 },
  { lat: 28.42, lng: 77.74, pm25: 91.4 },
  { lat: 28.59, lng: 76.65, pm25: 83.9 },
  { lat: 28.59, lng: 76.868, pm25: 83.9 },
  { lat: 28.59, lng: 77.086, pm25: 100.7 },
  { lat: 28.59, lng: 77.304, pm25: 100.7 },
  { lat: 28.59, lng: 77.522, pm25: 91.4 },
  { lat: 28.59, lng: 77.74, pm25: 91.4 },
  { lat: 28.76, lng: 76.65, pm25: 86.2 },
  { lat: 28.76, lng: 76.868, pm25: 86.2 },
  { lat: 28.76, lng: 77.086, pm25: 82.6 },
  { lat: 28.76, lng: 77.304, pm25: 82.6 },
  { lat: 28.76, lng: 77.522, pm25: 75.8 },
  { lat: 28.76, lng: 77.74, pm25: 75.8 },
  { lat: 28.93, lng: 76.65, pm25: 86.2 },
  { lat: 28.93, lng: 76.868, pm25: 86.2 },
  { lat: 28.93, lng: 77.086, pm25: 82.6 },
  { lat: 28.93, lng: 77.304, pm25: 82.6 },
  { lat: 28.93, lng: 77.522, pm25: 75.8 },
  { lat: 28.93, lng: 77.74, pm25: 75.8 },
];

const km = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const dlat = (lat2 - lat1) * 111;
  const dlng = (lng2 - lng1) * 111 * Math.cos(((lat1 + lat2) / 2) * (Math.PI / 180));
  return Math.hypot(dlat, dlng);
};

/** Inverse-distance-weighted annual PM2.5 (µg/m³) at a point — same IDW the ingest uses. */
export function annualPm25At(lat: number, lng: number): number {
  let wsum = 0;
  let weighted = 0;
  for (const p of ANNUAL_PM25_GRID) {
    const d = km(p.lat, p.lng, lat, lng);
    if (d < 1e-6) return p.pm25;
    const w = 1 / (d * d);
    weighted += w * p.pm25;
    wsum += w;
  }
  return wsum > 0 ? weighted / wsum : Number.NaN;
}
