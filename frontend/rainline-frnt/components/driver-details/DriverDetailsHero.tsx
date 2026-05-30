"use client";

import { useState } from "react";
import Image from "next/image";
import { DriverCareerStatsType } from "@/lib/Types/driverType";
import FlagSwatch from "./FlagSwatch";
import { splitName, deriveCareer } from "./derive";

interface Props {
    driver: DriverCareerStatsType;
}

export default function DriverDetailsHero({ driver }: Props) {
    const { first, last } = splitName(driver.full_name);
    const career = deriveCareer(driver);
    const team = driver.current_team ?? "";
    const status = career.is_active ? "ACTIVE" : "INACTIVE";
    const portraitSlug = driver.full_name.replaceAll(" ", "-");
    const bgSrc = `/drivers/background/${portraitSlug}-bg.webp`;
    const fallbackSrc = `/drivers/alt/${portraitSlug}-alts.webp`;
    const [portraitSrc, setPortraitSrc] = useState(bgSrc);

    return (
        <section className="dd-hero">
            <div className="dd-hero-glow is-left" aria-hidden="true"></div>
            <div className="dd-hero-glow is-right" aria-hidden="true"></div>
            {driver.driver_number != null && (
                <div className="dd-hero-number-bg" aria-hidden="true">
                    {driver.driver_number}
                </div>
            )}
            <div className="dd-hero-vignette" aria-hidden="true"></div>

            <div className="dd-hero-topbar">
                <div className="dd-hero-eyebrow">
                    <span className="dot"></span>
                    <span>Driver Profile</span>
                    <span className="sep">/</span>
                    <span>{driver.driver_code}{team ? ` · ${team}` : ""}</span>
                </div>
                <div className="dd-hero-flag-tag">
                    {driver.country_code && <FlagSwatch code={driver.country_code} />}
                    {driver.country_code && <span>{driver.country_code}</span>}
                    {driver.country_code && <span style={{ color: "rgba(255,255,255,0.3)" }}>·</span>}
                    <span>{status}</span>
                </div>
            </div>

            <div className="dd-hero-portrait" aria-hidden="true">
                <Image
                    key={portraitSrc}
                    src={portraitSrc}
                    alt=""
                    fill
                    priority
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 720px, 1000px"
                    style={{ objectFit: "contain", objectPosition: "bottom" }}
                    onError={() => {
                        if (portraitSrc === bgSrc) setPortraitSrc(fallbackSrc);
                    }}
                />
            </div>

            <div className="dd-hero-bottom-fade" aria-hidden="true"></div>

            <div className="dd-hero-stage">
                <div className="dd-hero-name-block pl-5">
                    {first && <span className="first">{first}</span>}
                    <span className="last">{last}</span>
                    <div className="team-line">
                        <span className="bar"></span>
                        <span>
                            {driver.driver_number != null && <>#{driver.driver_number} · </>}
                            {team && <><b>{team}</b></>}
                            {career.debut_year != null && <>{team ? " · " : ""}DEBUT {career.debut_year}</>}
                        </span>
                    </div>
                </div>

                <div className="dd-hero-points pr-5">
                    <div className="label">
                        <span>Total Career Points</span>
                        <span className="bar"></span>
                    </div>
                    <div className="num">
                        {Math.round(driver.total_points).toLocaleString()}
                        <em>PTS</em>
                    </div>
                    <div className="sub">
                        {driver.total_seasons} SEASONS · {driver.total_wins} WINS
                    </div>
                </div>
            </div>

            <div className="dd-hero-scroll" aria-hidden="true">
                <span className="line"></span>
                <span>Scroll</span>
                <span className="line"></span>
            </div>
        </section>
    );
}
