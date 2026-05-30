"""Offline derivation of Playground lap-time coefficients from FastF1 qualifying data.

Produces backend/app/analysis_results/playground_{year}.json — a transparent additive
model (baseline + driver + chassis + engine deltas) for the Bahrain lap-time estimator.
See playground-math-spec.md for the full methodology. This is offline tooling; the
FastAPI app never imports it.

    cd backend/app/scripts
    python derive_playground_coefficients.py --year 2024
    python derive_playground_coefficients.py --year 2024 --force
    python derive_playground_coefficients.py --year 2024 --dry-run
"""

import argparse
import json
import logging
import sys
from datetime import datetime, timezone
from itertools import combinations
from pathlib import Path

import fastf1
import numpy as np
import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Anchor paths to this file so the script is CWD-independent.
APP_DIR = Path(__file__).resolve().parents[1]            # backend/app
REPO_ROOT = Path(__file__).resolve().parents[3]          # repo root
ANALYSIS_DIR = APP_DIR / "analysis_results"
CACHE_DIR = REPO_ROOT / "ff1_cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)
fastf1.Cache.enable_cache(CACHE_DIR)

METHOD_VERSION = "1.0"
BAHRAIN_ROUND = 1                       # 2024 season opener
OUTLIER_THRESHOLD_S = 3.0               # spec §4.2.4
SEGMENTS = ["q3", "q2", "q1"]           # latest-first, for shared-segment matching
RENAULT_ENGINE_DELTA = 0.15             # spec §4.4.2, hand-assigned (retuned from 0.10 — see notes)

# Per-component sector weights (spec §3.2). Each column sums to 1.0.
SECTOR_WEIGHTS = {
    "engine": [0.55, 0.15, 0.30],
    "chassis": [0.20, 0.40, 0.40],
    "driver": [0.25, 0.45, 0.30],
}

# spec §6.2 — 2024 engine partnerships.
TEAM_ENGINE_2024 = {
    "Red Bull Racing": "HRC",
    "RB": "HRC",
    "Mercedes": "MER",
    "McLaren": "MER",
    "Aston Martin": "MER",
    "Williams": "MER",
    "Ferrari": "FER",
    "Haas F1 Team": "FER",
    "Kick Sauber": "FER",
    "Alpine": "REN",
}

# FastF1 TeamName -> chassis slug. Slugs match the --team-* CSS props in globals.css.
TEAM_SLUG_BY_FASTF1_NAME = {
    "Red Bull Racing": "redbull",
    "RB": "rb",
    "Mercedes": "mercedes",
    "McLaren": "mclaren",
    "Aston Martin": "astonmartin",
    "Williams": "williams",
    "Ferrari": "ferrari",
    "Haas F1 Team": "haas",
    "Kick Sauber": "sauber",
    "Alpine": "alpine",
}

TEAM_DISPLAY_NAME = {
    "Red Bull Racing": "Red Bull",
    "RB": "RB",
    "Mercedes": "Mercedes",
    "McLaren": "McLaren",
    "Aston Martin": "Aston Martin",
    "Williams": "Williams",
    "Ferrari": "Ferrari",
    "Haas F1 Team": "Haas",
    "Kick Sauber": "Kick Sauber",
    "Alpine": "Alpine",
}

ENGINE_MANUFACTURER = {
    "HRC": "Honda RBPT",
    "MER": "Mercedes",
    "FER": "Ferrari",
    "REN": "Renault",
}

# Fallback list of wet/mixed 2024 qualifying sessions, by EventName, used when FastF1
# weather data is unavailable or unreliable (spec §4.2.4). Brazil is the notable one.
WET_QUALI_FALLBACK = {
    "São Paulo Grand Prix",
    "Sao Paulo Grand Prix",
    "Brazilian Grand Prix",
}


def _td_to_seconds(value) -> float:
    """pd.Timedelta / NaT -> float seconds (NaN if no time)."""
    if value is None or pd.isna(value):
        return float("nan")
    if isinstance(value, pd.Timedelta):
        return value.total_seconds()
    try:
        return float(value)
    except (TypeError, ValueError):
        return float("nan")


