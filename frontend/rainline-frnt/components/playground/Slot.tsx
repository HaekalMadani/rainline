"use client";

import Image from "next/image";
import Dropdown, { DropdownItem } from "./Dropdown";

export default function Slot({
    label,
    items,
    value,
    locked,
    lockedLabel,
    lockedLogo,
    onChange,
    teamColor,
}: {
    label: string;
    items: DropdownItem[];
    value: string;
    locked?: boolean;
    lockedLabel?: string;
    lockedLogo?: string | null;
    onChange: (value: string) => void;
    teamColor?: string;
}) {
    const accent = teamColor ?? undefined;
    const style = accent ? ({ "--slot-accent": accent } as React.CSSProperties) : undefined;

    return (
        <div className={`pg-slot ${locked ? "locked" : ""}`} style={style}>
            <div className="pg-slot__head">
                <span className="pg-slot__label">{label}</span>
            </div>
            {locked ? (
                <div className="pg-slot__control">
                    {lockedLogo ? (
                        <Image
                            src={lockedLogo}
                            alt=""
                            width={30}
                            height={30}
                            className="pg-slot__logo"
                            unoptimized
                        />
                    ) : null}
                    <span className="pg-slot__value">{lockedLabel}</span>
                    <span className="pg-locktag">Locked</span>
                </div>
            ) : (
                <Dropdown items={items} value={value} onChange={onChange} ariaLabel={label} />
            )}
        </div>
    );
}
