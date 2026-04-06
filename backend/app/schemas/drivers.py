from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional

class SeasonStats(BaseModel):
    position: Optional[int] = None
    points: Optional[float] = None
    wins: int = 0
    podiums: int = 0
    pole_positions: int = 0
    fastest_laps: int = 0
    dnfs: int = 0

class DriverHighlight(BaseModel):
    id: int
    season: Optional[int] = None
    title: str
    description: str
    category: Optional[str] = None

class DriverCareerStats(BaseModel):
    driver_code: str
    full_name: str
    average_position: Optional[float] = None
    total_seasons: int
    team_history: Dict[int, str] = Field(default_factory=dict)
    seasons_standings: Dict[int, SeasonStats] = Field(default_factory=dict)
    highlights: List[DriverHighlight] = Field(default_factory=list)

class DriverSummary(BaseModel):
    driver_code: str
    full_name: str
    average_position: Optional[float] = None
    total_seasons: int
    driver_number: int
    current_team: str

class CreateHighlight(BaseModel):
    title: str
    description: str
    season: Optional[int] = None
    category: Optional[str] = None