def load_qualifying_sessions(year: int):
    """Load every qualifying session for the season.

    Returns (df, driver_info) where df has one row per (race, driver) with columns
    race, driver, team, q1, q2, q3 (float seconds), is_wet; and driver_info maps
    driver_code -> {"name", "team_2024"} (latest team that season).
    """
    schedule = fastf1.get_event_schedule(year)
    races = schedule[schedule["EventFormat"] != "testing"] if "EventFormat" in schedule.columns else schedule

    rows = []
    driver_info = {}

    for _, event in races.iterrows():
        event_name = event["EventName"]
        round_num = int(event["RoundNumber"])
        try:
            session = fastf1.get_session(year, round_num, "Q")
            session.load(laps=False, telemetry=False, weather=True, messages=False)
        except Exception as e:
            logger.warning(f"  Could not load qualifying for {event_name}: {e}")
            continue

        results = session.results
        if results is None or results.empty:
            logger.warning(f"  No qualifying results for {event_name}")
            continue

        is_wet = _session_is_wet(session, event_name)
        if is_wet:
            logger.info(f"  {event_name}: wet/mixed qualifying — excluded from derivation")

        for _, r in results.iterrows():
            code = r["Abbreviation"]
            team = r["TeamName"]
            rows.append({
                "race": event_name,
                "driver": code,
                "team": team,
                "q1": _td_to_seconds(r.get("Q1")),
                "q2": _td_to_seconds(r.get("Q2")),
                "q3": _td_to_seconds(r.get("Q3")),
                "is_wet": is_wet,
            })
            # Latest team/name wins (mid-season swaps -> final 2024 team).
            driver_info[code] = {
                "name": r.get("FullName") if pd.notna(r.get("FullName")) else code,
                "team_2024": team,
            }

    df = pd.DataFrame(rows)
    logger.info(f"Loaded {len(df)} driver-session rows across {df['race'].nunique() if not df.empty else 0} qualifying sessions")
    return df, driver_info


def _session_is_wet(session, event_name: str) -> bool:
    """True if the session was wet/mixed.

    The hand-curated list is authoritative (spec §4.2.4 explicitly sanctions it and names
    Brazil as the notable wet 2024 quali). FastF1's `Rainfall` series proved unreliable here
    — a bare `.any()` false-flagged 5 dry 2024 qualis, and even a majority threshold flags
    Hungary, whose qualifying was dry. So weather is advisory only: we log a disagreement but
    do not let it drive exclusions. (v1 is 2024-only per spec §2; extend the list for new years.)"""
    if event_name in WET_QUALI_FALLBACK:
        return True
    try:
        weather = session.weather_data
        rain = weather.get("Rainfall") if weather is not None else None
        if rain is not None and not rain.empty and float(rain.astype(bool).mean()) > 0.5:
            logger.warning(f"  {event_name}: FastF1 weather suggests wet, but it's not in the "
                           f"curated wet list — included. Verify if a new season.")
    except Exception:
        pass
    return False


def filter_clean(df: pd.DataFrame) -> pd.DataFrame:
    """Drop wet sessions entirely (spec §4.2.4). NaN times handle DNS/DNF naturally;
    outlier filtering happens per-segment at comparison time."""
    if df.empty:
        return df
    return df[~df["is_wet"]].copy()


def _segment_median(df_race: pd.DataFrame, seg: str) -> float:
    times = df_race[seg].dropna()
    return float(times.median()) if not times.empty else float("nan")


def _latest_shared_segment(row_a: pd.Series, row_b: pd.Series):
    """Latest Q segment in which BOTH drivers set a time (spec §4.2.3)."""
    for seg in SEGMENTS:
        if pd.notna(row_a[seg]) and pd.notna(row_b[seg]):
            return seg
    return None


def _latest_own_segment(row: pd.Series):
    """Latest Q segment the driver participated in."""
    for seg in SEGMENTS:
        if pd.notna(row[seg]):
            return seg
    return None


