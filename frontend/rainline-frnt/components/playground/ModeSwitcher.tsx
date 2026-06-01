"use client";

export type PlaygroundMode = "free-play" | "challenge";

const MODES: { id: PlaygroundMode; label: string }[] = [
    { id: "free-play", label: "Free Play" },
    { id: "challenge", label: "Challenge" },
];

export default function ModeSwitcher({
    mode,
    onChange,
}: {
    mode: PlaygroundMode;
    onChange: (mode: PlaygroundMode) => void;
}) {
    return (
        <div className="pg-modes" role="group" aria-label="Playground mode">
            {MODES.map((m) => (
                <button
                    key={m.id}
                    type="button"
                    className="pg-mode"
                    aria-pressed={mode === m.id}
                    onClick={() => onChange(m.id)}
                >
                    {m.label}
                </button>
            ))}
        </div>
    );
}
