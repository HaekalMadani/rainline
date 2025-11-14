from pydantic import BaseModel
from typing import Dict, Any

class DriverCareerStats(BaseModel):
    driver_code: str
    full_name: str
    team_history: Dict[int, str]  # {year: team}
    seasons: Dict[int, Any]       # raw season data