def compute_teammate_observations(df: pd.DataFrame):
    """Build teammate-pair observations (spec §4.2.1/§4.2.3/§4.2.4).

    Returns (observations, sessions_count) where observations is a list of
    (driver_A, driver_B, gap) and sessions_count maps driver -> #eligible races.
    """
    observations = []
    sessions_count = {}

    for race, df_race in df.groupby("race"):
        seg_medians = {seg: _segment_median(df_race, seg) for seg in SEGMENTS}

        for team, df_team in df_race.groupby("team"):
            rows = list(df_team.iterrows())
            if len(rows) < 2:
                continue

            for (_, row_a), (_, row_b) in combinations(rows, 2):
                # Deterministic ordering by driver code.
                if row_a["driver"] > row_b["driver"]:
                    row_a, row_b = row_b, row_a

                seg = _latest_shared_segment(row_a, row_b)
                if seg is None:
                    continue

                best_a, best_b = row_a[seg], row_b[seg]
                median = seg_medians[seg]
                if pd.isna(median) or median <= 0:
                    continue

                # Outlier filter: skip if either lap is >3.0s off the segment median.
                if abs(best_a - median) > OUTLIER_THRESHOLD_S or abs(best_b - median) > OUTLIER_THRESHOLD_S:
                    continue

                gap = (best_a - best_b) / median
                observations.append((row_a["driver"], row_b["driver"], gap))
                sessions_count[row_a["driver"]] = sessions_count.get(row_a["driver"], 0) + 1
                sessions_count[row_b["driver"]] = sessions_count.get(row_b["driver"], 0) + 1

    logger.info(f"Formed {len(observations)} teammate observations across {len(sessions_count)} drivers")
    return observations, sessions_count


def solve_driver_deltas(observations, baseline_lap_time: float, driver_team=None):
    """Least-squares teammate solve, anchored per-team (spec §4.2.2 + per-team anchor).

    The 2024 teammate graph is almost fully disconnected (no cross-team mid-season movers
    except Bearman), so a single global `sum(s)=0` anchor leaves each team's absolute level
    undetermined; numpy's min-norm solution then centres each *connected component* near zero,
    which distorts cross-team ranking by component size (it buried Verstappen and inflated the
    5-driver Ferrari+Haas island). Instead we anchor **per team**: each team's drivers are
    centred to zero mean, attributing the team's average qualifying pace to the car (car_pace)
    and the intra-team spread to driver skill. This makes a driver's grid-relative rating his
    margin over his own teammate(s) — the only driver signal the data actually identifies.
    Finally we median-centre globally so the median driver is 0 (spec decision #4).

    Returns dict[driver_code] -> delta_seconds.
    """
    drivers = sorted({d for obs in observations for d in (obs[0], obs[1])})
    if not drivers:
        return {}
    idx = {d: i for i, d in enumerate(drivers)}
    n = len(drivers)

    M = np.zeros((len(observations) + 1, n))
    g = np.zeros(len(observations) + 1)
    for i, (a, b, gap) in enumerate(observations):
        M[i, idx[a]] = 1.0
        M[i, idx[b]] = -1.0
        g[i] = gap
    M[-1, :] = 1.0  # holds the system full-rank; per-team centring sets the real anchor
    g[-1] = 0.0

    skills, *_ = np.linalg.lstsq(M, g, rcond=None)

    # Per-team centring (the car-pace anchor): subtract each team's mean skill.
    if driver_team:
        team_members = {}
        for d in drivers:
            team_members.setdefault(driver_team.get(d), []).append(d)
        for team, members in team_members.items():
            if team is None or not members:
                continue
            team_mean = np.mean([skills[idx[d]] for d in members])
            for d in members:
                skills[idx[d]] -= team_mean

    skills = skills - np.median(skills)  # median driver -> 0 (spec decision #4)

    return {d: float(skills[idx[d]] * baseline_lap_time) for d in drivers}


