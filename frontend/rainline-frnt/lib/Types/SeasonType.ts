export interface SessionAnalysisDetail {
  session_name: string;
  dry_baseline_session_name: string;
  dry_lap_time_median: number;
  dry_laps_analyzed_count: number;
  wet_lap_time_median: number;
  wet_laps_analyzed_count: number;
  wet_compound_used: string;
  delta_percentage: number;
}

export interface DriverSeasonPerformance {
  rank: number;
  driver_code: string;
  driver_number: number;
  full_name: string;
  team_name: string;
  average_wet_to_dry_delta: number;
  sessions_analyzed_count: number;
  sessions_analyzed_list: SessionAnalysisDetail[];
}

export interface SeasonAnalysisResponse {
  season: number;
  standings: DriverSeasonPerformance[];
}

export interface SelectSeasonProps {
  selectedSeason: number | null;
  onSeasonSelect: (season: number) => void;
}

export interface DriversTableProps {
  season: number;
}