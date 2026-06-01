"use client";

import { useState } from "react";
import usePlaygroundMethodology from "@/lib/Hooks/usePlaygroundMethodology";

export default function Methodology() {
    const [open, setOpen] = useState(false);
    const { data } = usePlaygroundMethodology(open);

    return (
        <details
            className="pg-method"
            onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
        >
            <summary>
                <span className="pg-method__gist">
                    A plausibility estimate from real 2024 qualifying pace, not a prediction.
                </span>
                <span className="pg-method__toggle">How is this calculated?</span>
            </summary>
            <p>
                {data?.description ??
                    "A fan-built plausibility estimate. Lap time is a baseline (median 2024 Bahrain Q3 time) plus additive driver, chassis, and engine deltas derived from real 2024 qualifying data."}
            </p>
            <p>
                The math is additive: <code>baseline + driver + chassis + engine = total</code>.
                Sanity check: pick a real 2024 trio (Leclerc · Ferrari · Ferrari) and the result
                lands near that team&apos;s actual Bahrain pace.
            </p>
            <p>
                On the purple sectors: change one slot and all three sectors move the same way
                (the math is additive). Change two at once to make the purples trade between
                sectors.
            </p>
            {data?.notes && <p className="pg-method-meta">{data.notes}</p>}
            {data?.methodology_version && (
                <p className="pg-method-meta">Methodology version {data.methodology_version}</p>
            )}
        </details>
    );
}
