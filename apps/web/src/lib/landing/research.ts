// Verified, real research. Every entry corresponds to a published study/guideline.
// Do not add claims here without a real source.

export interface Citation {
  authors: string;
  title: string;
  journal: string;
  year: number;
  link: string;
}

export interface HealthImpact {
  factor: string;
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  caption: string;
  body: string;
  citation: Citation;
}

// Headline, count-up figures for the "why it matters" section — all real.
export const HEALTH_IMPACTS: HealthImpact[] = [
  {
    factor: 'Noise',
    value: 8,
    prefix: '+',
    suffix: '%',
    caption: 'ischaemic heart-disease risk per +10 dB of road-traffic noise',
    body: 'Chronic environmental noise raises stress hormones and blood pressure, and is linked to hypertension, heart attack, stroke and disrupted sleep.',
    citation: {
      authors: 'WHO Regional Office for Europe',
      title: 'Environmental Noise Guidelines for the European Region',
      journal: 'World Health Organization',
      year: 2018,
      link: 'https://www.who.int/europe/publications/i/item/9789289053563',
    },
  },
  {
    factor: 'Air pollution',
    value: 1.67,
    decimals: 2,
    suffix: 'M',
    caption: 'deaths in India attributable to air pollution in 2019 (17.8% of all deaths)',
    body: 'Long-term exposure to fine particulate matter (PM2.5) drives respiratory illness, cardiopulmonary disease and reduced life expectancy. Delhi routinely exceeds the WHO annual PM2.5 guideline of 5 µg/m³ many times over.',
    citation: {
      authors: 'Pandey A, Brauer M, Cropper ML, et al.',
      title: 'Health and economic impact of air pollution in the states of India: GBD 2019',
      journal: 'The Lancet Planetary Health 5(1):e25–e38',
      year: 2021,
      link: 'https://pubmed.ncbi.nlm.nih.gov/33357500/',
    },
  },
  {
    factor: 'Heat',
    value: 70000,
    suffix: '+',
    caption: 'excess deaths across Europe in the 2003 heatwave',
    body: 'Urban heat — amplified by concrete and lack of greenery — causes heat stress and raises mortality risk, especially for the elderly and outdoor workers.',
    citation: {
      authors: 'Robine JM, Cheung SLK, Le Roy S, et al.',
      title: 'Death toll exceeded 70,000 in Europe during the summer of 2003',
      journal: 'Comptes Rendus Biologies 331(2):171–178',
      year: 2008,
      link: 'https://doi.org/10.1016/j.crvi.2007.12.001',
    },
  },
];

// Full reference list for the research section, grouped by theme.
export const RESEARCH: { group: string; items: Citation[] }[] = [
  {
    group: 'Noise & cardiovascular health',
    items: [
      {
        authors: 'Münzel T, Schmidt FP, Steven S, et al.',
        title: 'Environmental Noise and the Cardiovascular System',
        journal: 'Journal of the American College of Cardiology 71(6):688–697',
        year: 2018,
        link: 'https://doi.org/10.1016/j.jacc.2017.12.015',
      },
      {
        authors: 'WHO Regional Office for Europe',
        title: 'Environmental Noise Guidelines for the European Region',
        journal: 'World Health Organization',
        year: 2018,
        link: 'https://www.who.int/europe/publications/i/item/9789289053563',
      },
    ],
  },
  {
    group: 'Air pollution & mortality',
    items: [
      {
        authors: 'Pope CA III, Burnett RT, Thun MJ, et al.',
        title:
          'Lung Cancer, Cardiopulmonary Mortality, and Long-Term Exposure to Fine Particulate Air Pollution',
        journal: 'JAMA 287(9):1132–1141',
        year: 2002,
        link: 'https://pubmed.ncbi.nlm.nih.gov/11879110/',
      },
      {
        authors: 'Pandey A, Brauer M, Cropper ML, et al.',
        title: 'Health and economic impact of air pollution in the states of India: GBD 2019',
        journal: 'The Lancet Planetary Health 5(1):e25–e38',
        year: 2021,
        link: 'https://pubmed.ncbi.nlm.nih.gov/33357500/',
      },
      {
        authors: 'World Health Organization',
        title: 'Global Air Quality Guidelines (PM2.5, PM10, O₃, NO₂, SO₂, CO)',
        journal: 'World Health Organization',
        year: 2021,
        link: 'https://www.who.int/publications/i/item/9789240034228',
      },
    ],
  },
  {
    group: 'Urban heat & mortality',
    items: [
      {
        authors: 'Gasparrini A, Guo Y, Hashizume M, et al.',
        title:
          'Mortality risk attributable to high and low ambient temperature: a multicountry observational study',
        journal: 'The Lancet 386(9991):369–375',
        year: 2015,
        link: 'https://doi.org/10.1016/S0140-6736(14)62114-0',
      },
      {
        authors: 'Robine JM, Cheung SLK, Le Roy S, et al.',
        title: 'Death toll exceeded 70,000 in Europe during the summer of 2003',
        journal: 'Comptes Rendus Biologies 331(2):171–178',
        year: 2008,
        link: 'https://doi.org/10.1016/j.crvi.2007.12.001',
      },
    ],
  },
];
