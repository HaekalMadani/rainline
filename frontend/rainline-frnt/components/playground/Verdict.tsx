"use client";

import { Challenge, SimulationResult } from "@/lib/Types/playgroundType";
import { formatDelta, formatLapTime } from "./format";

function evaluatePass(total: number, challenge: Challenge): boolean {
    if (challenge.pass_criterion === "match") {
        const tol = challenge.match_tolerance_seconds ?? 0.1;
        return Math.abs(total - challenge.target_lap_time_seconds) <= tol;
    }
    return total < challenge.target_lap_time_seconds;
}

export default function Verdict({
    result,
    challenge,
}: {
    result: SimulationResult;
    challenge: Challenge;
}) {
    const total = result.total_time_seconds;
    const passed = evaluatePass(total, challenge);
    const gap = total - challenge.target_lap_time_seconds;

    const tail =
        challenge.pass_criterion === "beat"
            ? "· beat it"
            : `· match within ${challenge.match_tolerance_seconds ?? 0.1}s`;

    return (
        <div className={`pg-verdict ${passed ? "pass" : "fail"}`}>
            <div className="target">
                Target{" "}
                <b className="tnum">{formatLapTime(challenge.target_lap_time_seconds)}</b> {tail}
            </div>
            <div className="result" aria-live="polite">
                {passed ? "Pass" : "Not yet"}
                <span className="gap tnum">{formatDelta(gap)} vs target</span>
            </div>
        </div>
    );
}
