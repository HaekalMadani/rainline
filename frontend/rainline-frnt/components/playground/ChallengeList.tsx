"use client";

import { Challenge, ChoicesPayload } from "@/lib/Types/playgroundType";
import { formatLapTime } from "./format";

function describeLocks(challenge: Challenge, choices: ChoicesPayload): string {
    const parts: string[] = [];
    if (challenge.locked.driver) {
        parts.push(`Driver ${challenge.locked.driver}`);
    }
    if (challenge.locked.chassis) {
        const c = choices.chassis.find((x) => x.key === challenge.locked.chassis);
        parts.push(`Chassis ${c?.display_name ?? challenge.locked.chassis}`);
    }
    if (challenge.locked.engine) {
        const e = choices.engines.find((x) => x.code === challenge.locked.engine);
        parts.push(`Engine ${e?.manufacturer ?? challenge.locked.engine}`);
    }
    return parts.length ? `Locked · ${parts.join(" / ")}` : "Nothing locked";
}

export default function ChallengeList({
    challenges,
    choices,
    onSelect,
}: {
    challenges: Challenge[];
    choices: ChoicesPayload;
    onSelect: (id: string) => void;
}) {
    if (challenges.length === 0) {
        return (
            <div className="pg-idle-prompt" style={{ textAlign: "left", color: "var(--rl-fg-muted)" }}>
                No challenges available.
            </div>
        );
    }

    return (
        <div className="pg-challist">
            {challenges.map((c) => (
                <button
                    key={c.id}
                    type="button"
                    className="pg-chall"
                    onClick={() => onSelect(c.id)}
                >
                    <span className="pg-chall__name">{c.name}</span>
                    <span className="pg-chall__desc">{c.description}</span>
                    <span className="pg-chall__meta">
                        <span>{describeLocks(c, choices)}</span>
                        <span>Target {formatLapTime(c.target_lap_time_seconds)}</span>
                    </span>
                </button>
            ))}
        </div>
    );
}