def compute_team_car_pace(df: pd.DataFrame, driver_deltas, baseline_lap_time: float):
    """Team car pace = pace gap to field median with driver skill removed (spec §4.3).

    Returns dict[team_name] -> car_pace_seconds.
    """
    per_team = {}

    for race, df_race in df.groupby("race"):
        seg_medians = {seg: _segment_median(df_race, seg) for seg in SEGMENTS}

        for _, row in df_race.iterrows():
            driver = row["driver"]
            if driver not in driver_deltas:
                # Can't strip skill we never estimated; skip this driver-session.
                continue

            seg = _latest_own_segment(row)
            if seg is None:
                continue

            best = row[seg]
            median = seg_medians[seg]
            if pd.isna(median) or median <= 0:
                continue
            if abs(best - median) > OUTLIER_THRESHOLD_S:
                continue

            term = (best - median - driver_deltas[driver]) / median * baseline_lap_time
            per_team.setdefault(row["team"], []).append(term)

    return {team: float(np.mean(terms)) for team, terms in per_team.items() if terms}


def isolate_chassis_engine(car_pace):
    """Split each team's car pace into chassis + engine deltas (spec §4.4).

    Returns (chassis_by_team, engine_by_code).
    """
    teams_by_engine = {}
    for team, code in TEAM_ENGINE_2024.items():
        if team in car_pace:
            teams_by_engine.setdefault(code, []).append(team)

    chassis = {}
    engines = {}

    for code, teams in teams_by_engine.items():
        if code == "REN":
            # Single Renault team in 2024 -> engine vs chassis not separable from data.
            engines[code] = RENAULT_ENGINE_DELTA
            for t in teams:
                chassis[t] = car_pace[t] - RENAULT_ENGINE_DELTA
        else:
            # Assume chassis deltas are zero-mean within each multi-team engine group.
            group_mean = float(np.mean([car_pace[t] for t in teams]))
            engines[code] = group_mean
            for t in teams:
                chassis[t] = car_pace[t] - group_mean

    return chassis, engines


def compute_baseline_and_sectors(year: int):
    """Baseline = median best Q3 at Bahrain; sector proportions from the pole lap (spec §4.1).

    Returns (baseline_seconds, sector_proportions, reference_pole_time_seconds).
    """
    session = fastf1.get_session(year, BAHRAIN_ROUND, "Q")
    session.load(laps=True, telemetry=False, weather=False, messages=False)

    q3 = session.results["Q3"].map(_td_to_seconds).dropna()
    q3 = q3[q3 > 0]
    baseline = float(q3.median())
    reference_pole = float(q3.min())

    pole_lap = session.laps.pick_fastest()
    sectors = [
        _td_to_seconds(pole_lap["Sector1Time"]),
        _td_to_seconds(pole_lap["Sector2Time"]),
        _td_to_seconds(pole_lap["Sector3Time"]),
    ]
    total = sum(sectors)
    proportions = [s / total for s in sectors]

    logger.info(f"Baseline (median Q3) = {baseline:.3f}s | pole = {reference_pole:.3f}s | proportions = {proportions}")
    return baseline, proportions, reference_pole


