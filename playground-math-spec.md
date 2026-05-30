# Playground: Math & Data Spec

Status: Spec, pre-implementation. Backend / data scope only. Frontend implementation is out of scope for this document and will be specified separately.

## 1. Overview

The Playground is a new feature on rainline that lets users build counterfactual driver / chassis / engine combinations and receive an estimated fastest lap time at Bahrain. The pitch in one sentence: pick Leclerc, give him a Red Bull chassis and a Mercedes engine, see what the lap time would plausibly be.

This is a fan-built plausibility calculator, not a physics simulator and not a machine-learned model. It produces estimates by combining hand-derived per-component pace deltas, themselves computed from real 2024 qualifying data. The math is intentionally transparent: every estimate decomposes into named contributions that sum to the final time, and the methodology is exposed to the user.

**v1 scope:** single track (Bahrain), 2024 grid only, three configurable components (driver, chassis, engine), output is total lap time plus three sector times plus the per-component deltas that produced them. Free-play mode and challenge mode use identical math; challenge mode is a UI constraint on which slots the user can change, not a separate model.

## 2. Non-Goals (v1)

These are out of scope and should not be partially implemented as scaffolding:

- Multiple tracks. Track selector, per-track coefficients, track-type modifiers.
- Setup tuning (downforce, brake bias, tire compound, fuel load).
- Live FastF1 calls at request time. Everything runtime is JSON lookups and arithmetic.
- Machine-learned models of any kind.
- Confidence intervals or error ranges on the output.
- Historical drivers or grids from prior seasons.
- Weather variation. Estimates assume dry qualifying conditions on representative tires.
- Multi-lap, race, tire degradation, fuel burn, or strategy modelling.
- User accounts, saved combinations, leaderboards.
- Driver-chassis interaction terms (e.g. "Leclerc gets an extra bonus in a Ferrari").
- Challenge content management. v1 ships a small fixed set of challenges defined inline; a CMS or admin surface is out of scope.

## 3. The Model

### 3.1 Lap time decomposition

Lap time is computed as a baseline plus three additive deltas in seconds:

```
lap_time = baseline_lap_time
         + driver_delta
         + chassis_delta
         + engine_delta
```

All deltas are signed: negative is faster than the field median, positive is slower. The baseline represents the lap time of "the median 2024 driver in the median 2024 car at Bahrain." Each delta describes how the user's selection deviates from that median.

The decomposition is additive (not multiplicative, not exponential, not interaction-augmented) on purpose: it lets the UI display the breakdown as a literal sum that reconciles to the total. This transparency is core to the feature.

### 3.2 Sector breakdown

The same three deltas attribute to three sector times. Each component's full delta is split across the three sectors via hand-tuned weights that sum to 1.0 down each column:

|             | S1   | S2   | S3   | column sum |
| ----------- | ---- | ---- | ---- | ---------- |
| Engine      | 0.55 | 0.15 | 0.30 | 1.00       |
| Chassis     | 0.20 | 0.40 | 0.40 | 1.00       |
| Driver      | 0.25 | 0.45 | 0.30 | 1.00       |

Rationale, Bahrain-specific:
- **Sector 1** is two long straights and a heavy braking zone. Power-dominant, hence engine weight is highest there.
- **Sector 2** is the technical middle section with medium-speed corners. Chassis (mechanical grip, balance) and driver (multiple time-loss opportunities) dominate.
- **Sector 3** is high-speed flowing corners onto the main straight. Chassis (aero) leads, driver matters for commitment, engine matters for exit onto the straight.

These weights are editorial, not derived. The methodology panel in the UI should note this. When a second track is added (out of scope for v1) the weights will be re-tuned per track.

Base sector times come from the proportions of a real reference lap at Bahrain (see § 4.1).

### 3.3 Worked example

To make the math concrete. Suppose the coefficient bundle has:

```
baseline_lap_time            = 90.300 s
sector_proportions           = [0.305, 0.348, 0.347]
driver["LEC"].delta          = -0.22 s
chassis["red_bull"].delta    = -0.18 s
engine["mercedes"].delta     = -0.05 s
```

