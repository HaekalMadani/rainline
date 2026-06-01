"use client";

import { Selections, SimulationResult } from "@/lib/Types/playgroundType";
import { formatDelta, formatLapTime } from "./format";

// One resolved run, enough to label the build and diff it against another.
export interface CompareRun {
    selections: Selections;
    result: SimulationResult;
}

function buildLabel(result: SimulationResult): string {
    const c = result.components;
    const chassis = c.chassis.display_name ?? c.chassis.key;
    const engine = c.engine.manufacturer ?? c.engine.code;
    return `${c.driver.code} · ${chassis} · ${engine}`;
}

function sameBuild(a: Selections, b: Selections): boolean {
    return a.driver === b.driver && a.chassis === b.chassis && a.engine === b.engine;
}

// Negative = faster than the pin (good, green); positive = slower (red).
// Tolerance avoids coloring sub-millisecond rounding noise.
function deltaClass(v: number): string {
    if (v < -0.0005) return "neg";
    if (v > 0.0005) return "pos";
    return "";
}

export default function Compare({
    pinned,
    current,
    isUserPin,
    onPin,
    onUnpin,
}: {
    pinned: CompareRun;
    current: CompareRun;
    isUserPin: boolean;
    onPin: () => void;
    onUnpin: () => void;
}) {
    const isSame = sameBuild(pinned.selections, current.selections);
    const totalDelta = current.result.total_time_seconds - pinned.result.total_time_seconds;

    return (
        <section className="pg-compare" aria-label="Build comparison">
            <div className="pg-compare__head">
                <span className="pg-compare__tag">Compare</span>
                <div className="pg-compare__actions">
                    {!isSame && (
                        <button type="button" className="pg-compare__btn" onClick={onPin}>
                            Pin this run
                        </button>
                    )}
                    {isUserPin && (
                        <button type="button" className="pg-compare__btn" onClick={onUnpin}>
                            Unpin
                        </button>
                    )}
                </div>
            </div>

            {isSame ? (
                <p className="pg-compare__hint">
                    Run another build to compare it against your pin.
                </p>
            ) : (
                <>
                    <div className="pg-compare__row">
                        <span className="pg-compare__role">Pinned</span>
                        <span className="pg-compare__build">{buildLabel(pinned.result)}</span>
                        <span className="pg-compare__lap tnum">
                            {formatLapTime(pinned.result.total_time_seconds)}
                        </span>
                    </div>
                    <div className="pg-compare__row">
                        <span className="pg-compare__role">Current</span>
                        <span className="pg-compare__build">{buildLabel(current.result)}</span>
                        <span className="pg-compare__lap tnum">
                            {formatLapTime(current.result.total_time_seconds)}
                        </span>
                    </div>
                    <div className="pg-compare__delta">
                        <span className="pg-compare__role">Δ</span>
                        <span className={`pg-compare__total tnum ${deltaClass(totalDelta)}`}>
                            {formatDelta(totalDelta)}
                        </span>
                        <span className="pg-compare__sectors">
                            {[0, 1, 2].map((i) => {
                                const d =
                                    current.result.sectors[i] - pinned.result.sectors[i];
                                return (
                                    <span
                                        key={i}
                                        className={`pg-compare__sec tnum ${deltaClass(d)}`}
                                    >
                                        <small>S{i + 1}</small> {formatDelta(d)}
                                    </span>
                                );
                            })}
                        </span>
                    </div>
                </>
            )}
        </section>
    );
}
