"use client";

import { RunColors, SimulationResult } from "@/lib/Types/playgroundType";
import { formatDelta } from "./format";

function deltaClass(v: number): string {
    return v < 0 ? "neg" : v > 0 ? "pos" : "";
}

export default function Breakdown({
    result,
    colors,
}: {
    result: SimulationResult;
    colors?: RunColors;
}) {
    const { components, comparisons, total_time_seconds } = result;
    const totalIsBest = colors?.total === "purple";
    const pole = comparisons.vs_real_pole_2024;

    return (
        <div className="pg-breakdown">
            <div className="pg-brow muted">
                <span className="lab">Baseline · median 2024 car</span>
                <span className="val tnum">{components.baseline_seconds.toFixed(3)}s</span>
            </div>
            <div className="pg-brow">
                <span className="lab">
                    Driver <small>· {components.driver.code}</small>
                </span>
                <span className={`val tnum ${deltaClass(components.driver.delta)}`}>
                    {formatDelta(components.driver.delta)}
                </span>
            </div>
            <div className="pg-brow">
                <span className="lab">
                    Chassis <small>· {components.chassis.display_name ?? components.chassis.key}</small>
                </span>
                <span className={`val tnum ${deltaClass(components.chassis.delta)}`}>
                    {formatDelta(components.chassis.delta)}
                </span>
            </div>
            <div className="pg-brow">
                <span className="lab">
                    Engine <small>· {components.engine.manufacturer ?? components.engine.code}</small>
                </span>
                <span className={`val tnum ${deltaClass(components.engine.delta)}`}>
                    {formatDelta(components.engine.delta)}
                </span>
            </div>
            <div className={`pg-brow total ${totalIsBest ? "best" : ""}`}>
                <span className="lab">Total lap</span>
                <span className="val tnum">{total_time_seconds.toFixed(3)}s</span>
            </div>
            <div className="pg-brow muted">
                <span className="lab">vs 2024 Bahrain pole</span>
                <span className="val tnum">
                    {pole != null ? formatDelta(pole) : "—"}
                </span>
            </div>
        </div>
    );
}
