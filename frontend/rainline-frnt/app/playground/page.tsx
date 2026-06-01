"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import usePlaygroundChoices from "@/lib/Hooks/usePlaygroundChoices";
import usePlaygroundSimulation from "@/lib/Hooks/usePlaygroundSimulation";
import usePlaygroundChallenges from "@/lib/Hooks/usePlaygroundChallenges";
import {
    ALL_PURPLE_RUN_COLORS,
    Challenge,
    ChoicesPayload,
    NEUTRAL_RUN_COLORS,
    RunColors,
    SectorColor,
    Selections,
    SimulationResult,
} from "@/lib/Types/playgroundType";
import ModeSwitcher, { PlaygroundMode } from "@/components/playground/ModeSwitcher";
import SetupSlots from "@/components/playground/SetupSlots";
import ChallengeList from "@/components/playground/ChallengeList";
import ActiveChallengeView from "@/components/playground/ActiveChallengeView";
import TrackPanel, { trackRunFromResult, TrackRun } from "@/components/playground/TrackPanel";
import Breakdown from "@/components/playground/Breakdown";
import Compare, { CompareRun } from "@/components/playground/Compare";
import Methodology from "@/components/playground/Methodology";
import RunBar from "@/components/playground/RunBar";
import RealPairingBadge from "@/components/playground/RealPairingBadge";
import { chassisToTeamColor, isRealPairing } from "@/lib/playgroundTeams";

const EMPTY_SELECTIONS: Selections = { driver: "", chassis: "", engine: "" };

// Global default combo (§4.3): a real, well-known 2024 pairing. Resolved against
// the actual choices payload so it stays valid even if an identifier changes.
const DEFAULT_DRIVER = "VER";
const DEFAULT_CHASSIS = "redbull";
const DEFAULT_ENGINE = "HRC";

function resolve(value: string, valid: string[], fallback: string): string {
    if (valid.includes(value)) return value;
    return valid.includes(fallback) ? fallback : (valid[0] ?? "");
}

function selectionsEqual(a: Selections | null, b: Selections | null): boolean {
    if (!a || !b) return false;
    return a.driver === b.driver && a.chassis === b.chassis && a.engine === b.engine;
}

// Compute the starting selections (§4.3). For a challenge that locks the driver,
// open chassis/engine default to that driver's *real* 2024 team pairing
// (mirrors the real baseline before the user starts mixing).
function computeDefaults(
    choices: ChoicesPayload | undefined,
    challenge?: Challenge | null,
): Selections {
    if (!choices) return EMPTY_SELECTIONS;

    const driverCodes = choices.drivers.map((d) => d.code);
    const chassisKeys = choices.chassis.map((c) => c.key);
    const engineCodes = choices.engines.map((e) => e.code);

    const driver = resolve(DEFAULT_DRIVER, driverCodes, driverCodes[0] ?? "");
    let chassis = resolve(DEFAULT_CHASSIS, chassisKeys, chassisKeys[0] ?? "");
    let engine = resolve(DEFAULT_ENGINE, engineCodes, engineCodes[0] ?? "");

    if (challenge?.locked.driver) {
        const lockedDriver = choices.drivers.find((d) => d.code === challenge.locked.driver);
        const realChassis = lockedDriver?.team_2024
            ? choices.chassis.find((c) => c.display_name === lockedDriver.team_2024)
            : undefined;
        if (realChassis) {
            chassis = realChassis.key;
            if (realChassis.engine && engineCodes.includes(realChassis.engine)) {
                engine = realChassis.engine;
            }
        }
    }

    return { driver, chassis, engine };
}

