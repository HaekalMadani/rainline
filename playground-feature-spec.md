# Playground: Feature Design Spec

Status: Pre-implementation spec for the playground feature, prototype scope.

**Scope of this document:** what the playground *does* and *how it is structured* (routes, components, state, data flow, modes, behavior, contracts). **Out of scope:** visual design. Layout, typography, colors, motion, copy polish, and Impeccable-driven aesthetic decisions are all deferred to a later design pass.

**Math / derivation:** see the math spec file. This doc treats the math as a black box behind the API. Any apparent contradiction between this doc and the actual backend implementation should be resolved in favor of the backend; the math spec's exact endpoints and response shapes have been edited during implementation and this doc avoids re-pinning them.

## 1. What the Playground Is

A page where a user assembles a counterfactual F1 car (driver, chassis, engine) and gets back an estimated fastest lap time at Bahrain, plus a sector breakdown and the per-component contributions that produced the estimate.

Two modes:

- **Free-play.** All three slots are user-editable. Pick anyone, mix any combination. This is the "what if Leclerc had the Red Bull" mode.
- **Challenge.** A specific challenge fixes some slots and asks the user to optimise the remaining ones against a target lap time. The challenge defines the constraint; the user finds the best configuration within it.

Single track in v1 (Bahrain). 2024 grid only. Math is deterministic; same inputs always produce the same output.

The feature is a fan-built plausibility calculator, not a simulator. This framing should be visible in the methodology affordance but does not otherwise dictate copy in this prototype.

## 2. Non-Goals (Prototype)

These are out of scope for the working prototype. None of them should be partially scaffolded.

- Visual design, layout, animation, custom components beyond functional minimums.
- Polished copy. Functional placeholder strings are fine; copy pass is later.
- Multiple tracks.
- Setup tuning (downforce, brake bias, tire compound).
- Historical seasons / legacy drivers.
- User accounts, persistence between sessions, saved combinations, sharing.
- Leaderboards.
- A challenge admin surface. Challenges are defined in code/config and shipped with the build.
- Analytics or telemetry on user behavior.
- Mobile-specific behavior beyond "it should not crash on a narrow viewport."

## 3. The Page

### 3.1 Route

```
/playground
```

Mounted as a new top-level route in `app/playground/page.tsx`, following the existing pattern of `app/season/page.tsx`. No subroutes for the prototype; mode and active challenge live in component state, not in the URL.

(URL-driven mode state is a reasonable v1.1 addition for shareability. Skip for prototype.)

### 3.2 Discoverability

