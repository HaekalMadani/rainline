// Playground chassis slug → identity bits.
//
// The chassis keys come from the backend coefficient bundle (lowercase, ASCII —
// "redbull", "astonmartin", …). They're the same slugs used in the --team-* CSS
// vars in app/globals.css, just without the prefix.

export const CHASSIS_TEAM_COLOR: Record<string, string> = {
    redbull: "#497fdd",
    rb: "#6999ff",
    mercedes: "#3cd1b6",
    mclaren: "#f37915",
    astonmartin: "#2f9670",
    williams: "#1269d8",
    ferrari: "#ec152b",
    haas: "#9c9ea2",
    sauber: "#444444",
    alpine: "#00a0f2",
};

export function chassisToTeamColor(chassis: string | undefined | null): string {
    if (!chassis) return "#1A1A1A";
    return CHASSIS_TEAM_COLOR[chassis] ?? "#1A1A1A";
}

// Files committed under /public/teams/. Sauber falls back to the Alfa-Romeo
// lineage logo (used by the design's data.js); Haas / RB / Kick Sauber don't
// have logos in the existing asset pack and render an empty slot.
export const CHASSIS_LOGO: Record<string, string> = {
    redbull: "/teams/Red-Bull-Racing.webp",
    ferrari: "/teams/Ferrari.webp",
    mercedes: "/teams/Mercedes.webp",
    mclaren: "/teams/McLaren.webp",
    astonmartin: "/teams/Aston-Martin.webp",
    williams: "/teams/Williams.webp",
    alpine: "/teams/Alpine.webp",
    sauber: "/teams/Alfa-Romeo.webp",
};

export function chassisToLogo(chassis: string | undefined | null): string | null {
    if (!chassis) return null;
    return CHASSIS_LOGO[chassis] ?? null;
}

// Driver `team_2024` strings come from FastF1; chassis `display_name` from
// the coefficient bundle. They DO NOT line up ("Red Bull Racing" vs "Red Bull",
// "Kick Sauber" vs "Kick Sauber" but lowercase elsewhere). This map is the
// canonical bridge — given a team_2024 string, find the chassis key.
export const TEAM_2024_TO_CHASSIS_KEY: Record<string, string> = {
    "Red Bull Racing": "redbull",
    RB: "rb",
    Mercedes: "mercedes",
    McLaren: "mclaren",
    "Aston Martin": "astonmartin",
    Williams: "williams",
    Ferrari: "ferrari",
    "Haas F1 Team": "haas",
    "Kick Sauber": "sauber",
    Alpine: "alpine",
};

export function isRealPairing(
    driverTeam2024: string | null | undefined,
    chassisKey: string | null | undefined,
    chassisRealEngine: string | null | undefined,
    selectedEngine: string,
): boolean {
    if (!driverTeam2024 || !chassisKey || !chassisRealEngine) return false;
    const driverChassisKey = TEAM_2024_TO_CHASSIS_KEY[driverTeam2024];
    return driverChassisKey === chassisKey && chassisRealEngine === selectedEngine;
}

// "Max Verstappen" → "Verstappen". Single-token names pass through unchanged.
export function lastName(fullName: string): string {
    const parts = fullName.trim().split(/\s+/);
    return parts.length > 1 ? parts.slice(1).join(" ") : fullName;
}
