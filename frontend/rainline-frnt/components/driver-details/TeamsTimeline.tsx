import { DriverCareerStatsType } from "@/lib/Types/driverType";
import { teamColors } from "@/lib/teamColors";
import { collapseTeamHistory, formatTeamRangeYears, deriveCareer } from "./derive";

interface Props {
    driver: DriverCareerStatsType;
}

const colorFor = (team: string): string =>
    (teamColors as Record<string, string>)[team] ?? "#444";

export default function TeamsTimeline({ driver }: Props) {
    const career = deriveCareer(driver);
    const ranges = collapseTeamHistory(driver.team_history || {});
    const currentYear = new Date().getFullYear();
    const start = career.debut_year ?? currentYear;
    const end = Math.max(career.final_year ?? currentYear, currentYear);
    const totalYears = Math.max(end - start + 1, 1);

    return (
        <section className="dd-section">
            <div className="dd-section-head">
                <div className="dd-section-title">
                    <span className="num">02</span> Teams History
                </div>
                <div className="dd-section-meta">
                    {ranges.length} {ranges.length === 1 ? "CONSTRUCTOR" : "CONSTRUCTORS"}
                </div>
            </div>

            <div className="dd-timeline">
                <div className="dd-timeline-track">
                    {ranges.map((r, i) => {
                        const span = (r.end - r.start + 1) / totalYears;
                        const clip = i === 0
                            ? "polygon(0 0, 100% 0, calc(100% - 18px) 100%, 0 100%)"
                            : i === ranges.length - 1
                                ? "polygon(18px 0, 100% 0, 100% 100%, 0 100%)"
                                : "polygon(18px 0, 100% 0, calc(100% - 18px) 100%, 0 100%)";
                        return (
                            <div
                                key={`${r.team}-${r.start}`}
                                className="dd-timeline-seg"
                                style={{
                                    flex: span,
                                    background: colorFor(r.team),
                                    clipPath: clip,
                                    marginLeft: i === 0 ? 0 : -10,
                                }}
                            >
                                <span className="seg-year">{r.start}</span>
                                {i === ranges.length - 1 && (
                                    <span className="seg-end">{r.end >= currentYear ? "NOW" : r.end}</span>
                                )}
                                <span>{r.team}</span>
                            </div>
                        );
                    })}
                </div>

                <div className="dd-timeline-rows">
                    {ranges.map((r) => (
                        <div key={`row-${r.team}-${r.start}`} className="dd-timeline-row">
                            <div className="years">{formatTeamRangeYears(r, currentYear)}</div>
                            <div className="team">
                                <span className="swatch" style={{ background: colorFor(r.team) }}></span>
                                <span>{r.team}</span>
                            </div>
                            <div className="role">Race Driver</div>
                            <div className="races">
                                {r.seasons}
                                <span style={{ fontSize: 10, marginLeft: 4, color: "var(--rl-fg-muted)", letterSpacing: ".18em" }}>
                                    {r.seasons === 1 ? "SEASON" : "SEASONS"}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
