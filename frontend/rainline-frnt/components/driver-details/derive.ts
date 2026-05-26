import { DriverCareerStatsType, SeasonStats } from "@/lib/Types/driverType";

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export function splitName(fullName: string): { first: string; last: string } {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return { first: "", last: parts[0] };
    const last = parts[parts.length - 1];
    const first = parts.slice(0, -1).join(" ");
    return { first, last };
}

export function formatDOB(iso: string | null | undefined): string {
    if (!iso) return "";
    const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return iso;
    const [, yyyy, mm, dd] = m;
    const monthIdx = parseInt(mm, 10) - 1;
    if (monthIdx < 0 || monthIdx > 11) return iso;
    return `${dd} ${MONTHS[monthIdx]} ${yyyy}`;
}

export function ageFromDOB(iso: string | null | undefined, now: Date = new Date()): number | null {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    let age = now.getFullYear() - d.getFullYear();
    const mDiff = now.getMonth() - d.getMonth();
    if (mDiff < 0 || (mDiff === 0 && now.getDate() < d.getDate())) age--;
    return age;
}

export interface CareerTotals {
    seasons: number[];
    debut_year: number | null;
    final_year: number | null;
    is_active: boolean;
    championships: number;
    podiums: number;
    poles: number;
    fastest_laps: number;
    dnfs: number;
    best_finish_position: number | null;
    best_finish_year: number | null;
}

export function deriveCareer(driver: DriverCareerStatsType, currentYear: number = new Date().getFullYear()): CareerTotals {
    const seasonsMap = driver.seasons_standings || {};
    const seasons = Object.keys(seasonsMap).map((y) => parseInt(y, 10)).filter((y) => !isNaN(y)).sort((a, b) => a - b);
    let championships = 0;
    let podiums = 0;
    let poles = 0;
    let fastest_laps = 0;
    let dnfs = 0;
    let best_finish_position: number | null = null;
    let best_finish_year: number | null = null;

    for (const year of seasons) {
        const s: SeasonStats = seasonsMap[year];
        if (s.position === 1) championships++;
        podiums += s.podiums || 0;
        poles += s.pole_positions || 0;
        fastest_laps += s.fastest_laps || 0;
        dnfs += s.dnfs || 0;
        if (s.position != null && (best_finish_position === null || s.position < best_finish_position)) {
            best_finish_position = s.position;
            best_finish_year = year;
        }
    }

    return {
        seasons,
        debut_year: seasons.length ? seasons[0] : null,
        final_year: seasons.length ? seasons[seasons.length - 1] : null,
        is_active: seasons.includes(currentYear) || seasons.includes(currentYear - 1),
        championships,
        podiums,
        poles,
        fastest_laps,
        dnfs,
        best_finish_position,
        best_finish_year,
    };
}

export interface TeamRange {
    start: number;
    end: number;
    team: string;
    seasons: number;
}

export function collapseTeamHistory(team_history: Record<number, string>): TeamRange[] {
    const years = Object.keys(team_history).map((y) => parseInt(y, 10)).filter((y) => !isNaN(y)).sort((a, b) => a - b);
    if (!years.length) return [];

    const ranges: TeamRange[] = [];
    let start = years[0];
    let prev = years[0];
    let team = team_history[start];

    for (let i = 1; i < years.length; i++) {
        const y = years[i];
        const t = team_history[y];
        if (t !== team || y !== prev + 1) {
            ranges.push({ start, end: prev, team, seasons: prev - start + 1 });
            start = y;
            team = t;
        }
        prev = y;
    }
    ranges.push({ start, end: prev, team, seasons: prev - start + 1 });
    return ranges;
}

export function formatTeamRangeYears(r: TeamRange, currentYear: number): string {
    if (r.start === r.end) return String(r.start);
    if (r.end >= currentYear) return `${r.start}–NOW`;
    return `${r.start}–${r.end}`;
}

export function teamSlug(team: string): string {
    return team.replaceAll(" ", "-");
}

export function driverPortraitPath(fullName: string): string {
    return `/drivers/${fullName.replaceAll(" ", "-")}.webp`;
}

export function teamLogoPath(team: string): string {
    return `/teams/${teamSlug(team)}.webp`;
}
