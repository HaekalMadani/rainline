import { DriverCareerStatsType } from "@/lib/Types/driverType";
import { deriveCareer } from "./derive";

interface Props {
    driver: DriverCareerStatsType;
    teamColor: string;
}

export default function CareerStats({ driver, teamColor }: Props) {
    const career = deriveCareer(driver);
    const seasonsLabel = career.debut_year && career.final_year
        ? `${career.debut_year}—${career.final_year} · ${driver.total_seasons} SEASONS`
        : `${driver.total_seasons} SEASONS`;

    const winRate = driver.total_seasons > 0 && driver.total_wins > 0
        ? `${((driver.total_wins / Math.max(driver.total_seasons, 1)) * 100).toFixed(1)}% per season`
        : "—";

    const podiumRate = driver.total_seasons > 0 && career.podiums > 0
        ? `${((career.podiums / Math.max(driver.total_seasons, 1)) * 100).toFixed(1)}% per season`
        : "—";

    const bestFinish = career.best_finish_position && career.best_finish_year
        ? `P${career.best_finish_position} (Drivers, ${career.best_finish_year})`
        : "No championship classification yet";

    return (
        <section className="dd-section">
            <div className="dd-section-head">
                <div className="dd-section-title">
                    <span className="num">01</span> Career Stats
                </div>
                <div className="dd-section-meta">{seasonsLabel}</div>
            </div>

            <div className="dd-stats">
                <div className="dd-stat dd-stat-hero">
                    <div className="label">World Championships</div>
                    <div className="num">
                        {career.championships}
                        <em>×</em>
                    </div>
                    <div className="sub">{bestFinish}</div>
                </div>
                <div className="dd-stat">
                    <div className="label">Race Wins</div>
                    <div className="num">{driver.total_wins}</div>
                    <div className="sub">{winRate}</div>
                </div>
                <div className="dd-stat">
                    <div className="label">Podiums</div>
                    <div className="num">{career.podiums}</div>
                    <div className="sub">{podiumRate}</div>
                </div>
            </div>

            <div className="dd-stats-secondary">
                <div className="dd-stat-mini" style={{ borderLeftColor: teamColor }}>
                    <div className="label">Pole Positions</div>
                    <div className="num">{career.poles}</div>
                </div>
                <div className="dd-stat-mini" style={{ borderLeftColor: teamColor }}>
                    <div className="label">Fastest Laps</div>
                    <div className="num">{career.fastest_laps}</div>
                </div>
                <div className="dd-stat-mini" style={{ borderLeftColor: teamColor }}>
                    <div className="label">Career Points</div>
                    <div className="num">{Math.round(driver.total_points).toLocaleString()}</div>
                </div>
                <div className="dd-stat-mini" style={{ borderLeftColor: teamColor }}>
                    <div className="label">DNFs</div>
                    <div className="num">{career.dnfs}</div>
                </div>
            </div>
        </section>
    );
}
