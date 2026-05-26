import Image from "next/image";
import { DriverCareerStatsType } from "@/lib/Types/driverType";
import FlagSwatch from "./FlagSwatch";
import {
    splitName,
    formatDOB,
    ageFromDOB,
    deriveCareer,
    driverPortraitPath,
    teamLogoPath,
} from "./derive";

interface Props {
    driver: DriverCareerStatsType;
}

export default function DriverDetailsHero({ driver }: Props) {
    const { first, last } = splitName(driver.full_name);
    const career = deriveCareer(driver);
    const dob = formatDOB(driver.date_of_birth);
    const age = ageFromDOB(driver.date_of_birth);
    const team = driver.current_team ?? "";
    const status = career.is_active ? "ACTIVE" : "INACTIVE";

    return (
        <section className="dd-hero">
            <div className="dd-hero-slab"></div>
            <div className="dd-hero-slab-stripe"></div>

            <div className="dd-hero-grid py-10">
                <div className="dd-hero-id">
                    <div className="dd-hero-eyebrow">
                        <span className="dot"></span>
                        <span>Driver Profile · {driver.driver_code}</span>
                    </div>
                    <div className="dd-hero-name">
                        {first && <span className="first">{first}</span>}
                        <span className="last">{last}</span>
                    </div>

                    {team && (
                        <div className="dd-hero-team">
                            <div className="dd-hero-team-logo">
                                <Image src={teamLogoPath(team)} alt="" width={32} height={32} />
                            </div>
                            <div className="dd-hero-team-text">
                                <div className="dd-hero-team-label">
                                    Current Team{career.debut_year ? ` · ${career.debut_year}—NOW` : ""}
                                </div>
                                <div className="dd-hero-team-name">{team}</div>
                            </div>
                        </div>
                    )}

                    <div className="dd-hero-bio">
                        {dob && (
                            <div className="dd-hero-bio-item">
                                <div className="label">Date of Birth</div>
                                <div className="val">{dob}</div>
                            </div>
                        )}
                        {driver.nationality && (
                            <div className="dd-hero-bio-item">
                                <div className="label">Nationality</div>
                                <div className="val">{driver.nationality}</div>
                            </div>
                        )}
                        {age !== null && (
                            <div className="dd-hero-bio-item">
                                <div className="label">Age</div>
                                <div className="val">{age}</div>
                            </div>
                        )}
                        {career.debut_year !== null && (
                            <div className="dd-hero-bio-item">
                                <div className="label">F1 Debut</div>
                                <div className="val">{career.debut_year}</div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="dd-hero-portrait">
                    <Image
                        src={driverPortraitPath(driver.full_name)}
                        alt={driver.full_name}
                        fill
                        sizes="480px"
                        style={{ objectFit: "contain", objectPosition: "bottom" }}
                    />
                </div>

                <div className="dd-hero-meta">
                    {driver.country_code && (
                        <div className="dd-hero-flag">
                            <FlagSwatch code={driver.country_code} />
                            <span>{driver.country_code}</span>
                        </div>
                    )}
                    <div className="dd-hero-status">
                        <span className="pulse"></span>
                        <span>{status}</span>
                    </div>
                    <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                        <div className="dd-hero-number">{driver.driver_number ?? ""}</div>
                        <div className="dd-hero-number-plate">Race Number</div>
                    </div>
                </div>
            </div>

            <div className="dd-hero-footer">
                <div className="accent">
                    {driver.driver_code} · {driver.full_name}
                </div>
                <div className="ticks">
                    <span>
                        <b>{driver.total_wins}</b> WINS
                    </span>
                    <span>
                        <b>{career.podiums}</b> PODIUMS
                    </span>
                    <span>
                        <b>{career.poles}</b> POLES
                    </span>
                    <span>
                        <b>{Math.round(driver.total_points).toLocaleString()}</b> PTS
                    </span>
                    <span>
                        <b>{driver.total_seasons}</b> SEASONS
                    </span>
                    <span>
                        <b>{career.championships}</b> TITLES
                    </span>
                </div>
            </div>
        </section>
    );
}
