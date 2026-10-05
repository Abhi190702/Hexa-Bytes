import { Droplets, Sun, Thermometer, Wind, type LucideIcon } from 'lucide-react';
import type { SignalKey } from '@/lib/evocomb/signals';

// Icons and plain-language descriptions for the map's "How it works" explainer.
// Definitional only — what each signal is and how it feeds the score — no claims.
export const SIGNAL_INFO: Record<SignalKey, { icon: LucideIcon; plain: string }> = {
  humidity: {
    icon: Droplets,
    plain: 'How close the air is to saturation (%). Humid air holds heat and slows cooling.',
  },
  wind: {
    icon: Wind,
    plain: 'How fast the air is moving (m/s). Moving air carries heat away from a place.',
  },
  solar: {
    icon: Sun,
    plain: 'How much sunlight reaches the ground (W/m²). It heats surfaces and the air above.',
  },
  temperature: {
    icon: Thermometer,
    plain: 'How hot the air is (°C) — the most direct measure of heat a place carries.',
  },
};