export default function PlaygroundPage() {
    const { data: choices, isLoading: choicesLoading, error: choicesError } =
        usePlaygroundChoices();

    const [mode, setMode] = useState<PlaygroundMode>("free-play");
    const [activeChallengeId, setActiveChallengeId] = useState<string | null>(null);
    // null = "use the contextual defaults"; picking a slot pins a concrete object.
    const [userSelections, setUserSelections] = useState<Selections | null>(null);

    // The Simulate button locks the live selections in here; the sim hook fetches
    // only when this is set, and the TrackPanel animates this selection's result.
    const [simulated, setSimulated] = useState<Selections | null>(null);
    // Bumped on every Simulate click so the TrackPanel/CircuitMap restart even
    // if selections match a cached SWR entry.
    const [runId, setRunId] = useState(0);
    const [animationDone, setAnimationDone] = useState(false);

    // F1-style purple-sector state: track session bests and the *current run's*
    // colors. First run after a reset is all-purple (a "this is your baseline"
    // sweep). `evaluatedRunId` keeps us from re-folding the same run into bests.
    const [sessionBests, setSessionBests] = useState<{
        sectors: [number, number, number];
        total: number;
    } | null>(null);
    const [currentColors, setCurrentColors] = useState<RunColors>(NEUTRAL_RUN_COLORS);
    // True while the *displayed* run is the first one after a reset — the
    // "baseline sweep". Lets the panel label the all-purple run as a baseline
    // rather than a session best (there's nothing to beat yet).
    const [currentIsBaseline, setCurrentIsBaseline] = useState(false);
    const [evaluatedRunId, setEvaluatedRunId] = useState<number>(-1);

    // Build-vs-build compare (session-only). `baselineRun` is the first run after
    // a reset and the default reference; `pinnedRun` is the active reference,
    // which the user can override via "Pin this run" and revert via "Unpin".
    const [baselineRun, setBaselineRun] = useState<CompareRun | null>(null);
    const [pinnedRun, setPinnedRun] = useState<CompareRun | null>(null);

    const { data: challenges } = usePlaygroundChallenges(mode === "challenge");

    // Drop challenges whose locked ids aren't in the current choices (§12).
    const validChallenges = useMemo<Challenge[]>(() => {
        if (!challenges || !choices) return [];
        const driverCodes = new Set(choices.drivers.map((d) => d.code));
        const chassisKeys = new Set(choices.chassis.map((c) => c.key));
        const engineCodes = new Set(choices.engines.map((e) => e.code));
        return challenges.filter((c) => {
            const ok =
                (!c.locked.driver || driverCodes.has(c.locked.driver)) &&
                (!c.locked.chassis || chassisKeys.has(c.locked.chassis)) &&
                (!c.locked.engine || engineCodes.has(c.locked.engine));
            if (!ok) console.warn(`Challenge "${c.id}" references an unknown locked id; hidden.`);
            return ok;
        });
    }, [challenges, choices]);

    const activeChallenge = useMemo(
        () => validChallenges.find((c) => c.id === activeChallengeId) ?? null,
        [validChallenges, activeChallengeId],
    );

    const baseSelections = useMemo<Selections>(
        () => userSelections ?? computeDefaults(choices, activeChallenge),
        [userSelections, choices, activeChallenge],
    );

    const effective = useMemo<Selections>(
        () => ({
            driver: activeChallenge?.locked.driver ?? baseSelections.driver,
            chassis: activeChallenge?.locked.chassis ?? baseSelections.chassis,
            engine: activeChallenge?.locked.engine ?? baseSelections.engine,
        }),
        [activeChallenge, baseSelections],
    );

    const awaitingChallenge = mode === "challenge" && !activeChallenge;
    const ready = Boolean(effective.driver && effective.chassis && effective.engine);

    // The sim hook fetches only when `simulated` is set — i.e. after a Simulate click.
    const { data: result, error: simError } = usePlaygroundSimulation(
        simulated && !awaitingChallenge ? simulated : null,
    );

    // Stale = the user has edited slots since the last Simulate click. We keep
    // showing the previous run, but flag the gap so they know to re-run.
    const stale = simulated !== null && !selectionsEqual(simulated, effective);

    // SWR's keepPreviousData means `result` lingers from the previous run while
    // a new fetch is in flight. Only treat the result as fresh when it matches
    // the selections that were simulated — otherwise the panel would animate
    // with stale sector times and have to restart when the real result arrives.
    const resultFresh =
        simulated !== null &&
        result !== undefined &&
        result.components.driver.code === simulated.driver &&
        result.components.chassis.key === simulated.chassis &&
        result.components.engine.code === simulated.engine;

    // Evaluate purple-sector verdicts during render (React's "derive state from
    // prop change" pattern). Gated on `resultFresh` so we never fold a STALE
    // result into the new run's bests. The runId guard keeps us from
    // re-evaluating once we've folded this run in.
    if (resultFresh && result && simulated && evaluatedRunId !== runId) {
        const { colors, nextBests, isBaseline } = evaluateRun(result, sessionBests);
        setEvaluatedRunId(runId);
        setCurrentColors(colors);
        setCurrentIsBaseline(isBaseline);
        setSessionBests(nextBests);
        // The first run after a reset becomes the baseline and the default pin.
        if (isBaseline) {
            const baseRecord: CompareRun = { selections: simulated, result };
            setBaselineRun(baseRecord);
            setPinnedRun((prev) => prev ?? baseRecord);
        }
    }

    // What the TrackPanel renders. Decoupled from `result` so the previous
    // animation can finish without flicker while the next SWR request is in
    // flight, and so we can hide the panel cleanly when there's no run yet.
    const trackRun: TrackRun | null =
        resultFresh && result
            ? trackRunFromResult(result, currentColors, currentIsBaseline)
            : null;
    const showResults = trackRun !== null && animationDone;

    const liveTeamColor = chassisToTeamColor(effective.chassis);
    const simulatedTeamColor = chassisToTeamColor(simulated?.chassis ?? effective.chassis);

    // Real-pairing badge: did the user happen to land on an actual 2024 trio?
    const isReal = useMemo(() => {
        if (!choices) return false;
        const driver = choices.drivers.find((d) => d.code === effective.driver);
        const chassis = choices.chassis.find((c) => c.key === effective.chassis);
        if (!driver || !chassis) return false;
        return isRealPairing(driver.team_2024, chassis.key, chassis.engine, effective.engine);
    }, [choices, effective]);

    function resetSessionBests() {
        setSessionBests(null);
        setCurrentColors(NEUTRAL_RUN_COLORS);
        setCurrentIsBaseline(false);
        setEvaluatedRunId(-1);
        setBaselineRun(null);
        setPinnedRun(null);
    }

    function handlePinCurrent() {
        if (resultFresh && result && simulated) {
            setPinnedRun({ selections: simulated, result });
        }
    }

    function handleUnpin() {
        setPinnedRun(baselineRun);
    }

    function handleModeChange(next: PlaygroundMode) {
        setMode(next);
        setActiveChallengeId(null);
        setUserSelections(null);
        setSimulated(null);
        setAnimationDone(false);
        resetSessionBests();
    }

    function handleSelectChallenge(id: string) {
        setActiveChallengeId(id);
        setUserSelections(null);
        setSimulated(null);
        setAnimationDone(false);
        resetSessionBests();
    }

    function handleSlotChange(slot: keyof Selections, value: string) {
        setUserSelections({ ...baseSelections, [slot]: value });
    }

    function handleSimulate() {
        if (!ready || awaitingChallenge) return;
        setSimulated({ ...effective });
        setAnimationDone(false);
        setRunId((n) => n + 1);
    }

    function handleBackFromChallenge() {
        setActiveChallengeId(null);
        setSimulated(null);
        setAnimationDone(false);
        resetSessionBests();
    }

    const simulateLabel = stale || simulated === null ? "Simulate" : "Run again";
    const running = simulated !== null && resultFresh && !animationDone;
    const showResetBests = sessionBests !== null;

    // The pin is user-set (vs the auto baseline) when it diverges from the baseline run.
    const isUserPin =
        pinnedRun !== null &&
        baselineRun !== null &&
        !selectionsEqual(pinnedRun.selections, baselineRun.selections);

    const compareBlock =
        showResults && result && simulated && pinnedRun ? (
            <Compare
                pinned={pinnedRun}
                current={{ selections: simulated, result }}
                isUserPin={isUserPin}
                onPin={handlePinCurrent}
                onUnpin={handleUnpin}
            />
        ) : null;

    return (
        <div
            className="pg-page"
            style={{ "--team-color": liveTeamColor } as React.CSSProperties}
        >
            <div className="dd-breadcrumb">
                <div className="dd-breadcrumb-trail">
                    <span>Garage</span>
                    <span>›</span>
                    <b>Playground</b>
                </div>
                <Link href="/" className="dd-back">
                    ← Back to grid
                </Link>
            </div>

            <section className="pg-hero">
                <div className="pg-eyebrow">
                    <span className="dot" aria-hidden /> Fantasy Garage · Counterfactual 2024
                </div>
                <h1 className="pg-title">The Playground</h1>
                <p className="pg-lede">
                    Build a car that never raced. Pick a driver, a chassis, and an engine,
                    then send it round Bahrain. Every combination is scored against real 2024
                    qualifying pace, sector by sector.
                </p>
                <ModeSwitcher mode={mode} onChange={handleModeChange} />
            </section>

            <main className="pg-main">
                <div className="pg-grid">
                    <section className="pg-build" aria-label="Build">
                        {choicesError && (
                            <div className="pg-error">
                                Could not load the playground. Refresh to try again.
                            </div>
                        )}

                        {!choicesError && (choicesLoading || !choices) && (
                            <div className="pg-idle-prompt" style={{ textAlign: "left" }}>
                                Loading…
                            </div>
                        )}

                        {choices && mode === "free-play" && (
                            <>
                                <span className="pg-section-tag">The Build</span>
                                <SetupSlots
                                    choices={choices}
                                    selections={baseSelections}
                                    onChange={handleSlotChange}
                                    teamColor={liveTeamColor}
                                />
                                {isReal && <RealPairingBadge />}
                                <RunBar
                                    label={simulateLabel}
                                    disabled={!ready}
                                    running={running}
                                    stale={stale}
                                    showReset={showResetBests}
                                    onSimulate={handleSimulate}
                                    onReset={resetSessionBests}
                                />
                                {simError && (
                                    <div className="pg-error">
                                        Could not calculate. Run again to retry.
                                    </div>
                                )}
                                {showResults && result && (
                                    <>
                                        <Breakdown result={result} colors={currentColors} />
                                        {compareBlock}
                                        <Methodology />
                                    </>
                                )}
                            </>
                        )}

                        {choices && mode === "challenge" && !activeChallenge && (
                            <>
                                <span className="pg-section-tag">Challenges</span>
                                <ChallengeList
                                    challenges={validChallenges}
                                    choices={choices}
                                    onSelect={handleSelectChallenge}
                                />
                            </>
                        )}

                        {choices && mode === "challenge" && activeChallenge && (
                            <ActiveChallengeView
                                challenge={activeChallenge}
                                choices={choices}
                                selections={baseSelections}
                                onChangeSlot={handleSlotChange}
                                onBack={handleBackFromChallenge}
                                result={result}
                                showResults={showResults}
                                simError={simError}
                                teamColor={liveTeamColor}
                                onSimulate={handleSimulate}
                                simulateLabel={simulateLabel}
                                simulateDisabled={!ready}
                                running={running}
                                stale={stale}
                                currentColors={currentColors}
                                showResetBests={showResetBests}
                                onResetBests={resetSessionBests}
                                compareSlot={compareBlock}
                            />
                        )}
                    </section>

                    <TrackPanel
                        run={awaitingChallenge ? null : trackRun}
                        runId={runId}
                        markerColor={simulatedTeamColor}
                        onAnimationComplete={() => setAnimationDone(true)}
                    />
                </div>
            </main>
        </div>
    );
}