Total time:
```
total = 90.300 + (-0.22) + (-0.18) + (-0.05) = 89.850 s
```

Sector 1:
```
base_s1     = 90.300 * 0.305 = 27.542
engine_s1   = -0.05 * 0.55   = -0.0275
chassis_s1  = -0.18 * 0.20   = -0.036
driver_s1   = -0.22 * 0.25   = -0.055
s1_total    = 27.542 - 0.0275 - 0.036 - 0.055 = 27.423
```

Sectors 2 and 3 computed analogously. The three sector times sum back to the total within rounding error.

## 4. Coefficient Derivation Methodology

This section specifies how each number in the coefficient JSON is computed from 2024 qualifying data. Derivation runs offline via a script; the runtime API never executes any of this.

### 4.1 Baseline lap time

The baseline is the **median best Q3 lap time at Bahrain 2024 qualifying**, in seconds.

- Source: FastF1 2024 Bahrain Qualifying session, `session.results`.
- Take the `Q3` column for all drivers who set a time in Q3.
- Compute the median (not the mean, which is dragged by outliers; not the pole time, which is the best of the best rather than a "median competitive lap").
- Convert from `pd.Timedelta` to seconds as a float.

This number is the anchor. Every delta is measured against the implicit "median Q3 driver in a median Q3 car" that this baseline represents.

**Sector proportions** come from a single reference lap: the 2024 Bahrain pole lap. Take its sector times, divide each by the total, and store as a length-3 array that sums to 1.0. Pole lap is appropriate here because we are only using it for *proportions*, not absolute time, and the pole lap has the cleanest sector structure (no traffic, fully committed).

### 4.2 Driver deltas

Driver deltas are computed across **all 2024 qualifying sessions**, not just Bahrain. The deltas describe general driver pace, which is then applied to Bahrain via the sector weighting in § 3.2.

#### 4.2.1 The teammate-pair approach

For each qualifying session at each Grand Prix, identify pairs of drivers who shared a team during that session. For each such pair (A, B), generate one observation:

```
gap_AB = (best_lap_A - best_lap_B) / median_field_lap_in_segment
```

where:
- `best_lap_A`, `best_lap_B` are the better of the two drivers' best times *within the same qualifying segment* (see § 4.2.3).
- `median_field_lap_in_segment` is the median of all best lap times set in that same segment by all drivers. Normalising by lap time turns absolute gaps into proportional gaps, which are comparable across tracks of different lengths.

Each observation becomes one equation in a linear system:
```
s_A - s_B = gap_AB
```

where `s_A`, `s_B` are the unknown skill ratings of drivers A and B respectively (in units of "fraction of a lap time"; multiply by baseline lap time at the end to get seconds).

#### 4.2.2 Solving the system

Stack all observations into a matrix equation `M · s = g`:
- `M` has one row per observation, with `+1` in the column for driver A, `-1` in the column for driver B, and zeros elsewhere.
- `s` is the vector of unknown skill ratings.
- `g` is the vector of observed gaps.

This system is rank-deficient by one (adding a constant to all skills produces an identical system). Anchor by appending one constraint row: `sum(s) = 0`, i.e. an all-ones row with target `0`.

Solve via `numpy.linalg.lstsq`. The result is a global skill rating for every driver in the system.

