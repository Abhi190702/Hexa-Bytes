"""Tests pinning the Environmental Health Risk Layer methodology. Changes here mean the
health methodology changed — that must be deliberate and evidence-justified."""

import pytest

from app.domain.health import (
    RiskBand,
    aqi_band,
    assess,
    life_expectancy_loss_years,
    noise_band,
    pm25_from_us_aqi,
)
from app.domain.methodology import Metric, StressScores


@pytest.mark.parametrize(
    ("score", "expected"),
    [
        (10, RiskBand.LOW),  # US AQI 30  → Good
        (25, RiskBand.MODERATE),  # US AQI 75  → Moderate
        (45, RiskBand.ELEVATED),  # US AQI 135 → Unhealthy for Sensitive Groups
        (80, RiskBand.HIGH),  # US AQI 240 → Very Unhealthy
    ],
)
def test_aqi_band_matches_epa_categories(score, expected) -> None:  # type: ignore[no-untyped-def]
    assert aqi_band(score) == expected


def test_noise_band_anchored_to_who_53db() -> None:
    assert noise_band(10) == RiskBand.LOW  # ~46 dB, below WHO 53
    assert noise_band(25) == RiskBand.MODERATE  # ~55 dB (53–60)
    assert noise_band(45) == RiskBand.ELEVATED  # ~67 dB (60–70)
    assert noise_band(100) == RiskBand.HIGH  # 100 dB


def test_pm25_from_us_aqi_breakpoints() -> None:
    assert pm25_from_us_aqi(50) == pytest.approx(12.0, abs=0.1)
    assert pm25_from_us_aqi(100) == pytest.approx(35.4, abs=0.1)
    assert pm25_from_us_aqi(0) == pytest.approx(0.0, abs=0.1)


def test_aqli_zero_below_who_guideline() -> None:
    # Clean air (PM2.5 below the WHO 5 µg/m³ guideline) → no population LE shortfall.
    assert life_expectancy_loss_years(6) == 0.0  # US AQI 18 → ~4.3 µg/m³ < 5


def test_aqli_positive_when_polluted() -> None:
    # US AQI 150 → ~55 µg/m³ → 0.098 × (55.4 − 5) ≈ 4.9 years (population-average, AQLI).
    loss = life_expectancy_loss_years(50)
    assert loss is not None and loss == pytest.approx(4.94, abs=0.1)


def test_density_never_drives_the_band() -> None:
    # Extreme crowding but otherwise clean/cool/quiet → band stays LOW. Density is excluded
    # from the health-risk computation by design.
    a = assess(StressScores(aqi=10, noise=10, heat=10, density=100))
    assert a.band == RiskBand.LOW
    assert Metric.DENSITY not in {f.metric for f in a.factors}


def test_low_confidence_noise_cannot_set_headline() -> None:
    # Noise reads HIGH but is a crude modeled proxy (confidence below the band floor), so the
    # headline band is driven by the confidently-measured factors (here LOW), not by noise.
    a = assess(StressScores(aqi=10, heat=10, noise=100, density=0))
    assert a.band == RiskBand.LOW
    noise = next(f for f in a.factors if f.metric == Metric.NOISE)
    assert noise.band == RiskBand.HIGH  # still reported for context…
    assert noise.drives_band is False  # …but cannot drive the headline


def test_precautionary_max_and_dominant_driver() -> None:
    # Hazardous air + mild heat → headline = the worst (air), with AQI as the dominant driver.
    a = assess(StressScores(aqi=50, noise=80, heat=30, density=100))
    assert a.band == RiskBand.ELEVATED
    assert a.dominant == Metric.AQI
    assert a.life_expectancy_loss_years is not None and a.life_expectancy_loss_years > 0


def test_assessment_is_associational_population_level_only() -> None:
    # Structural guardrail: the output exposes only bands + a population AQLI figure — no
    # individual-risk field exists to misuse.
    a = assess(StressScores(aqi=50, noise=50, heat=50, density=50))
    assert hasattr(a, "band") and hasattr(a, "life_expectancy_loss_years")
    assert not hasattr(a, "individual_risk")
