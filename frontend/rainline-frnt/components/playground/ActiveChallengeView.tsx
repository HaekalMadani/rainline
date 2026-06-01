"use client";

import { ReactNode } from "react";
import { Challenge, ChoicesPayload, RunColors, Selections, SimulationResult } from "@/lib/Types/playgroundType";
import SetupSlots from "./SetupSlots";
import Breakdown from "./Breakdown";
import Methodology from "./Methodology";
import Verdict from "./Verdict";
import RunBar from "./RunBar";

export default function ActiveChallengeView({
    challenge,
    choices,
    selections,
    onChangeSlot,
    onBack,
    result,
    showResults,
    simError,
    teamColor,
    onSimulate,
    simulateLabel,
    simulateDisabled,
    running,
    stale,
    currentColors,
    showResetBests,
    onResetBests,
    compareSlot,
}: {
    challenge: Challenge;
    choices: ChoicesPayload;
    selections: Selections;
    onChangeSlot: (slot: keyof Selections, value: string) => void;
    onBack: () => void;
    result: SimulationResult | undefined;
    showResults: boolean;
    simError: Error | undefined;
    teamColor: string;
    onSimulate: () => void;
    simulateLabel: string;
    simulateDisabled: boolean;
    running: boolean;
    stale: boolean;
    currentColors?: RunColors;
    showResetBests: boolean;
    onResetBests: () => void;
    compareSlot?: ReactNode;
}) {
    return (
        <>
            <button type="button" className="pg-back-tag" onClick={onBack}>
                ← All challenges
            </button>

            <div className="pg-chall-head">
                <h2>{challenge.name}</h2>
                <p>{challenge.description}</p>
            </div>

            <SetupSlots
                choices={choices}
                selections={selections}
                locked={challenge.locked}
                onChange={onChangeSlot}
                teamColor={teamColor}
            />

            <RunBar
                label={simulateLabel}
                disabled={simulateDisabled}
                running={running}
                stale={stale}
                showReset={showResetBests}
                onSimulate={onSimulate}
                onReset={onResetBests}
            />

            {simError && (
                <div className="pg-error">
                    Could not calculate. Run again to retry.
                </div>
            )}

            {showResults && result && (
                <>
                    <Verdict result={result} challenge={challenge} />
                    <Breakdown result={result} colors={currentColors} />
                    {compareSlot}
                    <Methodology />
                </>
            )}
        </>
    );
}