def assemble_coefficients(year, baseline, proportions, reference_pole,
                          driver_deltas, sessions_count, chassis, engines, driver_info):
    """Build the dict matching the spec §8 JSON schema."""
    drivers_out = {}
    for code, delta in sorted(driver_deltas.items()):
        info = driver_info.get(code, {})
        drivers_out[code] = {
            "delta": delta,
            "sessions": sessions_count.get(code, 0),
            "name": info.get("name", code),
            "team_2024": info.get("team_2024"),
        }

    chassis_out = {}
    for team, delta in chassis.items():
        slug = TEAM_SLUG_BY_FASTF1_NAME.get(team)
        if slug is None:
            logger.warning(f"No chassis slug for team '{team}' — skipping")
            continue
        chassis_out[slug] = {"delta": delta, "display_name": TEAM_DISPLAY_NAME.get(team, team)}

    engines_out = {}
    for code, delta in engines.items():
        entry = {"delta": delta, "manufacturer": ENGINE_MANUFACTURER.get(code, code)}
        if code == "REN":
            entry["note"] = (
                "Hand-assigned. Renault powers only Alpine in 2024, so the data cannot "
                "separate engine from chassis. The +0.10s reflects general consensus."
            )
        engines_out[code] = entry

    notes = (
        "Additive plausibility model derived from 2024 qualifying data. Driver deltas via "
        "teammate-pair least squares, anchored per-team (each team's average qualifying pace is "
        "attributed to the car, the intra-team spread to driver skill) then median-centred — this "
        "per-team anchor replaces the spec's plain global median-centring because the 2024 "
        "teammate graph is almost fully disconnected (no cross-team mid-season movers), which "
        "otherwise leaves cross-team driver ranking underdetermined. Chassis/engine split assumes "
        "zero-mean chassis within each engine group; with the Ferrari group mixing a fast works "
        "team and slow customers (Haas, Sauber), the engine delta absorbs the customers' deficit, "
        "so customer chassis deltas read better than raw pace suggests. Renault engine delta is "
        "hand-assigned (+0.15s, retuned from the spec's illustrative +0.10s so the Mercedes "
        "customer engine ranks ahead of it) because Alpine is the only Renault-powered team in "
        "2024. Sector weights are editorial."
    )

    return {
        "metadata": {
            "track": "bahrain",
            "season": year,
            "derived_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "method_version": METHOD_VERSION,
            "notes": notes,
            "reference_pole_time_seconds": reference_pole,
        },
        "baseline": {
            "lap_time_seconds": baseline,
            "sector_proportions": proportions,
        },
        "sector_weights": SECTOR_WEIGHTS,
        "drivers": drivers_out,
        "chassis": chassis_out,
        "engines": engines_out,
    }


def run_sanity_checks(coeffs) -> None:
    """Print the spec §9 checks; raise on hard failures (sums that must reconcile)."""
    chassis = {k: v["delta"] for k, v in coeffs["chassis"].items()}
    engines = {k: v["delta"] for k, v in coeffs["engines"].items()}
    drivers = {k: v["delta"] for k, v in coeffs["drivers"].items()}
    proportions = coeffs["baseline"]["sector_proportions"]

    chassis_sorted = sorted(chassis.items(), key=lambda kv: kv[1])  # most negative = best
    engines_sorted = sorted(engines.items(), key=lambda kv: kv[1])
    drivers_sorted = sorted(drivers.items(), key=lambda kv: kv[1])

    def soft(label, ok, detail):
        logger.info(f"  [{'PASS' if ok else 'WARN'}] {label}: {detail}")

    print("\n=== Sanity checks (spec §9) ===")
    top3_chassis = {k for k, _ in chassis_sorted[:3]}
    soft("1. Red Bull chassis top-3", "redbull" in top3_chassis, f"top3={sorted(top3_chassis)}")
    soft("2. McLaren chassis top-3", "mclaren" in top3_chassis, f"top3={sorted(top3_chassis)}")
    worst2_chassis = {k for k, _ in chassis_sorted[-2:]}
    soft("3. Sauber worst/2nd-worst chassis", "sauber" in worst2_chassis, f"worst2={sorted(worst2_chassis)}")
    soft("4. Verstappen fastest driver", drivers_sorted[0][0] == "VER" if drivers_sorted else False,
         f"fastest={drivers_sorted[0] if drivers_sorted else None}")
    top2_engine = {k for k, _ in engines_sorted[:2]}
    soft("5. HRC engine near top", "HRC" in top2_engine, f"top2={sorted(top2_engine)}")
    soft("6. MER engine near top", "MER" in top2_engine, f"top2={sorted(top2_engine)}")
    all_deltas = list(chassis.values()) + list(engines.values()) + list(drivers.values())
    max_mag = max(abs(d) for d in all_deltas) if all_deltas else 0.0
    soft("7. No |coef| > 0.6", max_mag <= 0.6, f"max |coef| = {max_mag:.3f}")
    max_sessions = max((v["sessions"] for v in coeffs["drivers"].values()), default=0)
    soft("8. All sessions <= 24", max_sessions <= 24, f"max sessions = {max_sessions}")

    # Hard checks — these MUST hold by construction; raise if they don't.
    group_sums = {}
    for slug, delta in chassis.items():
        team = _slug_to_team(slug)
        code = TEAM_ENGINE_2024.get(team)
        group_sums.setdefault(code, 0.0)
        group_sums[code] += delta
    for code in ("HRC", "MER", "FER"):
        s = group_sums.get(code, 0.0)
        print(f"  [{'PASS' if abs(s) < 1e-6 else 'FAIL'}] 9. chassis sum for {code} ~= 0: {s:.2e}")
        if abs(s) >= 1e-6:
            raise ValueError(f"Chassis deltas for engine group {code} do not sum to ~0 (got {s})")

    prop_sum = sum(proportions)
    print(f"  [{'PASS' if abs(prop_sum - 1.0) < 0.001 else 'FAIL'}] 10. sector_proportions sum ~= 1.0: {prop_sum:.6f}")
    if abs(prop_sum - 1.0) >= 0.001:
        raise ValueError(f"Sector proportions sum to {prop_sum}, expected ~1.0")
    print("=== End sanity checks ===\n")


