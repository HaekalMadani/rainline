"use client";

import { useEffect, useRef, useState } from "react";
import usePlaygroundCircuit from "@/lib/Hooks/usePlaygroundCircuit";
import { NEUTRAL_RUN_COLORS, RunColors, SectorColor } from "@/lib/Types/playgroundType";

// Total wall-clock length of the animation. The three sectors share this in proportion
// to the simulated sector times, so the marker hits each boundary at the right *ratio*
// of the run (compressed from the real ~90s lap).
const PLAYBACK_MS = 7000;

export const PURPLE = "#A855F7";
const IDLE_STROKE = "#34343c";
const RESOLVED_STROKE = "#e4e8f0";

function strokeForResolved(color: SectorColor): string {
    return color === "purple" ? PURPLE : RESOLVED_STROKE;
}

function segmentPath(pts: { x: number; y: number }[], from: number, to: number): string {
    if (to <= from) return "";
    let d = `M${pts[from].x},${pts[from].y}`;
    for (let i = from + 1; i <= to; i++) d += ` L${pts[i].x},${pts[i].y}`;
    return d;
}

export default function CircuitMap({
    sectors,
    teamColor,
    currentColors,
    onComplete,
    onProgress,
    skipRef,
}: {
    sectors?: number[];
    teamColor: string;
    currentColors?: RunColors;
    onComplete?: () => void;
    onProgress?: (revealed: number, active: number) => void;
    // Parent-held handle to jump the running animation straight to its end.
    // CircuitMap assigns the current run's "finish now" into it.
    skipRef?: React.MutableRefObject<(() => void) | null>;
}) {
    const { data: geo, isLoading, error } = usePlaygroundCircuit();
    const markerRef = useRef<SVGCircleElement | null>(null);
    const rafRef = useRef<number | null>(null);
    const toRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const phaseRef = useRef(-1);

    const onCompleteRef = useRef(onComplete);
    const onProgressRef = useRef(onProgress);
    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);
    useEffect(() => {
        onProgressRef.current = onProgress;
    }, [onProgress]);

    const [revealed, setRevealed] = useState(0);
    const [active, setActive] = useState(-1);

    const colors = currentColors ?? NEUTRAL_RUN_COLORS;

    useEffect(() => {
        if (!geo || !sectors) return;
        phaseRef.current = -1;
        // Reset at the top of a new animation. The parent remounts via key=runId
        // most of the time, but a sectors-only change should also re-cue.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRevealed(0);
        setActive(-1);

        const pts = geo.points;
        const n = pts.length;
        const [b1, b2] = geo.sector_boundaries;
        const i1 = Math.round(b1 * (n - 1));
        const i2 = Math.round(b2 * (n - 1));
        const i3 = n - 1;

        const total = sectors[0] + sectors[1] + sectors[2];
        const t1 = (sectors[0] / total) * PLAYBACK_MS;
        const t2 = (sectors[1] / total) * PLAYBACK_MS;
        const t3 = (sectors[2] / total) * PLAYBACK_MS;

        const place = (idxFloat: number) => {
            const i = Math.floor(idxFloat);
            const f = idxFloat - i;
            const next = Math.min(i + 1, n - 1);
            const x = pts[i].x + (pts[next].x - pts[i].x) * f;
            const y = pts[i].y + (pts[next].y - pts[i].y) * f;
            if (markerRef.current) {
                markerRef.current.setAttribute("cx", String(x));
                markerRef.current.setAttribute("cy", String(y));
            }
        };
        const lerp = (a: number, b: number, p: number) =>
            a + (b - a) * Math.min(Math.max(p, 0), 1);

        place(0);
        onProgressRef.current?.(0, -1);

        const startTime = performance.now();
        let finished = false;

        const clearPending = () => {
            if (rafRef.current !== null) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
            if (toRef.current !== null) {
                clearTimeout(toRef.current);
                toRef.current = null;
            }
        };

        const tick = () => {
            // Whichever scheduler fired, cancel the sibling so chains don't multiply.
            clearPending();
            if (finished) return;
            const e = performance.now() - startTime;
            let idx: number;
            let phase: number;
            if (e < t1) {
                idx = lerp(0, i1, e / t1);
                phase = 0;
            } else if (e < t1 + t2) {
                idx = lerp(i1, i2, (e - t1) / t2);
                phase = 1;
            } else if (e < t1 + t2 + t3) {
                idx = lerp(i2, i3, (e - t1 - t2) / t3);
                phase = 2;
            } else {
                idx = i3;
                phase = 3;
            }

            place(idx);

            if (phase !== phaseRef.current) {
                phaseRef.current = phase;
                setRevealed(phase);
                setActive(phase < 3 ? phase : -1);
                onProgressRef.current?.(phase, phase < 3 ? phase : -1);
            }

            if (phase === 3) {
                finished = true;
                onCompleteRef.current?.();
                return;
            }
            // Dual-schedule: rAF for smoothness when visible, setTimeout as a fallback
            // that keeps progressing if rAF is throttled in a hidden/background tab.
            rafRef.current = requestAnimationFrame(tick);
            toRef.current = setTimeout(tick, 100);
        };

        // Snap straight to the finished state. Used by the safety net and by the
        // user-facing Skip control (via skipRef).
        const finishNow = () => {
            if (finished) return;
            clearPending();
            finished = true;
            place(i3);
            phaseRef.current = 3;
            setRevealed(3);
            setActive(-1);
            onProgressRef.current?.(3, -1);
            onCompleteRef.current?.();
        };

        tick();
        if (skipRef) skipRef.current = finishNow;

        // Hard safety net: if neither scheduler reaches the finish in time (deep
        // background throttling), snap to the final state so results still appear.
        const safety = setTimeout(finishNow, PLAYBACK_MS + 800);

        return () => {
            finished = true;
            clearPending();
            clearTimeout(safety);
            if (skipRef) skipRef.current = null;
        };
    }, [geo, sectors, skipRef]);

    if (error) {
        return <div className="pg-error">Could not load the circuit map.</div>;
    }
    if (isLoading || !geo) {
        return (
            <div
                className="pg-map"
                aria-label="Loading circuit"
                style={{ minHeight: 280, background: "rgba(255,255,255,0.04)" }}
            />
        );
    }

    const n = geo.points.length;
    const [b1, b2] = geo.sector_boundaries;
    const i1 = Math.round(b1 * (n - 1));
    const i2 = Math.round(b2 * (n - 1));
    const i3 = n - 1;

    const tickAt = (frac: number) => geo.points[Math.round(frac * (n - 1))];
    const t1Pt = tickAt(b1);
    const t2Pt = tickAt(b2);

    const seg0 = segmentPath(geo.points, 0, i1);
    const seg1 = segmentPath(geo.points, i1, i2);
    const seg2 =
        segmentPath(geo.points, i2, i3) +
        ` L${geo.points[0].x},${geo.points[0].y}`;

    const segColor = (i: number) => {
        if (revealed > i) return strokeForResolved(colors.sectors[i] ?? "neutral");
        if (active === i) return teamColor;
        return IDLE_STROKE;
    };

    return (
        <svg
            viewBox={`0 0 ${geo.viewBox.width} ${geo.viewBox.height}`}
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label="Bahrain circuit map"
        >
            {/* dim baseline loop, always visible behind the dynamic segments */}
            <path
                d={
                    seg0 +
                    " " +
                    segmentPath(geo.points, i1, i3) +
                    ` L${geo.points[0].x},${geo.points[0].y}`
                }
                fill="none"
                stroke={IDLE_STROKE}
                strokeWidth={7}
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity={0.5}
            />
            {[seg0, seg1, seg2].map((d, i) => (
                <path
                    key={i}
                    d={d}
                    fill="none"
                    stroke={segColor(i)}
                    strokeWidth={7.5}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    style={{ transition: "stroke 250ms ease" }}
                />
            ))}
            {[t1Pt, t2Pt].map((p, i) => (
                <g key={i}>
                    <circle
                        cx={p.x}
                        cy={p.y}
                        r={6}
                        fill="#1E1E21"
                        stroke="#e4e8f0"
                        strokeWidth={3}
                    />
                    <text
                        x={p.x}
                        y={p.y - 16}
                        textAnchor="middle"
                        fill="#cbd0da"
                        style={{
                            font: "700 17px var(--rl-font-display, Orbitron, sans-serif)",
                            letterSpacing: "0.12em",
                        }}
                    >
                        {i === 0 ? "S1·S2" : "S2·S3"}
                    </text>
                </g>
            ))}
            <circle
                cx={geo.start_finish.x}
                cy={geo.start_finish.y}
                r={7}
                fill="#e4e8f0"
            />
            <text
                x={geo.start_finish.x + 14}
                y={geo.start_finish.y + 5}
                textAnchor="start"
                fill="#cbd0da"
                style={{
                    font: "700 17px var(--rl-font-display, Orbitron, sans-serif)",
                    letterSpacing: "0.16em",
                }}
            >
                START
            </text>
            <circle
                ref={markerRef}
                cx={geo.start_finish.x}
                cy={geo.start_finish.y}
                r={12}
                fill={teamColor}
                stroke="#fff"
                strokeWidth={3}
                style={sectors ? { filter: `drop-shadow(0 0 6px ${teamColor})` } : undefined}
            />
        </svg>
    );
}
