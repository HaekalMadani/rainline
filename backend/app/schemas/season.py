from pydantic import BaseModel
from typing import List, Dict, Any

class SessionAnalysisDetail(BaseModel):
    session_name: str
    dry_baseline_session_name: str
    dry_lap_time_median: float
    dry_laps_analyzed_count: int
    wet_lap_time_median: float
    wet_laps_analyzed_count: int
    wet_compound_used: str
    delta_percentage: float

class DriverSeasonPerformance(BaseModel):
    rank: int
    driver_code: str
    driver_number: int
    full_name: str
    team_name: str
    average_wet_to_dry_delta: float
    sessions_analyzed_count: int
    sessions_analyzed_list: List[SessionAnalysisDetail]

class SeasonAnalysisResponse(BaseModel):
    season: int
    standings: List[DriverSeasonPerformance]

class SeasonScheduleResponse(BaseModel):
    season: int
    schedule: List[Dict[str, Any]]