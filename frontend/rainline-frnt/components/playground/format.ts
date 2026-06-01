// Functional formatting helpers for the Playground prototype.

export function formatLapTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds - mins * 60;
    return `${mins}:${secs.toFixed(3).padStart(6, "0")}`;
}

export function formatSector(seconds: number): string {
    return seconds.toFixed(3);
}

export function formatDelta(seconds: number): string {
    const sign = seconds >= 0 ? "+" : "-";
    return `${sign}${Math.abs(seconds).toFixed(3)}s`;
}
