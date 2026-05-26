"use client";

import Link from "next/link";
import useDriver from "@/lib/Hooks/useDriver";
import { teamColors } from "@/lib/teamColors";
import DriverDetailsHero from "@/components/driver-details/DriverDetailsHero";
import CareerStats from "@/components/driver-details/CareerStats";
import TeamsTimeline from "@/components/driver-details/TeamsTimeline";
import BioWetPanel from "@/components/driver-details/BioWetPanel";

const DEFAULT_TEAM_COLOR = "#444";

const colorFor = (team: string | null | undefined): string => {
    if (!team) return DEFAULT_TEAM_COLOR;
    return (teamColors as Record<string, string>)[team] ?? DEFAULT_TEAM_COLOR;
};

export default function DriverDetailsView({ code }: { code: string }) {
    const { data: driver, error, isLoading } = useDriver(code);

    if (isLoading) {
        return (
            <div className="dd-page" style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <p style={{letterSpacing: "0.18em", color: "var(--rl-fg-muted)" }}>
                    Loading driver…
                </p>
            </div>
        );
    }

    if (error || !driver) {
        return (
            <div className="dd-page" style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <p style={{ fontFamily: "var(--rl-font-display)", letterSpacing: "0.18em", color: "var(--rl-danger, #f87171)" }}>
                    Driver not found · {code.toUpperCase()}
                </p>
            </div>
        );
    }

    const teamColor = colorFor(driver.current_team);
    const updated = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();

    return (
        <div
            className="dd-page font-orbitron"
            style={{ ["--team-color" as string]: teamColor } as React.CSSProperties}
        >
            <div className="dd-breadcrumb">
                <div className="dd-breadcrumb-trail">
                    <span>Drivers</span>
                    <span>›</span>
                    <b>{driver.full_name}</b>
                    <span>›</span>
                    <span>Career</span>
                </div>
                <Link href="/" style={{ textDecoration: "none" }}>
                    <button className="dd-back">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square">
                            <path d="M14 6 L8 12 L14 18" />
                        </svg>
                        Back to Grid
                    </button>
                </Link>
            </div>

            <DriverDetailsHero driver={driver} />
            <CareerStats driver={driver} teamColor={teamColor} />
            <TeamsTimeline driver={driver} />
            <BioWetPanel driver={driver} />

            <div className="dd-foot">
                <span>RaceLine · {driver.driver_code} · {driver.current_team ?? "—"}</span>
                <span>Updated {updated} · Source: FastF1 / Ergast</span>
            </div>
        </div>
    );
}
