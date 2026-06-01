"""Runtime service for the Playground lap-time estimator.

Pure JSON-lookup + arithmetic over the coefficient bundle produced offline by
scripts/derive_playground_coefficients.py. No FastF1, no database. See
playground-math-spec.md §11 for the math and response contract.
"""

import json
import logging
from pathlib import Path
from typing import Any, Dict

from app.core.cache import CACHE

APP_DIR = Path(__file__).resolve().parent.parent          # backend/app
ANALYSIS_DIR = APP_DIR / "analysis_results"

DEFAULT_YEAR = 2024


class UnknownIdentifierError(ValueError):
    """Raised when a driver/chassis/engine id isn't in the loaded bundle.

    Carries the offending field and value so the route can return a 400 that
    names the unknown identifier (spec §11 — no silent defaults)."""

    def __init__(self, identifier_type: str, value: str):
        self.identifier_type = identifier_type
        self.value = value
        super().__init__(f"Unknown {identifier_type}: '{value}'")


class PlaygroundService:

    @staticmethod
    def load_coefficients(year: int = DEFAULT_YEAR) -> Dict[str, Any]:
        """Load and cache the coefficient bundle. Raises FileNotFoundError if absent."""
        cache_key = f"playground_{year}"
        if cache_key in CACHE:
            return CACHE[cache_key]

        path = ANALYSIS_DIR / f"playground_{year}.json"
        if not path.exists():
            raise FileNotFoundError(f"Playground coefficients for {year} not found at {path}")

        with open(path) as f:
            bundle = json.load(f)

        CACHE[cache_key] = bundle
        return bundle

    @staticmethod
    def simulate_lap(driver: str, chassis: str, engine: str, year: int = DEFAULT_YEAR) -> Dict[str, Any]:
        """Estimate a Bahrain lap from a driver/chassis/engine combo (spec §3.1/§3.2/§11.1)."""
        bundle = PlaygroundService.load_coefficients(year)

        if driver not in bundle["drivers"]:
            raise UnknownIdentifierError("driver", driver)
        if chassis not in bundle["chassis"]:
            raise UnknownIdentifierError("chassis", chassis)
        if engine not in bundle["engines"]:
            raise UnknownIdentifierError("engine", engine)

        d = bundle["drivers"][driver]
        c = bundle["chassis"][chassis]
        e = bundle["engines"][engine]

        baseline = bundle["baseline"]["lap_time_seconds"]
        proportions = bundle["baseline"]["sector_proportions"]
        weights = bundle["sector_weights"]

        total = baseline + d["delta"] + c["delta"] + e["delta"]

        sectors = []
        for i in range(3):
            sector = (
                baseline * proportions[i]
                + e["delta"] * weights["engine"][i]
                + c["delta"] * weights["chassis"][i]
                + d["delta"] * weights["driver"][i]
            )
            sectors.append(sector)

        reference_pole = bundle["metadata"].get("reference_pole_time_seconds")

        return {
            "total_time_seconds": total,
            "sectors": sectors,
            "components": {
                "baseline_seconds": baseline,
                "driver": {"code": driver, "delta": d["delta"], "sessions": d.get("sessions")},
                "chassis": {"key": chassis, "display_name": c.get("display_name"), "delta": c["delta"]},
                "engine": {"code": engine, "manufacturer": e.get("manufacturer"), "delta": e["delta"]},
            },
            "comparisons": {
                "baseline_delta": total - baseline,
                "vs_real_pole_2024": (total - reference_pole) if reference_pole is not None else None,
            },
            "methodology_version": bundle["metadata"].get("method_version"),
        }

    @staticmethod
    def list_eligible_choices(year: int = DEFAULT_YEAR) -> Dict[str, Any]:
        """Selectable drivers/chassis/engines for the frontend (spec §11.2). Fastest-first."""
        cache_key = f"playground_choices_{year}"
        if cache_key in CACHE:
            return CACHE[cache_key]

        bundle = PlaygroundService.load_coefficients(year)

        drivers = sorted(
            ({"code": code, "name": v.get("name"), "team_2024": v.get("team_2024")}
             for code, v in bundle["drivers"].items()),
            key=lambda x: bundle["drivers"][x["code"]]["delta"],
        )
        chassis = sorted(
            ({"key": key, "display_name": v.get("display_name"), "engine": v.get("engine")}
             for key, v in bundle["chassis"].items()),
            key=lambda x: bundle["chassis"][x["key"]]["delta"],
        )
        engines = sorted(
            ({"code": code, "manufacturer": v.get("manufacturer")}
             for code, v in bundle["engines"].items()),
            key=lambda x: bundle["engines"][x["code"]]["delta"],
        )

        result = {"year": year, "drivers": drivers, "chassis": chassis, "engines": engines}
        CACHE[cache_key] = result
        return result

    @staticmethod
    def list_challenges() -> Any:
        """Return the challenge list (spec §10.1). Static JSON, cached. Empty list if absent."""
        cache_key = "playground_challenges"
        if cache_key in CACHE:
            return CACHE[cache_key]

        path = ANALYSIS_DIR / "playground_challenges.json"
        challenges = []
        if path.exists():
            with open(path) as f:
                challenges = json.load(f)

        CACHE[cache_key] = challenges
        return challenges

    @staticmethod
    def get_methodology(year: int = DEFAULT_YEAR) -> Dict[str, Any]:
        """Methodology metadata for the 'how this was calculated' panel (spec §11.3)."""
        bundle = PlaygroundService.load_coefficients(year)
        meta = bundle["metadata"]
        return {
            "methodology_version": meta.get("method_version"),
            "track": meta.get("track"),
            "season": meta.get("season"),
            "derived_at": meta.get("derived_at"),
            "notes": meta.get("notes"),
            "reference_pole_time_seconds": meta.get("reference_pole_time_seconds"),
            "description": (
                "A fan-built plausibility calculator, not a physics or ML model. Lap time is a "
                "baseline (median 2024 Bahrain Q3 time) plus additive driver, chassis, and engine "
                "deltas derived from real 2024 qualifying data. Deltas attribute to three sectors "
                "via hand-tuned weights. The Renault engine delta is hand-assigned."
            ),
        }
