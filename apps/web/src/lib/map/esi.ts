import { esiBand, type RGBA } from '@platform/shared-types';

/** ESI value (0–100) -> RGBA fill color, from the shared color ramp. */
export function esiToColor(esi: number): RGBA {
  return esiBand(esi).color;
}
