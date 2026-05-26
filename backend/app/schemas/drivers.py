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
    driver_number: Optional[int] = None
    current_team: Optional[str] = None
    date_of_birth: Optional[str] = None
    nationality: Optional[str] = None
    country_code: Optional[str] = None
    total_wins: int = 0
    total_points: float = 0
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
    date_of_birth: Optional[str] = None
    nationality: Optional[str] = None
    country_code: Optional[str] = None
    total_wins: int = 0
    total_points: float = 0

class CreateHighlight(BaseModel):
    title: str
    description: str
    season: Optional[int] = None
    category: Optional[str] = None

class DriverWetSession(BaseModel):
    season: int
    session_name: str
    delta_percentage: float
    wet_compound_used: str

class DriverWetSeason(BaseModel):
    season: int
    team_name: Optional[str] = None
    average_delta: Optional[float] = None
    sessions_analyzed: int = 0
    rank: Optional[int] = None
    field_size: int = 0

class DriverWetPerformance(BaseModel):
    driver_code: str
    full_name: Optional[str] = None
    seasons_analyzed: int
    total_sessions: int
    career_average_delta: Optional[float] = None
    best_session: Optional[DriverWetSession] = None
    worst_session: Optional[DriverWetSession] = None
    per_season: List[DriverWetSeason] = Field(default_factory=list)