export interface TelemetryPoint {
  time: number;
  distance: number;
  x: number;
  y: number;
  z: number;
  speed: number;
  throttle: number;
  brake: boolean;
  drs: number;
  gear: number;
  rpm: number;
}

export interface CircuitInfo {
  name: string;
  location: string;
  year: number;
  corners?: any[];
}

export interface LapInfo {
  driver: string;
  driver_code: string;
  team: string;
  lap_number: number;
  lap_time: string;
  lap_time_seconds: number;
  compound: string;
}

export interface Stats {
  max_speed: number;
  min_speed: number;
  avg_speed: number;
  total_distance: number;
  data_points: number;
}

export interface RaceData {
  circuit: CircuitInfo;
  lap: LapInfo;
  telemetry: TelemetryPoint[];
  stats: Stats;
}

export interface ChartDataPoint {
  index: number;
  speed: number;
  throttle: number;
  isCurrent: boolean;
}
