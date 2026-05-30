export interface DriverCareerType {
    driver_code: string;
    full_name: string;
    average_position: number | null;
    total_seasons: number;
    driver_number: number;
    current_team: string;
    date_of_birth: string | null;
    nationality: string | null;
    country_code: string | null;
    total_wins: number;
    total_points: number;
    last_season: number | null;
}

export interface SeasonStats {
    position: number | null;
    points: number | null;
    wins: number;
    podiums: number;
    pole_positions: number;
    fastest_laps: number;
    dnfs: number;
}

export interface DriverHighlight {
    id: number;
    season: number | null;
    title: string;
    description: string;
    category: string | null;
}

export interface DriverCareerStatsType {
    driver_code: string;
    full_name: string;
    average_position: number | null;
    total_seasons: number;
    driver_number: number | null;
    current_team: string | null;
    date_of_birth: string | null;
    nationality: string | null;
    country_code: string | null;
    total_wins: number;
    total_points: number;
    team_history: Record<number, string>;
    seasons_standings: Record<number, SeasonStats>;
    highlights: DriverHighlight[];
}

export interface DriverWetSession {
    season: number;
    session_name: string;
    delta_percentage: number;
    wet_compound_used: string;
}

export interface DriverWetSeason {
    season: number;
    team_name: string | null;
    average_delta: number | null;
    sessions_analyzed: number;
    rank: number | null;
    field_size: number;
}

export interface DriverWetPerformanceType {
    driver_code: string;
    full_name: string | null;
    seasons_analyzed: number;
    total_sessions: number;
    career_average_delta: number | null;
    best_session: DriverWetSession | null;
    worst_session: DriverWetSession | null;
    per_season: DriverWetSeason[];
}