**Re-centring:** after solving, subtract the median rating from every driver. This makes the median driver exactly zero, which matches the intuition that the baseline lap time represents the median driver. (The `sum=0` anchor and median centering aren't equivalent; the second is preferred for interpretation.)

**Unit conversion:** multiply each rating by `baseline_lap_time` to get the per-driver delta in seconds. Store this in the JSON.

#### 4.2.3 Q1/Q2/Q3 segment matching

Teammates can be eliminated in different qualifying segments. Q1 laps are sandbagged (drivers do the minimum to advance); Q3 laps are full attack. Comparing across segments is unfair.

**Rule:** for each (race, teammate pair), compare laps from the latest segment that *both* drivers participated in.

- Both reached Q3 → compare Q3 best times.
- One eliminated in Q2, the other reached Q3 → compare Q2 best times (the Q3 driver's Q2 time is still recorded).
- Both eliminated in Q2 → compare Q2 best times.
- One eliminated in Q1, the other in Q2 → compare Q1 best times.
- Both eliminated in Q1 → compare Q1 best times.

This produces one observation per teammate pair per race when both drivers set a clean lap in their shared latest segment.

#### 4.2.4 Filters and exclusions

Drop an observation if any of the following apply:
- Either driver did not set a time in the shared segment (DNS, withdrew, no representative lap).
- The qualifying session was officially wet or mixed. Use FastF1's session weather info; fall back to a hand-curated list of wet 2024 qualifying sessions if needed (Brazil is the notable one).
- Either driver's best lap is more than **3.0 seconds** off the median of all clean laps set in that segment. This catches red-flag-interrupted laps, traffic, and major errors. The threshold is generous on purpose; tighter thresholds drop legitimate slow laps from backmarker teams.

#### 4.2.5 Driver eligibility for the playground

The full driver list in the coefficient JSON is determined by the active-grid convention from § 12.2, *not* by who appears in the 2024 teammate-pair data.

Each active driver falls into one of three cases:

- **Has 2024 teammate-pair observations** → use the least-squares rating directly.
- **Drove in 2024 but had no eligible observations** (e.g. only raced one weekend, never set a clean comparable lap) → exclude from the playground in v1. In the JSON, `drivers` only contains entries for whom we have a defensible delta. The API surfaces only those drivers as selectable.
- **Did not drive in 2024 at all** (rookies promoted for 2025) → exclude from the playground in v1. Same treatment as above. They become eligible once a 2025 derivation runs against 2025 data.

A driver's `sessions` count is stored alongside their delta (see § 8) so the UI can convey how robust the estimate is.

### 4.3 Team car pace

Car pace is team pace with driver effects removed. For each team:

```
car_pace[team] = mean over all team-session pairs of:
                 (team_best_qualifying_time
                  - median_field_best_in_segment
                  - driver_delta_in_seconds) / median_field_best_in_segment
                * baseline_lap_time
```

In plain English: for each race, take each of the team's drivers, compute how far their best qualifying time was from the field median in their segment (in seconds), subtract their personal driver delta, then average across both drivers and all 2024 races. The result is the team's "average car pace gap to field median" in seconds, having stripped out who was driving.

Use the same segment-matching, wet exclusion, and outlier filtering as in § 4.2.4.

The result is a single number per team, in seconds.

### 4.4 Chassis and engine isolation

Each team's car pace decomposes into chassis and engine:
```
car_pace[team] = chassis_delta[team] + engine_delta[team_engine]
```

The 2024 engine partnerships are:

| Engine code | Manufacturer | Teams                                            |
| ----------- | ------------ | ------------------------------------------------ |
| HRC         | Honda RBPT   | Red Bull, RB                                     |
| MER         | Mercedes     | Mercedes, McLaren, Aston Martin, Williams        |
| FER         | Ferrari     | Ferrari, Haas, Sauber                            |
| REN         | Renault      | Alpine                                           |

10 teams, 4 engines, 14 unknowns. Within each engine group, the engine-vs-chassis level is not separable without an additional assumption.

#### 4.4.1 Assumption: chassis deltas are zero-mean within each engine group

For each multi-team engine group (HRC, MER, FER):
```
engine_delta[group] = mean(car_pace[t] for t in teams_in_group)
chassis_delta[t]    = car_pace[t] - engine_delta[group]   for each t in group
```

This means within an engine family, chassis deltas describe how each team's chassis differs from the *engine group average*, and the engine delta absorbs the overall level of that group. Defensible because the engine is the only shared component; if Mercedes-powered teams average -0.10s, the model attributes that shared advantage to the Mercedes engine, not to a freak coincidence of four good chassis.

#### 4.4.2 Renault: the single-team problem

Alpine is the only Renault-powered team in 2024, so the engine vs chassis level can't be separated from the data. Hand-assign:

```
engine_delta[REN]   = +0.10 s   # editorial estimate, documented
chassis_delta[ALP]  = car_pace[ALP] - engine_delta[REN]
```

The `+0.10` reflects general consensus that the Renault PU lagged the field in 2024 without being catastrophic. This is the only hand-assigned coefficient in the model and must be flagged in the JSON metadata and in the UI methodology panel.

If Alpine's car_pace turns out to be (say) +0.18s, this assignment gives them chassis +0.08s (slightly below-average chassis) and engine +0.10s (notable engine deficit). If car_pace is closer to zero, Alpine ends up with an above-average chassis and a below-average engine. Both stories are plausible; the assignment encodes our preferred narrative explicitly.

### 4.5 Notes on what the model intentionally cannot capture

These should appear in the methodology panel verbatim or close to it:

- **Driver / car fit.** Some drivers suit oversteer-y cars, others need stable rears. The model assumes driver skill is independent of chassis choice.
- **Track-specific component weighting.** Driver deltas are full-season averages. A driver who is exceptional in slow corners but average everywhere else gets the average rating.
- **Operational quality.** Team strategy, pit stops, tire warm-up. Irrelevant for a one-lap qualifying simulation, but it means the chassis delta also implicitly contains "team setup philosophy" which is hard to disentangle.
- **Sample size.** A driver who appeared in 6 sessions has a less reliable delta than one with 24. The `sessions` field is exposed so the UI can convey this.

## 5. Locked Decisions

The following choices are settled. Changing them requires reopening this spec.

| # | Decision                       | Choice                                                                                |
| - | ------------------------------ | ------------------------------------------------------------------------------------- |
| 1 | Baseline lap time              | Median best Q3 time, 2024 Bahrain qualifying                                          |
| 2 | Sector proportions             | From 2024 Bahrain pole lap                                                            |
| 3 | Sector weights per component   | Hand-tuned values in § 3.2                                                            |
| 4 | Driver delta normalisation     | Re-centre on median = 0 after lstsq solve                                             |
| 5 | Driver delta units             | Stored in seconds (raw lstsq output multiplied by `baseline_lap_time`)                |
| 6 | Renault engine                 | Hand-assigned `+0.10s`, flagged in JSON and UI                                        |
| 7 | Rookie / no-2024-data drivers  | Excluded from v1 playground                                                           |
| 8 | Drivers with 2024 obs but none eligible | Excluded from v1 playground                                                  |
| 9 | Mid-season driver swap drivers | Included, with reduced session count surfaced                                         |
| 10 | Q1/Q2/Q3 matching             | Latest shared segment only                                                            |
| 11 | Wet qualifying                 | Excluded from all derivation                                                          |
| 12 | Outlier threshold              | Drop any lap >3.0s off in-segment median                                              |
| 13 | UI precision                   | Total lap time to 3 decimals; component deltas to 2 decimals (round on display, not in storage) |
| 14 | Storage precision              | Float seconds, no rounding in JSON                                                    |

## 6. Data Sources

### 6.1 FastF1

All derivation data comes from FastF1. The cache lives at `ff1_cache/` (already wired via `backend/app/core/`). First-run downloads are slow; subsequent runs are nearly free.

For each 2024 Grand Prix qualifying session:
- Load the session: `fastf1.get_session(2024, round_number, 'Q')`, then `session.load()`.
- Required: `session.results` (DataFrame with columns including `Abbreviation`, `TeamName`, `Q1`, `Q2`, `Q3`).
- Required: weather info to filter wet sessions. FastF1 exposes weather data on the session; if unreliable, maintain a small hand-curated list of wet 2024 quali sessions in the script.

For the baseline and sector proportions:
- Load 2024 Bahrain qualifying (round 1).
- Median of `Q3` column for baseline.
- Pole lap sector times from `session.laps.pick_fastest()` or equivalent for sector proportions.

The derivation does not need lap-by-lap telemetry. It only needs best segment times per driver per session, which `session.results` already exposes.

### 6.2 Engine mapping

The team → engine mapping is not in the existing database. Hardcode the 2024 mapping inside the derivation script as a constant. It is a 10-entry dict and does not change mid-season:

```python
TEAM_ENGINE_2024 = {
    "Red Bull Racing":   "HRC",
    "RB":                "HRC",
    "Mercedes":          "MER",
    "McLaren":           "MER",
    "Aston Martin":      "MER",
    "Williams":          "MER",
    "Ferrari":           "FER",
    "Haas F1 Team":      "FER",
    "Kick Sauber":       "FER",
    "Alpine":            "REN",
}
```

Exact team-name strings should match whatever FastF1 returns in `session.results.TeamName` for 2024. Verify when implementing.

### 6.3 Existing database

The derivation does not require the existing `f1_drivers.db`. It pulls everything from FastF1 directly. The committed DB is irrelevant to coefficient computation.

However, the *runtime API* uses the database to determine which drivers are "active" (see § 12.2). Active-driver determination follows the existing convention.

## 7. Edge Cases

Most are covered in §4. Consolidated here for review.

| Case                                        | Handling                                                                           |
| ------------------------------------------- | ---------------------------------------------------------------------------------- |
| Wet / mixed qualifying                      | Exclude entire session from derivation                                             |
| DNS / DNF in qualifying                     | Exclude that driver's observation; teammate gap not formed for that race           |
| Mismatched Q segment elimination            | Use latest shared segment                                                          |
| Both teammates eliminated in same segment   | Use that segment                                                                   |
| Red-flag-affected lap (very slow time)      | Outlier filter (>3s off in-segment median) catches it                              |
| Mid-season driver swap                      | Each driver appears in observations for the races they were present                |
| Rookie / no 2024 data                       | Exclude from v1 playground entirely                                                |
| Driver with 2024 races but no clean obs     | Exclude from v1 playground                                                         |
| Renault as single-team engine               | Hand-assigned engine delta                                                         |
| Team name string variations across sessions | Normalise via a lookup table in the script if FastF1 ever returns inconsistent names |

## 8. Output: Coefficient JSON

The derivation script produces one file. Location:

```
backend/app/analysis_results/playground_2024.json
```

This mirrors the existing `analysis_results/{year}.json` pattern from the wet-performance feature (referenced in `CLAUDE.md` under "Backend caches season analysis"). The file is committed to the repo.

Schema (informative TypeScript-style; the file is plain JSON):

```ts
{
  "metadata": {
    "track": "bahrain",
    "season": 2024,
    "derived_at": "2026-05-30T12:34:56Z",   // ISO 8601 UTC
    "method_version": "1.0",
    "notes": string                          // free-form, must include the Renault assumption
  },
  "baseline": {
    "lap_time_seconds": 90.123,              // float seconds
    "sector_proportions": [0.305, 0.348, 0.347]  // sums to 1.0 within rounding
  },
  "sector_weights": {                         // each column sums to 1.0
    "engine":  [0.55, 0.15, 0.30],
    "chassis": [0.20, 0.40, 0.40],
    "driver":  [0.25, 0.45, 0.30]
  },
  "drivers": {
    "VER": { "delta": -0.28, "sessions": 22, "name": "Max Verstappen", "team_2024": "Red Bull Racing" },
    "LEC": { "delta": -0.22, "sessions": 24, "name": "Charles Leclerc", "team_2024": "Ferrari" },
    // ... one entry per playground-eligible driver
  },
  "chassis": {
    "red_bull":     { "delta": -0.18, "display_name": "Red Bull" },
    "mclaren":      { "delta": -0.21, "display_name": "McLaren" },
    // ... one entry per 2024 team
  },
  "engines": {
    "HRC": { "delta": -0.12, "manufacturer": "Honda RBPT" },
    "MER": { "delta": -0.05, "manufacturer": "Mercedes" },
    "FER": { "delta":  0.02, "manufacturer": "Ferrari" },
    "REN": { "delta":  0.10, "manufacturer": "Renault", "note": "Hand-assigned. Renault powers only Alpine in 2024, so the data cannot separate engine from chassis. The +0.10s reflects general consensus." }
  }
}
```

**Identifier conventions:**

- **Driver code:** 3-letter uppercase abbreviation (`VER`, `LEC`). Matches the existing convention used throughout the codebase (e.g., `/api/drivers/{code}` route and `useDriver` hook).
- **Chassis key:** lowercase snake-style slug matching the existing team-color convention in `lib/teamColors.js` and the CSS custom props (`--team-redbull`, `--team-mclaren`, etc.). The derivation script should normalise FastF1's `TeamName` strings to these keys via a lookup table; the same lookup is reused by the runtime API.
- **Engine key:** 3-letter uppercase code as listed in § 6.2. New convention introduced by this feature; document inline.

## 9. Sanity Checks

Before committing a derived JSON, the script (or the developer) should verify these against intuition. If any fails noticeably, debug before shipping. A model that says Haas has the best chassis loses credibility instantly.

| Check | Expected                                                            |
| ----- | ------------------------------------------------------------------- |
| 1     | Red Bull chassis is in the top 3 of chassis deltas                  |
| 2     | McLaren chassis is in the top 3                                     |
| 3     | Sauber chassis is the worst or second-worst                         |
| 4     | Verstappen driver delta is the most negative (fastest)              |
| 5     | Honda RBPT (HRC) engine is near the top of engine deltas            |
| 6     | Mercedes (MER) engine is near the top                               |
| 7     | No coefficient has magnitude > 0.6s in either direction             |
| 8     | All driver `sessions` counts are ≤ 24 (= 2024 race count)           |
| 9     | `sum(chassis_delta over each engine group)` ≈ 0 for HRC, MER, FER   |
| 10    | `sector_proportions` sum to within 0.001 of 1.0                     |

The script should print these on completion. A clean-run summary printed to stdout is useful both for developer sanity and for committing a record of "what the numbers looked like the day we derived them."

## 10. The Derivation Script

### 10.1 Location and pattern

```
backend/app/scripts/derive_playground_coefficients.py
```

This sits alongside the existing `scrape.py` script and follows its conventions:
- CLI entry point at the bottom (`if __name__ == "__main__":`).
- argparse-based flags.
- Reuses FastF1 cache wiring from `backend/app/core/`.
- Writes its output to `backend/app/analysis_results/`.
- Is offline tooling; the FastAPI app does not import from it.

### 10.2 CLI

```bash
cd backend/app/scripts
python derive_playground_coefficients.py --year 2024
python derive_playground_coefficients.py --year 2024 --force   # overwrite existing JSON
python derive_playground_coefficients.py --year 2024 --dry-run # compute and print but do not write
```

`--year` is required. v1 only meaningfully supports 2024 but the year is parameterised so 2025 derivation is a one-line change at run time.

Add a corresponding entry to the `CLAUDE.md` "Dev commands" section:

```bash
# coefficient derivation for the playground (offline; commits the JSON)
python derive_playground_coefficients.py --year 2024
```

### 10.3 Internal structure

Roughly:

```
load_qualifying_sessions(year)            # returns DataFrame of (driver, team, race, segment, time, weather)
filter_clean(df)                          # wet/dryness, DNS/DNF, outliers
compute_teammate_observations(df)         # pairs → list of (driver_A, driver_B, gap)
solve_driver_deltas(observations)         # lstsq → dict[driver_code, delta_seconds]
compute_team_car_pace(df, driver_deltas)  # dict[team_name, car_pace_seconds]
isolate_chassis_engine(car_pace)          # dict[team, chassis], dict[engine_code, engine]
compute_baseline_and_sectors(year)        # baseline_seconds, sector_proportions
assemble_coefficients(...)                # dict matching § 8 schema
run_sanity_checks(coefficients)           # prints results; raises on hard failures (e.g. sum mismatch)
write_output(coefficients, force, dry_run)
```

Each function should be independently testable. Intermediate DataFrames are not persisted; only the final JSON is.

## 11. Runtime API

The runtime is intentionally trivial. No FastF1 calls, no database queries beyond active-driver lookup, no recomputation.

### 11.1 Endpoint

```
GET /api/playground/lap?driver={code}&chassis={team_slug}&engine={engine_code}
```

Mounted alongside the existing routes (`api/season.py`, `api/routes/drivers.py`). Follow the same registration pattern in `main.py`.

**Query parameters:**
- `driver`: 3-letter driver code, must exist in the loaded coefficient bundle.
- `chassis`: team slug, must exist in `chassis` dict of the bundle.
- `engine`: 3-letter engine code, must exist in `engines` dict.

**Validation:** if any identifier is missing from the loaded bundle, return `400` with a JSON body naming the unknown identifier. Do not silently substitute defaults.

**Response:**

```ts
{
  "total_time_seconds": 89.847,
  "sectors": [27.418, 31.420, 31.009],   // length 3, sum ≈ total within rounding
  "components": {
    "baseline_seconds": 90.300,
    "driver":  { "code": "LEC", "delta": -0.22, "sessions": 24 },
    "chassis": { "key": "red_bull", "display_name": "Red Bull", "delta": -0.18 },
    "engine":  { "code": "MER", "manufacturer": "Mercedes", "delta": -0.05 }
  },
  "comparisons": {
    "baseline_delta": -0.453,             // total - baseline (seconds)
    "vs_real_pole_2024": +0.668           // total - actual_2024_bahrain_pole_seconds
  },
  "methodology_version": "1.0"
}
```

`vs_real_pole_2024` requires storing the actual 2024 Bahrain pole time. Add it to the coefficient JSON metadata for convenience:

```ts
metadata: {
  // ...
  "reference_pole_time_seconds": 89.179   // 2024 Bahrain pole (Verstappen, 1:29.179)
}
```

Confirm exact value from FastF1 when implementing; the literal above is illustrative.

### 11.2 Service layer

Follow the existing services pattern (`backend/app/services/wet.py`, `driver_service.py`):

```
backend/app/services/playground_service.py
```

Exposes (informative signatures):

```python
class PlaygroundService:
    @staticmethod
    def load_coefficients(year: int) -> dict: ...
    @staticmethod
    def simulate_lap(driver: str, chassis: str, engine: str, year: int = 2024) -> dict: ...
    @staticmethod
    def list_eligible_choices(year: int = 2024) -> dict: ...  # for the frontend selector
```

`load_coefficients` reads `analysis_results/playground_{year}.json`. Cache via `app.core.cache.CACHE` keyed `playground_{year}`, matching the existing wet-analysis cache convention. The bundle is small and read-only; loaded once per process.

`list_eligible_choices` returns the available drivers, chassis, and engines from the loaded bundle, so the frontend doesn't have to derive the lists by other means. Shape:

```ts
{
  "year": 2024,
  "drivers": [{ "code": "VER", "name": "Max Verstappen", "team_2024": "Red Bull Racing" }, ...],
  "chassis": [{ "key": "red_bull", "display_name": "Red Bull" }, ...],
  "engines": [{ "code": "HRC", "manufacturer": "Honda RBPT" }, ...]
}
```

Expose via a second endpoint:

```
GET /api/playground/choices
```

Cached `playground_choices_{year}`.

### 11.3 Methodology endpoint (optional v1.0, nice-to-have)

If easy: expose the coefficient JSON's `metadata` block + a methodology summary at:

```
GET /api/playground/methodology
```

Returns the methodology version, notes (including the Renault flag), derivation date, and a short human-readable description of the model. The frontend's "how this was calculated" affordance reads from this rather than hardcoding the explanation.

If this is more work than v1 warrants, omit; the frontend can hardcode the explanation as a stopgap.

## 12. Codebase Integration Notes

This section is the cross-reference into the existing project so Claude Code can wire things up without inventing new conventions.

### 12.1 File placement

| New file                                                          | Mirrors / sits alongside                                            |
| ----------------------------------------------------------------- | ------------------------------------------------------------------- |
| `backend/app/scripts/derive_playground_coefficients.py`           | `backend/app/scripts/scrape.py`                                    |
| `backend/app/analysis_results/playground_2024.json`               | `backend/app/analysis_results/{year}.json` (existing wet analysis)  |
| `backend/app/services/playground_service.py`                      | `backend/app/services/wet.py`, `driver_service.py`                  |
| `backend/app/api/routes/playground.py`                            | `backend/app/api/routes/drivers.py`                                 |

Register the new route in `backend/app/main.py` following the existing mount pattern (under `/api`). CORS already allows the dev frontend; no change needed there.

### 12.2 Active-driver convention

Per `CLAUDE.md`:

> `DriverSummary.last_season` is `MAX(season_standings.season)` per driver. The landing page treats a driver as "active" when `last_season === max(last_season across all drivers)`.

The playground respects this convention by deriving its driver list from 2024 quali data and storing those drivers in the coefficient JSON. The frontend will see the playground's eligible drivers via `/api/playground/choices`, which is sourced from the JSON. If the project later re-derives for 2025, the eligible-driver list rolls forward automatically.

### 12.3 Caching

Use `app.core.cache.CACHE` with keys:
- `playground_{year}` for the full coefficient bundle.
- `playground_choices_{year}` for the choices payload.

No per-request caching of simulation results is needed; the computation is microseconds.

### 12.4 Database

No schema changes. The derivation script does not write to the DB. The runtime service does not read from the DB beyond what already exists.

If the team-slug → display-name mapping needs a canonical source, the existing `lib/teamColors.js` on the frontend defines the slugs; the backend should use the same slugs in `chassis` keys. A small `TEAM_SLUG_BY_FASTF1_NAME` dict inside the derivation script handles normalisation. Keep this dict colocated with the script, not in shared core code, because it's a 2024-data-cleaning concern.

### 12.5 Existing types and hooks

Frontend type and hook scaffolding is out of scope for this document. The API response shapes in § 11 are the contract; the frontend team will produce corresponding types in `lib/Types/` and hooks in `lib/Hooks/` following the existing patterns (`useDriverStat`, `useDriverWet`, etc.).

### 12.6 Things this spec does NOT change

- The wet-performance feature, its derivation, or its endpoints.
- The driver detail page or any existing driver routes.
- The database schema or migration system.
- CORS config.
- Any frontend code.

The playground is purely additive.

## 13. Implementation Checklist

For the implementer.

**Derivation:**

- [ ] Write `derive_playground_coefficients.py` in `backend/app/scripts/` matching the structure in § 10.3.
- [ ] Implement teammate-pair observation extraction with segment matching (§ 4.2.3) and filtering (§ 4.2.4).
- [ ] Implement least-squares driver-delta solve with median re-centring (§ 4.2.2).
- [ ] Implement team car pace computation (§ 4.3).
- [ ] Implement chassis/engine isolation including Renault hand-assignment (§ 4.4).
- [ ] Implement baseline and sector proportions extraction (§ 4.1).
- [ ] Implement sanity checks (§ 9), printed to stdout.
- [ ] Write the coefficient JSON to `backend/app/analysis_results/playground_2024.json` matching the schema in § 8.
- [ ] Run the script, eyeball the sanity-check output, commit the JSON.

**Runtime API:**

- [ ] Create `backend/app/services/playground_service.py` with `load_coefficients`, `simulate_lap`, `list_eligible_choices`.
- [ ] Wire `app.core.cache.CACHE` for `playground_{year}` and `playground_choices_{year}`.
- [ ] Create `backend/app/api/routes/playground.py` exposing `GET /api/playground/lap`, `GET /api/playground/choices`, and optionally `GET /api/playground/methodology`.
- [ ] Register the route in `backend/app/main.py` under `/api`.
- [ ] Validate query params; return 400 with named unknown identifiers on mismatch.

**Docs:**

- [ ] Add a "Playground" subsection to `CLAUDE.md` under Architecture and under Notes, mirroring the wet-performance writeup.
- [ ] Add the derivation CLI to the `CLAUDE.md` Dev commands block.

**Verification:**

- [ ] `uvicorn app.main:app --reload` starts cleanly.
- [ ] `curl 'localhost:8000/api/playground/choices'` returns the eligible lists.
- [ ] `curl 'localhost:8000/api/playground/lap?driver=LEC&chassis=red_bull&engine=MER'` returns a plausible lap time around 1:29-1:31.
- [ ] Sanity-check the worked example (§ 3.3) against the live endpoint.
- [ ] Invalid identifiers return 400, not 500.
