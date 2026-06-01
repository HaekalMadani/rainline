"use client";

export default function RunBar({
    label,
    disabled,
    running,
    stale,
    showReset,
    onSimulate,
    onReset,
}: {
    label: string;
    disabled: boolean;
    running: boolean;
    stale: boolean;
    showReset: boolean;
    onSimulate: () => void;
    onReset: () => void;
}) {
    return (
        <div className="pg-runbar">
            <button
                type="button"
                className="pg-simulate"
                onClick={onSimulate}
                disabled={disabled}
            >
                {running ? "···" : label}
            </button>
            {stale && (
                <span className="pg-stale">Selections changed. Run again to see the new lap.</span>
            )}
            {showReset && (
                <button type="button" className="pg-reset" onClick={onReset}>
                    Reset bests
                </button>
            )}
        </div>
    );
}
