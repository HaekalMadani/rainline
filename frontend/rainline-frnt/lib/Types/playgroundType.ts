// Types for the Playground feature. Field names mirror the backend
// (backend/app/services/playground_service.py) — snake_case as returned by the API.

export interface DriverChoice {
    code: string;
    name: string;
    team_2024: string | null;
}

export interface ChassisChoice {
    key: string;
    display_name: string;
    engine: string | null; // real 2024 engine code for this team — used for real-pairing defaults
}

export interface EngineChoice {
    code: string;
    manufacturer: string;
}

export interface ChoicesPayload {
    year: number;
    drivers: DriverChoice[];
    chassis: ChassisChoice[];
    engines: EngineChoice[];
}

export interface Selections {
    driver: string;
    chassis: string;
    engine: string;
}

export interface SimulationComponentDriver {
    code: string;
    delta: number;
    sessions: number | null;
}

export interface SimulationComponentChassis {
    key: string;
    display_name: string | null;
    delta: number;
}

export interface SimulationComponentEngine {
    code: string;
    manufacturer: string | null;
    delta: number;
}

export interface SimulationResult {
    total_time_seconds: number;
    sectors: number[];
    components: {
        baseline_seconds: number;
        driver: SimulationComponentDriver;
        chassis: SimulationComponentChassis;
        engine: SimulationComponentEngine;
    };
    comparisons: {
        baseline_delta: number;
        vs_real_pole_2024: number | null;
    };
    methodology_version: string | null;
}

export type PassCriterion = "beat" | "match";

export interface Challenge {
    id: string;
    name: string;
    description: string;
    locked: {
        driver?: string;
        chassis?: string;
        engine?: string;
    };
    target_lap_time_seconds: number;
    pass_criterion: PassCriterion;
    match_tolerance_seconds?: number;
}

export interface CircuitPoint {
    x: number;
    y: number;
}

// F1-style timing colors. `purple` means the sector (or total) beat the running
// session best when this run resolved; `neutral` means it didn't.
export type SectorColor = "purple" | "neutral";

export interface RunColors {
    sectors: SectorColor[];
    total: SectorColor;
}

export const NEUTRAL_RUN_COLORS: RunColors = {
    sectors: ["neutral", "neutral", "neutral"],
    total: "neutral",
};

export const ALL_PURPLE_RUN_COLORS: RunColors = {
    sectors: ["purple", "purple", "purple"],
    total: "purple",
};

export interface CircuitGeometry {
    track: string;
    season: number;
    viewBox: { width: number; height: number };
    points: CircuitPoint[];
    // [S1/S2 boundary, S2/S3 boundary] as fractions (0..1) of the points array.
    sector_boundaries: [number, number];
    start_finish: CircuitPoint;
}

export interface MethodologyPayload {
    methodology_version: string | null;
    track: string;
    season: number;
    derived_at: string;
    notes: string;
    reference_pole_time_seconds: number | null;
    description: string;
}
