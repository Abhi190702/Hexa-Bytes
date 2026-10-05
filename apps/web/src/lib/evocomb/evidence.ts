// The Evidence Layer. Four compact, sourced facts — one per signal — not a
// bibliography dump. Every entry maps to a real, published source, and each
// claim stays within what that source's abstract or summary states.
//
// `confidence` drives both the label and the small meter:
//   high       — strong, replicated evidence
//   moderate   — solid but context-dependent
//   limitation — a constraint of the data, stated plainly

export type EvidenceMarker = 'wave' | 'haze' | 'heat' | 'threshold' | 'grid';
export type Confidence = 'high' | 'moderate' | 'limitation';

export interface EvidenceCard {
  id: string;
  marker: EvidenceMarker;
  accent: string; // signal color, by meaning
  claim: string; // one sentence, specific
  source: string; // title
  year: number;
  institution: string; // journal / body
  confidence: Confidence;
  note: string; // confidence / limitation, one line
  detail: string; // drawer body — what the source actually establishes
  link: string; // DOI / source URL
  doi?: string; // shown as a label when present
}

export const EVIDENCE: EvidenceCard[] = [
  {
    id: 'temperature-warming',
    marker: 'heat',
    accent: '#e74c3c',
    claim:
      'Global surface temperature in 2011–2020 was 1.09 °C above 1850–1900 — and land warmed faster, by 1.59 °C.',
    source: 'Climate Change 2021: The Physical Science Basis — Summary for Policymakers',
    year: 2021,
    institution: 'IPCC Working Group I',
    confidence: 'high',
    note: 'Assessed across multiple independent datasets; likely range 0.95–1.20 °C.',
    detail:
      'The IPCC AR6 assessment puts the 2011–2020 global mean 1.09 °C above the pre-industrial baseline, with land at 1.59 °C and ocean at 0.88 °C. Because people live on land, the warming they experience runs well above the global average.',
    link: 'https://www.ipcc.ch/report/ar6/wg1/chapter/summary-for-policymakers/',
    doi: '10.1017/9781009157896.001',
  },
  {
    id: 'humidity-drying',
    marker: 'haze',
    accent: '#1abc9c',
    claim:
      'Observations show near-surface air over land drying faster than climate models project — relative humidity is falling.',
    source:
      'A drier than expected future, supported by near-surface relative humidity observations',
    year: 2023,
    institution: 'Science Advances',
    confidence: 'moderate',
    note: 'Observation-constrained projections; regional strength varies and models disagree.',
    detail:
      'Douville and Willett constrain 21st-century projections with quality-controlled temperature and humidity observations and find an inevitable continental drying, strongest in the northern mid-latitudes, where aerosols had masked the trend until the late 1980s.',
    link: 'https://doi.org/10.1126/sciadv.ade6253',
    doi: '10.1126/sciadv.ade6253',
  },
  {
    id: 'wind-stilling',
    marker: 'wave',
    accent: '#5dade2',
    claim:
      'Land wind speeds fell about 8% from ~1980 to 2010, then reversed — lifting potential wind energy by 17% over 2010–2017.',
    source:
      'A reversal in global terrestrial stilling and its implications for wind energy production',
    year: 2019,
    institution: 'Nature Climate Change',
    confidence: 'moderate',
    note: 'Station-based and concentrated in northern mid-latitudes; trends vary by region.',
    detail:
      'Zeng et al. analyse in-situ station records worldwide and show the long "terrestrial stilling" reversed around 2010. They link the decadal swings to internal ocean–atmosphere oscillations rather than vegetation growth or urbanisation.',
    link: 'https://doi.org/10.1038/s41558-019-0622-6',
    doi: '10.1038/s41558-019-0622-6',
  },
  {
    id: 'solar-dimming',
    marker: 'threshold',
    accent: '#f1c40f',
    claim:
      'Sunlight reaching land declined until about 1990 ("global dimming"), then turned into widespread brightening.',
    source: "From dimming to brightening: decadal changes in solar radiation at Earth's surface",
    year: 2005,
    institution: 'Science',
    confidence: 'high',
    note: 'Observations mainly from the Northern Hemisphere; regional timing differs.',
    detail:
      'Wild et al. show the surface dimming seen in records up to 1990 did not persist; a widespread brightening has been observed since the late 1980s, reconcilable with changes in cloudiness and atmospheric transmission.',
    link: 'https://doi.org/10.1126/science.1103215',
    doi: '10.1126/science.1103215',
  },
];

export const CONFIDENCE_META: Record<Confidence, { label: string; level: number; color: string }> =
  {
    high: { label: 'High confidence', level: 0.92, color: '#27ae60' },
    moderate: { label: 'Moderate confidence', level: 0.66, color: '#f1c40f' },
    limitation: { label: 'Known limitation', level: 0.4, color: '#7f8c8d' },
  };