The page needs to be reachable from somewhere visible. For the prototype, add a link in whatever navigation surface currently exists (per `CLAUDE.md`, the driver grid is the canonical landing page; there's no persistent sidebar by design). A minimal text link on the landing page is sufficient. The actual navigation treatment is a design concern and gets resolved in the design pass.

### 3.3 Top-level structure

A single page component owns the playground. Conceptually it has three regions:

1. **Mode switcher.** A two-state control: free-play / challenge.
2. **Setup region.** The three slot pickers (driver, chassis, engine). In challenge mode, locked slots are disabled and show the challenge's fixed value.
3. **Results region.** Lap time, sector times, deltas, comparisons. In challenge mode, also shows the target time and pass/fail indication.

All three regions live on the same page in the prototype. No modals, no separate routes.

## 4. The Core Loop

### 4.1 Free-play

1. User lands on `/playground`.
2. Page mounts in free-play mode by default.
3. Three slots are pre-populated with a default combination (see § 4.3).
4. The page immediately fetches the simulation for the default combination and renders results.
5. User changes any slot via its picker.
6. The simulation re-runs automatically on every change and the results update.
7. User can change slots indefinitely.

The auto-run choice (rather than an explicit submit button) is deliberate for the prototype: it removes a UI element, gives instant feedback, and matches the playful "fiddle and see" energy of the feature. The auto-run can be replaced with explicit submission in a later UX pass if the "moment of reveal" turns out to matter.

### 4.2 Challenge

1. User switches to challenge mode via the mode switcher.
2. Page renders the challenge selection (a list of available challenges, or a single featured challenge if only one exists).
3. User picks a challenge.
4. Page enters challenge view:
   - Locked slots are populated with the challenge's fixed values and disabled.
   - Unlocked slots fall back to a sensible default (see § 4.3).
   - Target lap time is displayed.
5. Simulation runs automatically (same as free-play) on every editable-slot change.
6. Results show the lap time, the target, and a clear indicator of whether the user beat the target.
7. User can change unlocked slots to chase the target.
8. User can return to challenge selection and pick a different challenge, or switch back to free-play.

No persistence of attempts in the prototype; the page is stateless across reloads.

### 4.3 Defaults

The default combination shown when the page first loads (free-play) and when entering a challenge before user interaction (challenge mode's unlocked slots) should be a real, well-known 2024 combination. Suggested:

- Driver: VER (Verstappen)
- Chassis: Red Bull (matching driver)
- Engine: Honda RBPT (matching chassis)

This default has two benefits. First, the user sees a real combination on first paint, which makes the page feel grounded. Second, it provides an implicit sanity check (the result should be close to Red Bull's actual 2024 Bahrain pole pace), which is itself an Easter egg of the feature.

For challenge mode, if a challenge locks the driver but leaves chassis and engine open, the defaults for the open slots should be that driver's *real* 2024 team's chassis and engine. This mirrors the real-world baseline before the user starts mixing.

## 5. Mode Switcher

A two-state control. Functionally:

- `free-play` (default on mount)
- `challenge`

Switching modes resets the page to that mode's initial state:

- Free-play → challenge: drops current free-play selections, shows challenge selection.
- Challenge → free-play: drops the active challenge, restores free-play defaults.

No confirmation prompt. The feature is exploratory; nothing is being lost.

Implementation is a local `useState` in the page component. URL state is not used in the prototype.

## 6. Setup Slots

Three independent slots. Each is a single-select picker over the eligible options provided by the backend.

### 6.1 Eligible options

The list of eligible drivers, chassis, and engines comes from the backend's "choices" endpoint (see the math spec for the exact route and shape; functionally, it returns three lists). The frontend never hardcodes the eligible options. This ensures that re-deriving the coefficients for a later season (2025) and shipping new JSON automatically updates the playground without code changes.

Each option has at minimum:

- A stable identifier (driver code, chassis key, engine code).
- A display name (e.g., "Max Verstappen", "Red Bull", "Honda RBPT").

The picker uses the identifier as the value and the display name for whatever label-equivalent the picker will eventually have (label treatment is a visual concern; for the prototype, plain text is fine).

### 6.2 Picker behavior

Each picker:

- Shows the currently selected option.
- Allows the user to change the selection to any other eligible option.
- Triggers a simulation re-run on change (see § 4.1).
- In challenge mode, if the slot is locked, the picker is disabled and shows the challenge's fixed value as static text.

The actual picker control type (dropdown, list, grid, scrollable strip) is a visual decision. For the prototype, a native `<select>` is acceptable. Replace later.

### 6.3 No real-world constraints

There is no validation against "real" pairings. A user can pick Mercedes chassis + Ferrari engine, which has never existed in F1. The math handles any combination; the UI should not prevent any combination.

## 7. Results Region

Functionally the results region must display:

- **Total lap time.** The primary output. Formatted as `M:SS.fff` (e.g., `1:29.847`).
- **Three sector times.** Each formatted as `SS.fff`. Sum approximately equals the total (within rounding).
- **Per-component deltas.** Driver, chassis, engine deltas in seconds with sign (e.g., `-0.22s`). These should sum (with the baseline) to the total. This is the "show your work" data.
- **Baseline lap time.** What the median 2024 car at Bahrain would lap. Shown for context so the user sees what's being deviated from.
- **Comparison to 2024 Bahrain pole.** A delta in seconds, signed.
- **In challenge mode only:** the target time and a pass/fail indicator.

The exact field names returned by the backend may differ from what's described here; the frontend should map whatever the backend returns into this conceptual layout. See the math spec for the canonical response shape.

### 7.1 Methodology affordance

A way for the user to see how the numbers were calculated. For the prototype, this can be a simple disclosure (collapsed by default) containing one or two paragraphs explaining the model:

- Deltas are derived from 2024 qualifying data.
- The math is additive: baseline + driver + chassis + engine = total.
- The model has known limitations (driver / car fit, single-track derivation, etc.).
- Where to find more (link to math spec? a static methodology page? for the prototype, inline text is fine).

The disclosure can be a `<details>` element for the prototype. Visual treatment is a design concern.

If the backend exposes a methodology endpoint (see math spec), prefer fetching the methodology text from it rather than hardcoding on the frontend. This keeps backend and frontend in sync if the methodology version bumps.

### 7.2 Loading and error states

- **Loading.** A loading indicator while the simulation is in flight. For the prototype, any minimal indicator (text "Calculating…" or a spinner) is fine. SWR's `isLoading` covers this.
- **Error.** If the simulation fetch fails, show an inline error message and offer a retry. Treat 4xx (bad inputs) and 5xx (server) the same in the prototype: "Could not calculate. Try again."
- **Empty state.** Should not occur in normal use because the page auto-fetches on mount with default selections. If it does (e.g., the choices endpoint hasn't loaded yet), show a brief loading state, not an empty results region.

## 8. Challenge Mode

### 8.1 Challenge shape

A challenge is a small data object:

```ts
type Challenge = {
  id: string                    // stable slug, used in keys
  name: string                  // display name
  description: string           // 1-3 sentences explaining the challenge
  locked: {
    driver?:  string            // driver code if locked
    chassis?: string            // chassis key if locked
    engine?:  string            // engine code if locked
  }
  target_lap_time_seconds: number
  pass_criterion: "beat" | "match"   // "beat" = strictly less than; "match" = within a tolerance
  match_tolerance_seconds?: number   // required if pass_criterion is "match"
}
```

A challenge can lock zero, one, two, or all three slots. Locking all three is a "what was the lap time" trivia challenge; the prototype should not include any of these (they're uninteresting). v1 challenges lock one or two slots.

### 8.2 Where challenges live

**Backend.** Challenges are defined in a JSON file or a constant module on the backend, parallel to where the playground coefficients live. Exact location can match whatever pattern the math spec implementation settled on (e.g., `backend/app/analysis_results/playground_challenges.json` or similar). A new GET endpoint returns the list.

The frontend fetches the challenge list at runtime, the same way it fetches choices. The frontend never hardcodes challenges.

Putting challenges on the backend (rather than hardcoded on the frontend) is the right call even though the prototype data is static: it keeps the deployment surface unified, makes future challenge additions a content-only change, and matches the existing pattern of "analysis JSON in `analysis_results/`."

### 8.3 v1 challenge set

Ship two challenges in the prototype. Both should have personality consistent with the fan-project framing. Suggested:

**Challenge 1: "The Alonso Question"**
- Locked: driver = ALO
- Description (placeholder, refine in copy pass): "Fernando Alonso is locked in. Build him the car he deserves and see how fast he can go."
- Target: A time that's faster than Aston Martin's actual 2024 Bahrain pole position time (so the user has to give him a meaningfully better chassis or engine to pass).
- Pass criterion: `beat`.

**Challenge 2: "Anyone But Verstappen"**
- Locked: chassis = red_bull, engine = HRC
- Description (placeholder): "The Red Bull is sitting in the garage. Pick any driver except Verstappen. Can you match his real 2024 Bahrain pace?"
- Target: Verstappen's actual 2024 Bahrain pole time (or close to it).
- Pass criterion: `match` with a tolerance of `0.150` seconds (driver delta differences within the field are small enough that this is meaningful).
- The locked combination still allows VER to be selected, which would trivially pass; the *description* says "except Verstappen" but the constraint is not enforced. This is intentional: the player can cheat and feel briefly clever, then go do it properly. (If this feels too cute, enforce it via a list of `disallowed_drivers` field on the challenge type and update accordingly.)

These specific challenges are suggestions. The shapes and copy will get refined; the structural decisions (lock zero-to-two slots, target time, pass criterion) are the durable parts.

### 8.4 Pass / fail logic

After a simulation result returns in challenge mode:

```
if challenge.pass_criterion == "beat":
    passed = total_time_seconds < target_lap_time_seconds

if challenge.pass_criterion == "match":
    passed = abs(total_time_seconds - target_lap_time_seconds) <= match_tolerance_seconds
```

Display `passed` as a clear indicator alongside the result. Treatment of "clear" is visual; functionally, a boolean state on the result component is enough.

No celebratory animation, no confetti, no toast for the prototype. The prototype just shows the boolean outcome and the gap.

### 8.5 Switching between challenges

The user should be able to leave a challenge and pick another without leaving challenge mode. The challenge list is always reachable while in challenge mode (e.g., a "back to challenges" affordance from the challenge view).

In the prototype, this can be as simple as a button that resets the active challenge to `null` and re-shows the list.

## 9. Frontend Architecture

### 9.1 Page structure

One page component, three feature areas:

```
app/playground/page.tsx
  ├─ ModeSwitcher
  ├─ FreePlayView    (rendered when mode === "free-play")
  │   ├─ SetupSlots
  │   └─ Results
  └─ ChallengeView   (rendered when mode === "challenge")
      ├─ ChallengeList            (rendered when no active challenge)
      └─ ActiveChallengeView      (rendered when a challenge is selected)
          ├─ ChallengeHeader
          ├─ SetupSlots           (some slots locked)
          └─ Results              (with target + pass indicator)
```

`SetupSlots` and `Results` are shared between free-play and challenge views. The differences (locked slots, target display, pass indicator) are passed via props. Same components, different configurations.

These are the *functional* components. Whether `SetupSlots` is one component or three (one per slot) is an implementation detail. Whether `Results` internally has subcomponents for sectors and deltas is an implementation detail. Keep the components small and composable; resist building one giant component.

Component file locations follow the existing convention from `CLAUDE.md`:

```
frontend/rainline-frnt/components/playground/
  ModeSwitcher.tsx
  SetupSlots.tsx
  Results.tsx
  ChallengeList.tsx
  ActiveChallengeView.tsx
  // possibly more as needed
```

Matches the `components/driver-details/` pattern referenced in `CLAUDE.md`.

### 9.2 State

All state is local to the page component or pushed down to children via props. No global state, no context for the prototype.

State owned by `playground/page.tsx`:

- `mode: "free-play" | "challenge"`
- `activeChallengeId: string | null` (only relevant in challenge mode)
- `selections: { driver: string, chassis: string, engine: string }`

Derived from data fetches:

- The list of eligible choices.
- The list of challenges.
- The active challenge (looked up by id from the challenge list).
- The current simulation result.

Locked slot resolution: when in challenge mode with an active challenge, the *effective* selections are computed as:

```
effective_selections = {
  driver:  challenge.locked.driver  ?? selections.driver,
  chassis: challenge.locked.chassis ?? selections.chassis,
  engine:  challenge.locked.engine  ?? selections.engine,
}
```

The simulation uses `effective_selections`. The user's free choices (`selections`) only apply to slots the challenge has not locked.

### 9.3 Data fetching

Use SWR, matching the existing hook pattern from `lib/Hooks/` (per `CLAUDE.md`, this is the established convention with hooks like `useDriverStat`, `useDriver`, `useDriverWet`, `useDriverTable`).

New hooks:

```
lib/Hooks/
  usePlaygroundChoices.tsx     // GET /api/playground/choices, fetched once on mount
  usePlaygroundSimulation.tsx  // GET /api/playground/lap, keyed by effective_selections
  usePlaygroundChallenges.tsx  // GET /api/playground/challenges, fetched once when challenge mode opens
```

Hook signatures (informative, exact shapes follow the math spec / backend implementation):

```ts
function usePlaygroundChoices(): {
  data: ChoicesPayload | undefined
  isLoading: boolean
  error: Error | undefined
}

function usePlaygroundSimulation(selections: Selections | null): {
  data: SimulationResult | undefined
  isLoading: boolean
  error: Error | undefined
}

function usePlaygroundChallenges(): {
  data: Challenge[] | undefined
  isLoading: boolean
  error: Error | undefined
}
```

`usePlaygroundSimulation` accepts `null` to mean "don't fetch yet" (passes `null` as the SWR key). Used before the choices have loaded so initial selections aren't yet known.

SWR's keying handles caching naturally: switching back to a previously-simulated combination is instant (no refetch).

### 9.4 Types

New file:

```
lib/Types/playgroundType.ts
```

Mirrors the existing convention (per `CLAUDE.md`, `lib/Types/driverType.ts` holds `DriverCareerType` etc.). Defines:

- `Selections`
- `ChoicesPayload` (drivers, chassis, engines arrays)
- `SimulationResult` (total, sectors, deltas, baseline, comparison)
- `Challenge`

Exact field names follow the backend implementation. See the math spec / actual backend code for ground truth.

## 10. API Contracts

The frontend needs three things from the backend:

1. **The list of eligible choices** (drivers, chassis, engines for the current grid).
2. **A simulation result** for a given (driver, chassis, engine) triple.
3. **The list of challenges.**

Endpoints (1) and (2) are defined in the math spec. Endpoint (3) is new in this feature spec and is described below. The frontend should call whatever paths the actual backend exposes; if they differ from the math spec, the math spec implementation is the source of truth.

### 10.1 Challenges endpoint

```
GET /api/playground/challenges
```

Returns the list of available challenges. Static for the prototype (read from a JSON file or constant on the backend). The frontend fetches once when entering challenge mode and caches via SWR.

Response shape (informative; the backend implementation can use snake_case or camelCase as it sees fit, and the frontend normalises):

```json
[
  {
    "id": "alonso-question",
    "name": "The Alonso Question",
    "description": "Fernando Alonso is locked in. Build him the car he deserves.",
    "locked": { "driver": "ALO" },
    "target_lap_time_seconds": 89.500,
    "pass_criterion": "beat"
  },
  {
    "id": "anyone-but-verstappen",
    "name": "Anyone But Verstappen",
    "description": "The Red Bull is in the garage. Pick any driver except Verstappen.",
    "locked": { "chassis": "red_bull", "engine": "HRC" },
    "target_lap_time_seconds": 89.179,
    "pass_criterion": "match",
    "match_tolerance_seconds": 0.150
  }
]
```

Target times in the JSON should be real reference times (e.g., 2024 Bahrain pole at 1:29.179 → 89.179) or computed from the coefficient bundle. Hardcoded literals are fine for the prototype.

### 10.2 Existing endpoints (reference)

The choices and simulation endpoints exist per the math spec. The frontend consumes them via the hooks above. If the math spec's documented paths and response shapes diverge from what was actually built, defer to what was built.

## 11. Behavior Details

### 11.1 First-paint sequence

1. Page mounts in free-play mode.
2. `usePlaygroundChoices` fires immediately.
3. While choices are loading, the page shows a loading state for the whole setup region (the slot pickers can't render without their option lists). Results region also loading.
4. Choices arrive. `selections` initialises to the default combination (§ 4.3) using the actual identifiers from the choices payload (so the defaults are robust if a code changes).
5. `usePlaygroundSimulation` fires with the default selections.
6. Simulation arrives. Results region renders.

### 11.2 Mode switch sequence

When the user switches mode:

- Free-play → challenge:
  - `activeChallengeId` is null.
  - `usePlaygroundChallenges` fires (if not already cached).
  - The challenge list renders.
  - The setup region and results region are hidden until a challenge is selected.

- Challenge → free-play:
  - `activeChallengeId` is cleared.
  - `selections` resets to defaults (or persists last free-play state, designer's choice; for the prototype, reset to defaults is simpler).
  - The simulation refetches if the selections changed.

### 11.3 Challenge activation sequence

User clicks a challenge in the list:

1. `activeChallengeId` is set to the challenge id.
2. `selections` resets to defaults; effective selections fold in the challenge's locked values.
3. The page renders the active challenge view.
4. Simulation fires with the effective selections.

### 11.4 Reset behavior

There is no explicit reset button in the prototype. State is reset by:

- Switching modes (resets selections in the new mode).
- Switching to a different challenge (resets selections, applies new challenge's locks).
- Reloading the page (everything goes back to first-paint defaults).

A reset button can be added later if user testing shows it's wanted. For the prototype, the implicit resets cover it.

### 11.5 Same-input simulation

If the user changes a slot and then changes it back, SWR returns the cached result without refetching. This is the desired behavior; nothing extra to implement.

### 11.6 Real-world combination Easter egg

When the user picks a combination that matches a real 2024 team's pairing (e.g., LEC + Ferrari chassis + Ferrari engine), the simulation returns approximately that team's actual 2024 Bahrain pace. This emerges naturally from the math; no special-case code is needed.

It is worth noting this in the methodology disclosure as a built-in sanity check the user can verify themselves. Treat it as a feature, not a coincidence.

## 12. Edge Cases

| Case                                                | Handling                                                                                                            |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Choices endpoint slow                               | Setup region in loading state. Defaults applied once choices resolve.                                               |
| Choices endpoint fails                              | Whole page in error state. Offer retry. Without choices, the page can't function.                                   |
| Simulation endpoint slow                            | Results region in loading state. Setup region remains interactive (don't block changes).                            |
| Simulation endpoint fails for a valid combo         | Results region in error state. Setup region remains interactive. Implicit retry: change any slot to refire.         |
| User selects an option that no longer exists        | Shouldn't happen in normal use (options come from the same backend). If it does, validate before fetch.             |
| User picks a real 2024 combination                  | Works normally. See § 11.6.                                                                                         |
| User picks a fully impossible combination           | All combinations are valid by design. There is no "impossible" combination in v1.                                   |
| Challenge with a locked driver who's no longer in the choices list | Filter out such challenges client-side before display. Log to console for the developer to update the challenge.    |
| Two challenges with the same id                     | Treat as bad data. Display whichever the backend returns first; do not crash.                                       |
| Pass criterion is "match" but `match_tolerance_seconds` missing | Treat as bad data. Default to a 0.1s tolerance and log a warning. Do not crash.                                 |
| User reloads in the middle of a challenge           | Returns to first-paint defaults (free-play mode). No persistence in the prototype.                                  |

## 13. Codebase Integration

### 13.1 File locations

| New file                                                                | Pattern source                                            |
| ----------------------------------------------------------------------- | --------------------------------------------------------- |
| `frontend/rainline-frnt/app/playground/page.tsx`                        | `app/season/page.tsx`                                     |
| `frontend/rainline-frnt/components/playground/*.tsx`                    | `components/driver-details/`                              |
| `frontend/rainline-frnt/lib/Hooks/usePlaygroundChoices.tsx`             | `lib/Hooks/useDriverStat`, `useDriver`, etc.              |
| `frontend/rainline-frnt/lib/Hooks/usePlaygroundSimulation.tsx`          | same                                                      |
| `frontend/rainline-frnt/lib/Hooks/usePlaygroundChallenges.tsx`          | same                                                      |
| `frontend/rainline-frnt/lib/Types/playgroundType.ts`                    | `lib/Types/driverType.ts`                                 |
| Backend challenge data (location TBD)                                   | analogous to `analysis_results/` pattern                  |
| Backend challenge route                                                 | analogous to existing playground routes (see math spec)   |

All new code follows existing conventions: SWR for data fetching, TypeScript types in `lib/Types/`, hooks in `lib/Hooks/`, page-specific components in `components/playground/`.

### 13.2 What this spec does not change

- The wet-performance feature and its routes / hooks.
- The driver grid, driver detail page, or season leaderboard.
- The database schema.
- CORS configuration.
- The math derivation, coefficient JSON, or simulation endpoint (see math spec; treat as immutable from this spec's perspective).

### 13.3 What this spec adds to the backend

Only one new piece: a challenges endpoint and its underlying data source. Everything else the frontend needs already exists from the math spec implementation.

## 14. Implementation Checklist

**Backend (small surface):**

- [ ] Define the challenge list as JSON or a constant, in a location consistent with the existing playground data files.
- [ ] Expose a `GET /api/playground/challenges` endpoint that returns the list.
- [ ] Wire caching following the existing playground cache pattern.
- [ ] Verify the endpoint returns valid challenge objects per the shape in § 8.1.

**Frontend types and hooks:**

- [ ] Create `lib/Types/playgroundType.ts` with `Selections`, `ChoicesPayload`, `SimulationResult`, `Challenge`.
- [ ] Create `usePlaygroundChoices` hook.
- [ ] Create `usePlaygroundSimulation` hook with conditional fetching (passes `null` as key when selections aren't ready).
- [ ] Create `usePlaygroundChallenges` hook.

**Frontend components (functional, no visual polish):**

- [ ] `app/playground/page.tsx` with mode state, selections state, and the three feature regions wired up.
- [ ] `ModeSwitcher` component.
- [ ] `SetupSlots` component supporting both free-play (all unlocked) and challenge (some locked) configurations.
- [ ] `Results` component supporting both free-play (no target) and challenge (with target + pass indicator) configurations.
- [ ] `ChallengeList` component.
- [ ] `ActiveChallengeView` component.
- [ ] A minimal methodology disclosure (a `<details>` element with placeholder text is acceptable).

**Wiring:**

- [ ] Add a link to `/playground` from the existing landing page (placement temporary; design pass will refine).
- [ ] Verify auto-run behavior: changing any unlocked slot triggers a refetch and results update.
- [ ] Verify mode switching resets state correctly.
- [ ] Verify challenge pass/fail logic matches § 8.4.
- [ ] Verify the real-world Easter egg: picking LEC + Ferrari chassis + Ferrari engine returns a time close to Ferrari's actual 2024 Bahrain pace.

**Manual verification:**

- [ ] Page loads with default combination shown and results populated.
- [ ] All three slots can be changed; results update on each change.
- [ ] Mode switcher toggles between free-play and challenge.
- [ ] Both shipped challenges appear in the challenge list.
- [ ] Locked slots in challenge mode show the fixed value and cannot be changed.
- [ ] Unlocked slots in challenge mode are interactive.
- [ ] Pass indicator changes correctly as the user finds combinations that beat / match the target.
- [ ] Loading and error states render (can be tested by throttling the network).

## 15. After the Prototype

Things to revisit in the design pass and beyond. Not part of this spec; listed only so they aren't lost.

- Visual treatment of the entire page.
- Copy polish across all strings.
- Picker control type (replacing native `<select>`).
- Animations and transitions.
- Mode switcher visual treatment.
- Results region layout, including the sector breakdown and the "show your work" deltas.
- Methodology affordance treatment.
- Pass / fail visual indication.
- URL state for shareability (`/playground?mode=challenge&id=alonso-question&driver=ALO&...`).
- Persistence of last selections across sessions.
- Additional challenges.
- Discovery surface (how users find the playground from elsewhere on the site).
- Mobile layout.
- Accessibility audit (keyboard nav, screen reader labels, focus management on mode switches).
