"""Tests pinning the ESI methodology. If these change, the methodology changed —
that must be deliberate (see app/domain/methodology.py and the esi-methodology memory)."""

import pytest

from app.domain.methodology import (
    StressScores,
    compute_confidence,
    compute_esi,
    normalize_aqi,
    normalize_density,
    normalize_heat,
    normalize_noise,
    urban_heat_offset,
)


def test_canonical_example() -> None:
    # Noise 80, Density 60, Heat 70, AQI 50  ->  0.3*80 + 0.25*60 + 0.2*70 + 0.25*50 = 65.5
    scores = StressScores(noise=80, density=60, heat=70, aqi=50)
    esi = compute_esi(scores)
    assert esi == pytest.approx(65.5)
    assert round(esi) == 66


@pytest.mark.parametrize(
    ("fn", "raw", "expected"),
    [
        (normalize_noise, 40, 0),
        (normalize_noise, 100, 100),
        (normalize_noise, 70, 50),
        (normalize_density, 0, 0),
        (normalize_density, 50, 100),
        (normalize_density, 25, 50),
        (normalize_heat, 25, 0),
        (normalize_heat, 45, 100),
        (normalize_heat, 35, 50),
        (normalize_aqi, 0, 0),
        (normalize_aqi, 300, 100),
        (normalize_aqi, 150, 50),
    ],
)
def test_normalization(fn, raw, expected) -> None:  # type: ignore[no-untyped-def]
    assert fn(raw) == pytest.approx(expected)


@pytest.mark.parametrize(
    ("fn", "raw"),
    [
        (normalize_noise, 20),  # below min
        (normalize_noise, 130),  # above max
        (normalize_aqi, 500),
        (normalize_density, -5),
        (normalize_heat, 60),
    ],
)
def test_clamped_to_0_100(fn, raw) -> None:  # type: ignore[no-untyped-def]
    assert 0.0 <= fn(raw) <= 100.0


def test_partial_data_renormalizes() -> None:
    # Only noise present -> ESI equals the noise score (not deflated by missing weights).
    assert compute_esi(StressScores(noise=80)) == pytest.approx(80.0)


def test_confidence_all_present() -> None:
    # 0.30*1.0 + 0.25*0.6 + 0.20*0.7 + 0.25*0.8 = 0.79  (heat = modeled UHI proxy)
    scores = StressScores(noise=80, density=60, heat=70, aqi=50)
    assert compute_confidence(scores) == pytest.approx(0.79)


def test_urban_heat_offset() -> None:
    # Fully built-up adds +4°C; water cools −2°C; bare/ambient is 0; inputs clamp.
    assert urban_heat_offset(1.0) == pytest.approx(4.0)
    assert urban_heat_offset(0.0) == pytest.approx(0.0)
    assert urban_heat_offset(0.5) == pytest.approx(2.0)
    assert urban_heat_offset(1.0, water=1.0) == pytest.approx(2.0)
    assert urban_heat_offset(2.0, water=2.0) == pytest.approx(2.0)  # clamped to [0,1]


def test_confidence_partial_lower() -> None:
    full = compute_confidence(StressScores(noise=80, density=60, heat=70, aqi=50))
    partial = compute_confidence(StressScores(noise=80, aqi=50))
    assert partial < full
