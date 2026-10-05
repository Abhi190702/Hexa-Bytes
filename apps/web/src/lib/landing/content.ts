import {
  Building2,
  FlaskConical,
  GraduationCap,
  HeartPulse,
  Landmark,
  Leaf,
  type LucideIcon,
} from 'lucide-react';

export interface DataSource {
  name: string;
  source: string;
  frequency: string;
  precision: string;
  limitation: string;
  confidence: number; // 0–1, for the confidence meter
}

// Honest description of EvoComb's actual data inputs (current proxies + intended sensors).
export const DATA_SOURCES: DataSource[] = [
  {
    name: 'Noise',
    source: 'OSM road network (proxy) → ESP32 microphones',
    frequency: 'Per ingest (hourly target)',
    precision: '~100–300 m modeled · 10–30 m with sensors',
    limitation: 'Currently inferred from proximity to major roads, not measured.',
    confidence: 0.6,
  },
  {
    name: 'Crowd density',
    source: 'OSM points-of-interest density (proxy) → ESP32 BLE scans',
    frequency: 'Per ingest',
    precision: '~150 m proxy · 20–50 m with sensors',
    limitation: 'An activity/footfall proxy — not a live count of people.',
    confidence: 0.6,
  },
  {
    name: 'Air quality (AQI)',
    source: 'Open-Meteo air-quality model (US AQI)',
    frequency: 'Hourly',
    precision: '~11 km grid, interpolated (IDW) to cells',
    limitation: 'Modeled and coarse; not a street-level monitor.',
    confidence: 0.8,
  },
  {
    name: 'Heat',
    source: 'MET Norway temperature forecast',
    frequency: 'Hourly',
    precision: '~km grid, interpolated to cells',
    limitation: 'Spatially smooth; misses fine-grained heat islands.',
    confidence: 0.85,
  },
];

export interface Audience {
  title: string;
  icon: LucideIcon;
  useCase: string;
}

export const AUDIENCES: Audience[] = [
  {
    title: 'Urban Planners',
    icon: Building2,
    useCase: 'Target noise barriers, green corridors and cooling where burden is highest.',
  },
  {
    title: 'Researchers',
    icon: FlaskConical,
    useCase: 'A reproducible, open spatiotemporal dataset of urban environmental burden.',
  },
  {
    title: 'Policy Makers',
    icon: Landmark,
    useCase: 'Evidence to prioritise interventions and track progress by locality.',
  },
  {
    title: 'Environmental Scientists',
    icon: Leaf,
    useCase: 'Combine pollution, heat, noise and crowding into one comparable index.',
  },
  {
    title: 'Students',
    icon: GraduationCap,
    useCase: 'Learn geospatial analysis on a real, transparent smart-city pipeline.',
  },
  {
    title: 'Public Health Analysts',
    icon: HeartPulse,
    useCase: 'Map exposure hotspots against vulnerable populations.',
  },
];
