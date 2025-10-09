from pydantic import BaseModel
from typing import List, Dict, Any

class DriverSeasonPerformance(BaseModel):
    rank: int
    driver_code: str
    full_name: str
    team_name: str
    average_wet_to_dry_delta: float
    races_analyzed_count: int
    races_analyzed_list: List[str]

class SeasonAnalysisResponse(BaseModel):
    season: int
    standings: List[DriverSeasonPerformance]

class SeasonScheduleResponse(BaseModel):
    season: int
    schedule: List[Dict[str, Any]]