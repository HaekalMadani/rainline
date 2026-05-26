import { DriverCareerStatsType } from "@/lib/Types/driverType";
import { formatDOB, ageFromDOB, deriveCareer } from "./derive";
import useDriverWet from "@/lib/Hooks/useDriverWet";

interface Props {
    driver: DriverCareerStatsType;
}

export default function BioWetPanel({ driver }: Props) {
    const career = deriveCareer(driver);
    const dob = formatDOB(driver.date_of_birth);
    const age = ageFromDOB(driver.date_of_birth);
    const status = career.is_active ? "ACTIVE" : "INACTIVE";
    const { data: wet, isLoading: wetLoading } = useDriverWet(driver.driver_code);

    return (
        <section className="dd-section">
            <div className="dd-section-head">
                <div className="dd-section-title">
                    <span className="num">03</span> Profile · Wet Performance
                </div>
                <div className="dd-section-meta">RaceLine Index</div>
            </div>

            <div className="dd-bio">
                <div className="dd-bio-card">
                    <div className="dd-bio-tag">Biography</div>
                    <div className="dd-bio-grid">
                        <div className="dd-bio-item">
                            <div className="label">Full Name</div>
                            <div className="val">{driver.full_name}</div>
                        </div>
                        {dob && (
                            <div className="dd-bio-item">
                                <div className="label">Date of Birth</div>
                                <div className="val">{dob}</div>
                            </div>
                        )}
                        {driver.nationality && (
                            <div className="dd-bio-item">
                                <div className="label">Nationality</div>
                                <div className="val">{driver.nationality}</div>
                            </div>
                        )}
                        {age !== null && (
                            <div className="dd-bio-item">
                                <div className="label">Age</div>
                                <div className="val">{age}</div>
                            </div>
                        )}
                        <div className="dd-bio-item">
                            <div className="label">Career Status</div>
                            <div
                                className="val"
                                style={{
                                    color: career.is_active ? "var(--rl-success)" : "var(--rl-fg-muted)",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 8,
                                }}
                            >
                                <span aria-hidden="true">{career.is_active ? "●" : "○"}</span>
                                {status}
                            </div>
                        </div>
                        {driver.driver_number !== null && driver.driver_number !== undefined && (
                            <div className="dd-bio-item">
                                <div className="label">Race Number</div>
                                <div className="val">#{driver.driver_number}</div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="dd-bio-card dark">
                    <div className="dd-bio-tag">Wet Performance</div>
                    {wetLoading ? (
                        <div className="dd-wet">
                            <div className="dd-wet-empty">Loading…</div>
                        </div>
                    ) : !wet || wet.total_sessions === 0 ? (
                        <div className="dd-wet">
                            <div className="dd-wet-empty">No wet sessions analyzed</div>
                        </div>
                    ) : (
                        <>
                            <div className="dd-wet">
                                <div>
                                    <div className="lbl">Career Wet→Dry Delta</div>
                                    <div className="val">
                                        {wet.career_average_delta != null
                                            ? `+${wet.career_average_delta.toFixed(2)}%`
                                            : "n/a"}
                                    </div>
                                </div>
                                <div className="delta">
                                    {wet.total_sessions} {wet.total_sessions === 1 ? "SESSION" : "SESSIONS"}
                                </div>
                            </div>
                            {wet.per_season.length > 0 && (
                                <div className="dd-season-ranks">
                                    {wet.per_season.map((s) => (
                                        <div className="dd-season-rank" key={s.season}>
                                            <div className="yr">{s.season}</div>
                                            <div className="rk">
                                                {s.rank ?? "n/a"}
                                                {s.field_size > 0 && (
                                                    <em>/{s.field_size}</em>
                                                )}
                                            </div>
                                            <div className="yr">
                                                {s.average_delta != null
                                                    ? `+${s.average_delta.toFixed(1)}%`
                                                    : "n/a"}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </section>
    );
}
