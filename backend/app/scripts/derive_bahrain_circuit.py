"""Offline derivation of the Bahrain circuit geometry for the Playground animation.

Produces frontend/rainline-frnt/public/playground/bahrain-circuit.json — a normalized
top-down track outline plus sector-boundary positions, used by the Playground page to
animate a marker around the lap.

The marker follows the *real* pole lap's speed profile (slow in corners, fast on
straights). We achieve that by resampling the telemetry on a uniform TIME grid: equal
steps through the points array then correspond to equal real time, so a marker advanced
linearly through the array reproduces the real speed profile. Sector boundaries are
stored as fractions of that time axis (= fractions into the points array).

This is offline tooling; the FastAPI app never imports it. Mirrors the conventions of
derive_playground_coefficients.py (CWD-independent paths, shared ff1_cache).

    cd backend/app/scripts
    python derive_bahrain_circuit.py
    python derive_bahrain_circuit.py --dry-run
    python derive_bahrain_circuit.py --force
"""

import argparse
import json
import logging
import sys
from pathlib import Path

import fastf1
import numpy as np
import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Anchor paths to this file so the script is CWD-independent.
APP_DIR = Path(__file__).resolve().parents[1]            # backend/app
REPO_ROOT = Path(__file__).resolve().parents[3]          # repo root
CACHE_DIR = REPO_ROOT / "ff1_cache"
OUTPUT_PATH = REPO_ROOT / "frontend" / "rainline-frnt" / "public" / "playground" / "bahrain-circuit.json"
CACHE_DIR.mkdir(parents=True, exist_ok=True)
fastf1.Cache.enable_cache(CACHE_DIR)

YEAR = 2024
BAHRAIN_ROUND = 1            # 2024 season opener
VIEWBOX_LONG_AXIS = 1000.0   # longer track dimension maps to this many SVG units
MARGIN = 40.0                # padding inside the viewBox so the marker isn't clipped
N_POINTS = 360               # uniform-time samples around the lap


def _td_to_seconds(value) -> float:
    if value is None or pd.isna(value):
        return float("nan")
    if isinstance(value, pd.Timedelta):
        return value.total_seconds()
    return float(value)


def build_geometry():
    """Return the circuit-geometry dict for the Bahrain pole lap."""
    session = fastf1.get_session(YEAR, BAHRAIN_ROUND, "Q")
    session.load()

    lap = session.laps.pick_fastest()
    if lap is None:
        raise RuntimeError("No fastest lap found for Bahrain qualifying.")

    tel = lap.get_telemetry()
    t = tel["Time"].dt.total_seconds().to_numpy()
    x = tel["X"].to_numpy(dtype=float)
    y = tel["Y"].to_numpy(dtype=float)

    # Telemetry Time is lap-relative; normalize to a clean 0..duration axis.
    t = t - t[0]
    duration = float(t[-1])

    # Resample on a uniform time grid: equal index steps == equal real time, so the
    # stored polyline encodes the speed profile (corners are densely sampled in space).
    grid = np.linspace(0.0, duration, N_POINTS)
    xs = np.interp(grid, t, x)
    ys = np.interp(grid, t, y)

    # Normalize into a fixed viewBox, preserving aspect ratio. Flip Y (telemetry Y is
    # north-up; SVG Y grows downward).
    x_min, x_max = xs.min(), xs.max()
    y_min, y_max = ys.min(), ys.max()
    span_x, span_y = x_max - x_min, y_max - y_min
    scale = (VIEWBOX_LONG_AXIS - 2 * MARGIN) / max(span_x, span_y)

    nx = (xs - x_min) * scale + MARGIN
    ny = (y_max - ys) * scale + MARGIN  # flip Y
    width = span_x * scale + 2 * MARGIN
    height = span_y * scale + 2 * MARGIN

    points = [{"x": round(float(px), 2), "y": round(float(py), 2)} for px, py in zip(nx, ny)]

    # Sector boundaries as fractions of the (time) axis == fractions into the points
    # array. Real pole-lap sector durations locate where the boundaries sit on track.
    s1 = _td_to_seconds(lap["Sector1Time"])
    s2 = _td_to_seconds(lap["Sector2Time"])
    s3 = _td_to_seconds(lap["Sector3Time"])
    sector_total = s1 + s2 + s3
    b1 = s1 / sector_total
    b2 = (s1 + s2) / sector_total

    logger.info(
        f"Lap {lap['LapTime']} | sectors {s1:.3f}/{s2:.3f}/{s3:.3f} "
        f"| boundaries {b1:.3f}, {b2:.3f} | {len(points)} points"
    )

    return {
        "track": "bahrain",
        "season": YEAR,
        "viewBox": {"width": round(width, 2), "height": round(height, 2)},
        "points": points,
        "sector_boundaries": [round(float(b1), 4), round(float(b2), 4)],
        "start_finish": points[0],
    }


def write_output(geometry, force: bool, dry_run: bool) -> None:
    if dry_run:
        preview = dict(geometry)
        preview["points"] = f"<{len(geometry['points'])} points omitted>"
        print(json.dumps(preview, indent=2))
        logger.info("--dry-run: geometry summary printed above; not written.")
        return

    if OUTPUT_PATH.exists() and not force:
        logger.warning(f"{OUTPUT_PATH} already exists. Use --force to overwrite. Not written.")
        return

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump(geometry, f, indent=2)
    logger.info(f"Wrote {OUTPUT_PATH}")


def main():
    parser = argparse.ArgumentParser(description="Derive Bahrain circuit geometry for the Playground animation")
    parser.add_argument("--force", action="store_true", help="Overwrite an existing geometry JSON")
    parser.add_argument("--dry-run", action="store_true", help="Compute and summarize, but do not write")
    args = parser.parse_args()

    try:
        geometry = build_geometry()
        write_output(geometry, force=args.force, dry_run=args.dry_run)
    except Exception as e:
        logger.error(f"Derivation failed: {e}")
        import traceback
        logger.error(traceback.format_exc())
        sys.exit(1)


if __name__ == "__main__":
    main()
