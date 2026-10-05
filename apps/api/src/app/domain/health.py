"""Environmental Health Risk Layer — the methodology, as code.

This sits ON TOP of the ESI (`app.domain.methodology`) and translates a cell's per-factor
scores into POPULATION-LEVEL, ASSOCIATIONAL environmental-health context, grounded in
published epidemiology. It is the single source of truth; the frontend mirrors only the
render constants in `packages/shared-types`.

GUARDRAILS — enforced by the design, not just the copy:
  • Population-level & associational ONLY. Never an individual prediction, diagnosis, or
    prognosis. Every output is "exposure at this level is *associated* in published studies
    with …", never "this place will cause …".
  • Anchored to PUBLISHED health thresholds — US EPA AQI categories, WHO Global Air Quality
    Guidelines 2021, WHO Environmental Noise Guidelines 2018 — not to the ESI's stylised
    0–100 calibration.
  • Evidence-weighted, and gated by how well we actually MEASURE each exposure:
      - Air pollution (AQI): strongest evidence (GRADE High, no safe threshold) → dominant.
      - Heat: strong evidence, but episodic (heatwave-driven, vulnerability-dependent).
      - Noise: GRADE-High evidence for IHD, BUT our value is a modeled road-distance proxy →
        shown for context, does NOT drive the headline band (low measurement confidence).
      - Urban density: DELIBERATELY EXCLUDED from any health-risk claim. The population-health
        evidence for urban density *per se* is weak/ambiguous, and our signal is an activity
        proxy, not household crowding. It stays an ESI *stressor* only.
  • The AQLI life-expectancy figure is a POPULATION-AVERAGE relative to the WHO guideline —
    never an individual lifespan.

KEY VERIFIED EVIDENCE (citation-hardening pass, adversarially verified against primary
sources):
  • PM2.5, per +10 µg/m³ long-term (Orellano et al., Int J Public Health 2024; WHO-
    commissioned): all-cause RR 1.095 (1.064–1.127, GRADE High); IHD 1.143 (High); stroke
    1.146; respiratory 1.136 (High); COPD 1.138 (High); lung cancer 1.093 (High). No safe
    threshold (ELAPSE 28 M cohort; GEMM/Burnett PNAS 2018).
  • AHA causal consensus: Brook et al., Circulation 2010.
  • India burden: 1.67 M deaths / 17.8 % of all deaths (2019) — Pandey et al., Lancet Planet
    Health 2021 (this is ALL air pollution: ambient PM 0.98 M + household 0.61 M + ozone).
  • Road-traffic noise IHD: +8 % per 10 dB Lden, RR 1.08 (1.01–1.15, GRADE High) — van
    Kempen et al. 2018 (the WHO-2018 review).
  NOTE: heat, density and the AQLI coefficient were not re-verified in that pass; the AQLI
  figure below uses the published AQLI methodology and is flagged for a follow-up check.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import IntEnum

from app.domain.methodology import (
    AQI_MAX,
    HEAT_MAX_C,
    HEAT_MIN_C,
    NOISE_MAX_DB,
    NOISE_MIN_DB,
    Metric,
    StressScores,
)


class RiskBand(IntEnum):
    """Ordered population-level environmental-health concern bands (IntEnum so we can take a
    precautionary max). These are CONCERN bands, not risk-of-death."""

    LOW = 0
    MODERATE = 1
    ELEVATED = 2
    HIGH = 3


BAND_LABEL: dict[RiskBand, str] = {
    RiskBand.LOW: "Low",
    RiskBand.MODERATE: "Moderate",
    RiskBand.ELEVATED: "Elevated",
    RiskBand.HIGH: "High",
}

# --- Published guideline anchors --------------------------------------------------------
WHO_PM25_ANNUAL = 5.0  # µg/m³, WHO Global AQG 2021 annual guideline
WHO_PM25_24H = 15.0  # µg/m³, WHO Global AQG 2021 24-hour guideline
WHO_NOISE_LDEN = 53.0  # dB, WHO 2018 road-traffic Lden recommendation
WHO_NOISE_LNIGHT = 45.0  # dB, WHO 2018 night-noise (Lnight) recommendation

# AQLI (Air Quality Life Index, Energy Policy Institute at the University of Chicago; built
# on Ebenstein et al., PNAS 2017): a sustained 10 µg/m³ higher PM2.5 is associated, at the
# POPULATION level, with ~0.98 fewer years of life expectancy → ~0.098 yr per µg/m³, taken
# relative to the WHO guideline. Coefficient flagged for primary-source verification.
AQLI_YEARS_PER_UGM3 = 0.098

# --- Evidence strength (GRADE-informed) and our measurement confidence ------------------
# evidence_weight: how strong the population-health evidence is for the factor.
# measurement_confidence: how well our platform actually measures that exposure.
EVIDENCE_WEIGHT: dict[Metric, float] = {
    Metric.AQI: 1.0,  # GRADE High, large effect, no threshold
    Metric.HEAT: 0.8,  # strong but episodic / vulnerability-dependent
    Metric.NOISE: 0.8,  # GRADE High for IHD
    Metric.DENSITY: 0.0,  # excluded from health-risk by design
}
MEASUREMENT_CONFIDENCE: dict[Metric, float] = {
    Metric.AQI: 0.7,  # real but modeled ~11 km grid
    Metric.HEAT: 0.6,  # ambient real; UHI offset modeled
    Metric.NOISE: 0.35,  # modeled from road distance — crude
    Metric.DENSITY: 0.0,
}
# Only factors we measure with at least this confidence may drive the HEADLINE band. Noise
# (0.35) is therefore shown for context but cannot set the band on its own.
_BAND_CONFIDENCE_FLOOR = 0.5


# --- Score → real-exposure helpers (invert the ESI normalisation) -----------------------
def us_aqi_from_score(aqi_score: float) -> float:
    """ESI aqi_score (0–100) → approximate US AQI (normalised over 0–AQI_MAX)."""
    return max(0.0, aqi_score) / 100.0 * AQI_MAX


def noise_db_from_score(noise_score: float) -> float:
    """ESI noise_score (0–100) → approximate dB (proxy)."""
    return NOISE_MIN_DB + max(0.0, min(100.0, noise_score)) / 100.0 * (NOISE_MAX_DB - NOISE_MIN_DB)


def temp_c_from_score(heat_score: float) -> float:
    """ESI heat_score (0–100) → approximate °C of heat-stress input."""
    return HEAT_MIN_C + max(0.0, min(100.0, heat_score)) / 100.0 * (HEAT_MAX_C - HEAT_MIN_C)


# US EPA PM2.5 AQI breakpoints (AQI_lo, AQI_hi, C_lo, C_hi µg/m³). Standard pre-2024 table.
_AQI_PM25_BREAKPOINTS = [
    (0, 50, 0.0, 12.0),
    (51, 100, 12.1, 35.4),
    (101, 150, 35.5, 55.4),
    (151, 200, 55.5, 150.4),
    (201, 300, 150.5, 250.4),
    (301, 500, 250.5, 500.4),
]


def pm25_from_us_aqi(us_aqi: float) -> float:
    """Invert the US EPA AQI piecewise-linear function to an approximate PM2.5 (µg/m³).

    Caveat: US AQI is the max of pollutant sub-indices; in Delhi NCR it is PM2.5-dominated,
    so treating it as PM2.5-equivalent is reasonable but approximate.
    """
    a = max(0.0, min(500.0, us_aqi))
    for a_lo, a_hi, c_lo, c_hi in _AQI_PM25_BREAKPOINTS:
        if a_lo <= a <= a_hi:
            return c_lo + (a - a_lo) / (a_hi - a_lo) * (c_hi - c_lo)
    return 500.4


# --- Per-factor health bands (guideline-anchored) ---------------------------------------
def aqi_band(aqi_score: float | None) -> RiskBand | None:
    """US EPA AQI categories → concern band. EPA categories ARE the published health bands."""
    if aqi_score is None:
        return None
    aqi = us_aqi_from_score(aqi_score)
    if aqi <= 50:
        return RiskBand.LOW
    if aqi <= 100:
        return RiskBand.MODERATE
    if aqi <= 150:  # Unhealthy for Sensitive Groups
        return RiskBand.ELEVATED
    return RiskBand.HIGH  # Unhealthy / Very Unhealthy / Hazardous


def noise_band(noise_score: float | None) -> RiskBand | None:
    """WHO 2018 road-traffic Lden thresholds → concern band (modeled proxy — low confidence)."""
    if noise_score is None:
        return None
    db = noise_db_from_score(noise_score)
    if db < WHO_NOISE_LDEN:  # < 53 dB
        return RiskBand.LOW
    if db < 60:
        return RiskBand.MODERATE
    if db < 70:
        return RiskBand.ELEVATED
    return RiskBand.HIGH


def heat_band(heat_score: float | None) -> RiskBand | None:
    """Heat-stress concern from the heat_score. Heat risk is episodic (heatwave-driven) and
    vulnerability-dependent, so this reflects *current/seasonal* conditions, not a fixed
    property of the place."""
    if heat_score is None:
        return None
    t = temp_c_from_score(heat_score)
    if t < 32:
        return RiskBand.LOW
    if t < 37:
        return RiskBand.MODERATE
    if t < 41:
        return RiskBand.ELEVATED
    return RiskBand.HIGH


def life_expectancy_loss_years(aqi_score: float | None) -> float | None:
    """AQLI population-average life-expectancy loss (years) vs the WHO PM2.5 guideline.

    POPULATION-LEVEL ONLY — the average shortfall for a population sustaining this PM2.5 level
    relative to meeting the WHO guideline (5 µg/m³). NEVER an individual prediction.

    CRITICAL FRAMING: AQLI is calibrated on ANNUAL-AVERAGE PM2.5. Our input is a current/recent
    modeled AQI, so this is strictly a counterfactual — "IF air stayed this bad year-round."
    A current reading at a seasonal peak therefore yields a larger figure than AQLI's published
    annual estimate for the region; the UI must say "if sustained year-round" and anchor to the
    published regional annual figure, not headline a per-cell instantaneous number.
    """
    if aqi_score is None:
        return None
    pm25 = pm25_from_us_aqi(us_aqi_from_score(aqi_score))
    return round(AQLI_YEARS_PER_UGM3 * max(0.0, pm25 - WHO_PM25_ANNUAL), 2)


@dataclass(frozen=True, slots=True)
class FactorHealth:
    metric: Metric
    band: RiskBand | None
    evidence_weight: float
    confidence: float
    drives_band: bool  # whether it can set the headline band (confidence-gated)


@dataclass(frozen=True, slots=True)
class HealthAssessment:
    """Population-level environmental-health context for one cell. Associational only."""

    band: RiskBand  # headline concern band (precautionary max of confident, high-evidence factors)
    dominant: Metric | None  # the factor most responsible for the band
    factors: tuple[FactorHealth, ...]
    life_expectancy_loss_years: float | None  # AQLI, population-average vs WHO guideline
    confidence: float  # overall, 0–1


_BAND_FN = {Metric.AQI: aqi_band, Metric.NOISE: noise_band, Metric.HEAT: heat_band}


def assess(scores: StressScores) -> HealthAssessment:
    """Translate ESI factor scores into a population-level health-concern assessment.

    Headline band = the precautionary MAX over factors that (a) have health evidence
    (evidence_weight > 0) and (b) we measure confidently enough (≥ floor). Averaging is
    avoided so a single severe exposure (e.g. hazardous AQI) is never diluted. Density is
    excluded entirely. Noise is reported but, being a crude proxy, cannot drive the band.
    """
    factors: list[FactorHealth] = []
    for metric, band_fn in _BAND_FN.items():
        band = band_fn(scores.get(metric))
        ev = EVIDENCE_WEIGHT[metric]
        conf = MEASUREMENT_CONFIDENCE[metric]
        drives = band is not None and ev > 0 and conf >= _BAND_CONFIDENCE_FLOOR
        factors.append(FactorHealth(metric, band, ev, conf, drives))

    driving = [f for f in factors if f.drives_band and f.band is not None]
    if driving:
        headline = max(f.band for f in driving if f.band is not None)
        # dominant = the band-driver with the highest evidence × confidence at that band.
        dominant = max(
            (f for f in driving if f.band == headline),
            key=lambda f: f.evidence_weight * f.confidence,
        ).metric
        confidence = round(sum(f.confidence for f in driving) / len(driving), 3)
    else:
        headline, dominant, confidence = RiskBand.LOW, None, 0.0

    return HealthAssessment(
        band=headline,
        dominant=dominant,
        factors=tuple(factors),
        life_expectancy_loss_years=life_expectancy_loss_years(scores.get(Metric.AQI)),
        confidence=confidence,
    )
