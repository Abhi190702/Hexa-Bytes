// Factor-indexed health evidence for the map click-panel. Every entry is population-level
// and associational. `verified: true` = adversarially checked against the primary source in
// the citation-hardening pass; `verified: false` = established landmark literature pending a
// follow-up verification pass (shown, but flagged).
//
// GUARDRAIL: nothing here is an individual prediction or diagnosis.

import type { HealthMetric } from '@platform/shared-types';

export type Grade = 'High' | 'Moderate' | 'Low' | 'Limitation';

export interface HealthEvidence {
  id: string;
  claim: string; // one sentence, associational, population-level
  effect?: string; // headline effect size, if quantified
  source: string;
  year: number;
  institution: string;
  grade: Grade;
  verified: boolean;
  note: string; // limitation / confidence
  link: string;
  doi?: string;
}

// Air pollution — the dominant, best-evidenced factor (all verified in the hardening pass).
const AQI_EVIDENCE: HealthEvidence[] = [
  {
    id: 'pm25-mortality',
    claim:
      'Long-term PM2.5 exposure is associated at the population level with higher all-cause, cardiovascular and respiratory mortality.',
    effect: 'All-cause RR 1.095 (1.064–1.127); IHD 1.143; respiratory 1.136 — per +10 µg/m³',
    source: 'Orellano et al., WHO-commissioned systematic review & meta-analysis',
    year: 2024,
    institution: 'International Journal of Public Health',
    grade: 'High',
    verified: true,
    note: 'GRADE High (certainty of the association). Effect sizes verified digit-for-digit.',
    link: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11466858/',
    doi: '10.3389/ijph.2024.1607683',
  },
  {
    id: 'pm25-causal',
    claim:
      'The AHA judges the evidence consistent with a causal relationship between PM2.5 and cardiovascular disease at the population level.',
    source: 'Brook et al., AHA Scientific Statement',
    year: 2010,
    institution: 'Circulation',
    grade: 'High',
    verified: true,
    note: 'Population/Bradford-Hill causal inference — never an individual-level claim.',
    link: 'https://pubmed.ncbi.nlm.nih.gov/20458016/',
    doi: '10.1161/CIR.0b013e3181dbece1',
  },
  {
    id: 'pm25-no-threshold',
    claim:
      'No safe PM2.5 threshold: mortality risk rises near-linearly down to very low concentrations, so benefits accrue at any reduction.',
    source: 'ELAPSE 28-million cohort (Strak/Stafoggia) & GEMM (Burnett)',
    year: 2022,
    institution: 'Lancet Planetary Health / PNAS',
    grade: 'High',
    verified: true,
    note: 'Associations persist below US/EU/WHO limits; supports the WHO 5 µg/m³ guideline.',
    link: 'https://www.thelancet.com/journals/lanplh/article/PIIS2542-5196(21)00277-1/fulltext',
    doi: '10.1016/S2542-5196(21)00277-1',
  },
  {
    id: 'india-burden',
    claim:
      '1.67 million deaths in India (17.8% of all deaths) were attributable to air pollution in 2019.',
    effect: 'Ambient PM 0.98M + household 0.61M + ozone 0.17M',
    source: 'Pandey et al., GBD-India air pollution analysis',
    year: 2021,
    institution: 'The Lancet Planetary Health',
    grade: 'High',
    verified: true,
    note: 'This is ALL air pollution, not ambient PM2.5 alone. Modelled attributable burden.',
    link: 'https://pubmed.ncbi.nlm.nih.gov/33357500/',
    doi: '10.1016/S2542-5196(20)30298-9',
  },
];

// Noise — strong evidence for IHD, but our measure is a crude modeled proxy.
const NOISE_EVIDENCE: HealthEvidence[] = [
  {
    id: 'noise-ihd',
    claim:
      'Each +10 dB of road-traffic noise (Lden) is associated with ~8% higher ischaemic heart-disease incidence.',
    effect: 'RR 1.08 (1.01–1.15)',
    source: 'van Kempen et al., WHO 2018 noise-guideline systematic review',
    year: 2018,
    institution: 'Int. Journal of Environmental Research & Public Health',
    grade: 'High',
    verified: true,
    note: 'GRADE High for IHD incidence (40–80 dB). Our noise is modeled from road distance, not measured — low measurement confidence.',
    link: 'https://www.mdpi.com/1660-4601/15/2/379',
    doi: '10.3390/ijerph15020379',
  },
  {
    id: 'noise-who-guideline',
    claim:
      'WHO recommends keeping road-traffic noise below 53 dB Lden (and 45 dB at night) to protect health.',
    source: 'WHO Environmental Noise Guidelines for the European Region',
    year: 2018,
    institution: 'World Health Organization',
    grade: 'High',
    verified: false,
    note: 'Threshold values pending primary-source re-verification.',
    link: 'https://www.who.int/europe/publications/i/item/9789289053563',
  },
];

// Heat — strong landmark evidence, not re-verified in this pass (flagged).
const HEAT_EVIDENCE: HealthEvidence[] = [
  {
    id: 'heat-mortality',
    claim:
      'High ambient temperature raises population mortality, with risk escalating non-linearly above a location-specific minimum-mortality temperature; driven by the temperature distribution, not annual mean.',
    effect: '0.42% of deaths attributable to heat across 384 cities / 13 countries (74.2M deaths)',
    source: 'Gasparrini et al., multicountry temperature–mortality study',
    year: 2015,
    institution: 'The Lancet',
    grade: 'High',
    verified: true,
    note: 'U/J-shaped exposure–response; minimum-mortality temperature ~80–90th percentile (varies by climate). Heat is episodic & vulnerability-dependent.',
    link: 'https://www.thelancet.com/journals/lancet/article/PIIS0140-6736(14)62114-0/fulltext',
    doi: '10.1016/S0140-6736(14)62114-0',
  },
];

export const HEALTH_EVIDENCE: Record<HealthMetric, HealthEvidence[]> = {
  aqi: AQI_EVIDENCE,
  noise: NOISE_EVIDENCE,
  heat: HEAT_EVIDENCE,
};

// The AQLI source for the life-expectancy insight (population-average, vs WHO guideline).
export const AQLI_SOURCE: HealthEvidence = {
  id: 'aqli',
  claim:
    'A sustained 10 µg/m³ higher annual PM2.5 is associated, at the population level, with ~0.98 fewer years of life expectancy (relative to the WHO guideline).',
  effect: '0.098 life-years per µg/m³',
  source: 'Air Quality Life Index (Greenstone/Ebenstein), Huai River study',
  year: 2017,
  institution: 'Energy Policy Institute, University of Chicago / PNAS',
  grade: 'Moderate',
  verified: true,
  note: 'Population-average, never individual. Coefficient 0.098 yr/µg/m³ verified (Ebenstein et al., PNAS 2017, via AQLI). Computed from this cell’s annual-average PM2.5 vs the WHO 5 µg/m³ guideline; regional-resolution input (~11 km), dust included.',
  link: 'https://aqli.epic.uchicago.edu/about/methodology/',
  doi: '10.1073/pnas.1616784114',
};

// Why density is deliberately not translated into a health-risk claim.
export const DENSITY_NOTE =
  'Urban crowding is shown as an environmental stressor but is not translated into a health-risk estimate: the population-health evidence for urban density itself is weak and confounded, and our signal is an activity proxy, not household crowding.';
