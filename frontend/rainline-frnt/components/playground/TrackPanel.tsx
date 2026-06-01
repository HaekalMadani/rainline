"use client";

import { useCallback, useRef, useState } from "react";
import { NEUTRAL_RUN_COLORS, RunColors, SimulationResult } from "@/lib/Types/playgroundType";
import CircuitMap, { PURPLE } from "./CircuitMap";
import { formatLapTime, formatSector } from "./format";

// One frozen "run" the panel renders. Decoupled from the page's live state so
// the panel can keep showing the previous result while the user fiddles with
// the next set of selections.
export interface TrackRun {
    sectors: [number, number, number];
    total: number;
    colors: RunColors;
    // The first run after a reset. Its purple sweep is a baseline, not a record.
    isBaseline: boolean;
}

export function trackRunFromResult(
    result: SimulationResult,
    colors: RunColors,
    isBaseline: boolean,
): TrackRun {
    const [s1, s2, s3] = result.sectors;
    return {
        sectors: [s1, s2, s3],
        total: result.total_time_seconds,
        colors,
        isBaseline,
    };
}

export default function TrackPanel({
    run,
    runId,
    markerColor,
    onAnimationComplete,
}: {
    run: TrackRun | null;
    runId: number;
    // Marker + "live sector" legend color. Tracks the SIMULATED chassis if
    // there's a run, else the live chassis. The panel's top-border and the
    // circuit label color come from --team-color (set on the page wrapper),
    // which tracks LIVE editing instead — so the chrome moves with the user's
    // current pick while the marker stays on the last-simulated team.
    markerColor: string;
    onAnimationComplete?: () => void;
}) {
    const [revealed, setRevealed] = useState(0);
    const [active, setActive] = useState(-1);
    const [done, setDone] = useState(false);
    // CircuitMap drops its current-run "finish now" handler here so Skip can call it.
    const skipRef = useRef<(() => void) | null>(null);

    const handleProgress = useCallback((rev: number, act: number) => {
        setRevealed(rev);
        setActive(act);
    }, []);
    const handleComplete = useCallback(() => {
        setRevealed(3);
        setActive(-1);
        setDone(true);
        onAnimationComplete?.();
    }, [onAnimationComplete]);

    // Each Simulate click bumps runId. Reset the panel chrome to "no sectors
    // resolved yet" at the start of every run. CircuitMap remounts on the
    // same key, so its internal state resets in lockstep.
    useResetOnRunIdChange(runId, () => {
        setRevealed(0);
        setActive(-1);
        setDone(false);
    });

    const colors = run?.colors ?? NEUTRAL_RUN_COLORS;
    const totalIsBest = run?.colors.total === "purple";
    const isBaseline = !!run && run.isBaseline;
    const showBaseline = isBaseline && done;
    const lapLabel = run
        ? done
            ? isBaseline
                ? "Baseline lap"
                : "Lap time"
            : "Running"
        : "Lap time";
    const lapValue = run && done ? formatLapTime(run.total) : "0:00.000";

    return (
        <aside className="pg-track">
            <div className="pg-track__head">
                <div>
                    <div className="pg-track__circuit-label">Bahrain Int&apos;l Circuit</div>
                    <div className="pg-track__circuit-sub">5.412 km · 15 turns · 3 sectors</div>
                </div>
                <div className="pg-laptime">
                    <div className="pg-laptime__label">{lapLabel}</div>
                    <div
                        className={`pg-laptime__value tnum ${
                            run && done ? (totalIsBest ? "best" : "") : "idle"
                        }`}
                    >
                        {lapValue}
                    </div>
                    {run && !done && (
                        <button
                            type="button"
                            className="pg-skip"
                            onClick={() => skipRef.current?.()}
                        >
                            Skip ▸
                        </button>
                    )}
                </div>
            </div>

            <div className="pg-map">
                <CircuitMap
                    key={runId}
                    sectors={run?.sectors}
                    teamColor={markerColor}
                    currentColors={colors}
                    onProgress={handleProgress}
                    onComplete={handleComplete}
                    skipRef={skipRef}
                />
            </div>

            <div className="pg-sectors">
                {[0, 1, 2].map((i) => {
                    const isDone = !!run && revealed > i;
                    const isActive = active === i;
                    const isBest = isDone && colors.sectors[i] === "purple";
                    const cls = isBest ? "best" : isActive ? "active" : "";
                    return (
                        <div key={i} className={`pg-sector ${cls}`}>
                            <div className="pg-sector__label">S{i + 1}</div>
                            <div className="pg-sector__time tnum">
                                {isDone && run ? formatSector(run.sectors[i]) : "—"}
                            </div>
                        </div>
                    );
                })}
            </div>

            {!run && (
                <div className="pg-idle-prompt">Build a car · press simulate</div>
            )}

            {showBaseline && (
                <p className="pg-baseline-note">
                    Baseline set. Swap a part and run again; sectors turn purple only where
                    you beat it.
                </p>
            )}

            <div className="pg-legend">
                <span>
                    <span className="key" style={{ background: PURPLE }} />{" "}
                    {showBaseline ? "Baseline" : "Session best"}
                </span>
                <span>
                    <span className="key" style={{ background: "#e4e8f0" }} /> Resolved
                </span>
                <span>
                    <span className="key" style={{ background: markerColor }} /> Live sector
                </span>
            </div>
        </aside>
    );
}

// Run the callback whenever runId changes (compared to the previous render).
// React's "derive state from prop change" pattern with useState as a sentinel.
function useResetOnRunIdChange(runId: number, fn: () => void) {
    const [prev, setPrev] = useState(runId);
    if (prev !== runId) {
        setPrev(runId);
        fn();
    }
}