// Compare a new result against the running session bests; return THIS run's
// colors plus the bests to remember. First run after a reset is all-purple
// (a baseline sweep). Subsequent runs: each sector is purple iff it ties or
// beats the running best.
function evaluateRun(
    result: SimulationResult,
    prev: { sectors: [number, number, number]; total: number } | null,
): {
    colors: RunColors;
    nextBests: { sectors: [number, number, number]; total: number };
    isBaseline: boolean;
} {
    const s = result.sectors;
    const t = result.total_time_seconds;
    if (!prev) {
        return {
            colors: ALL_PURPLE_RUN_COLORS,
            nextBests: { sectors: [s[0], s[1], s[2]], total: t },
            isBaseline: true,
        };
    }
    const sectorColors: SectorColor[] = [0, 1, 2].map((i) =>
        s[i] <= prev.sectors[i] ? "purple" : "neutral",
    );
    const totalColor: SectorColor = t <= prev.total ? "purple" : "neutral";
    return {
        colors: { sectors: sectorColors, total: totalColor },
        isBaseline: false,
        nextBests: {
            sectors: [
                Math.min(prev.sectors[0], s[0]),
                Math.min(prev.sectors[1], s[1]),
                Math.min(prev.sectors[2], s[2]),
            ],
            total: Math.min(prev.total, t),
        },
    };
}