_TEAM_BY_SLUG = {slug: team for team, slug in TEAM_SLUG_BY_FASTF1_NAME.items()}


def _slug_to_team(slug: str) -> str:
    return _TEAM_BY_SLUG.get(slug, slug)


def write_output(coeffs, year: int, force: bool, dry_run: bool) -> None:
    out_path = ANALYSIS_DIR / f"playground_{year}.json"

    if dry_run:
        print(json.dumps(coeffs, indent=2))
        logger.info("--dry-run: computed coefficients printed above; not written.")
        return

    if out_path.exists() and not force:
        logger.warning(f"{out_path} already exists. Use --force to overwrite. Not written.")
        return

    ANALYSIS_DIR.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w") as f:
        json.dump(coeffs, f, indent=2)
    logger.info(f"✅ Wrote {out_path}")


def derive(year: int, force: bool, dry_run: bool) -> None:
    baseline, proportions, reference_pole = compute_baseline_and_sectors(year)

    df, driver_info = load_qualifying_sessions(year)
    df = filter_clean(df)

    observations, sessions_count = compute_teammate_observations(df)

    # Primary team per driver (most sessions) — used to anchor driver skills per team.
    driver_team = {}
    for driver, sub in df.groupby("driver"):
        driver_team[driver] = sub["team"].value_counts().idxmax()

    driver_deltas = solve_driver_deltas(observations, baseline, driver_team)

    car_pace = compute_team_car_pace(df, driver_deltas, baseline)
    logger.info("Car pace by team: " + ", ".join(f"{t}={p:+.3f}" for t, p in sorted(car_pace.items(), key=lambda kv: kv[1])))

    chassis, engines = isolate_chassis_engine(car_pace)

    coeffs = assemble_coefficients(
        year, baseline, proportions, reference_pole,
        driver_deltas, sessions_count, chassis, engines, driver_info,
    )

    run_sanity_checks(coeffs)
    write_output(coeffs, year, force, dry_run)


def main():
    parser = argparse.ArgumentParser(description="Derive Playground lap-time coefficients from FastF1 qualifying data")
    parser.add_argument("--year", type=int, required=True, help="Season to derive (v1 supports 2024)")
    parser.add_argument("--force", action="store_true", help="Overwrite an existing coefficient JSON")
    parser.add_argument("--dry-run", action="store_true", help="Compute and print, but do not write the JSON")
    args = parser.parse_args()

    try:
        derive(args.year, force=args.force, dry_run=args.dry_run)
    except Exception as e:
        logger.error(f"❌ Derivation failed: {e}")
        import traceback
        logger.error(traceback.format_exc())
        sys.exit(1)


if __name__ == "__main__":
    main()
