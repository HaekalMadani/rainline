from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from app.schemas.drivers import (
    DriverCareerStats,
    DriverSummary,
    DriverHighlight,
    CreateHighlight,
    DriverWetPerformance,
)
from app.services.driver_service import DriverService
from app.services.highlight_service import HighlightService
from app.services.wet import F1Service
from app.core.cache import CACHE

router = APIRouter(prefix="/drivers", tags=["drivers"])

@router.get("", response_model=List[DriverSummary])
def list_all_drivers(
    sort_by: str = Query("driver_code", regex="^(driver_code|full_name|average_position|total_seasons|driver_number|current_team)$")
):
    return DriverService.get_all_drivers(sort_by=sort_by)

@router.get("/{driver_code}", response_model=DriverCareerStats)
def get_driver_career(driver_code: str):
    driver_data = DriverService.get_driver_by_code(driver_code)
    
    if not driver_data:
        raise HTTPException(
            status_code=404, 
            detail=f"Driver {driver_code.upper()} not found"
        )
    
    return driver_data

@router.get("/{driver_code}/wet", response_model=DriverWetPerformance)
def get_driver_wet_performance(driver_code: str):
    code = driver_code.upper()
    cache_key = f"wet_{code}"

    if cache_key in CACHE:
        return CACHE[cache_key]

    if not DriverService.driver_exists(code):
        raise HTTPException(status_code=404, detail=f"Driver {code} not found")

    result = F1Service.aggregate_driver_wet_performance(code)
    if result is None:
        result = {
            "driver_code": code,
            "full_name": None,
            "seasons_analyzed": 0,
            "total_sessions": 0,
            "career_average_delta": None,
            "best_session": None,
            "worst_session": None,
            "per_season": [],
        }

    CACHE[cache_key] = result
    return result

@router.get("/{driver_code}/highlights", response_model=List[DriverHighlight])
def get_driver_highlights(
    driver_code: str,
    category: Optional[str] = None
):
    if not DriverService.driver_exists(driver_code):
        raise HTTPException(
            status_code=404,
            detail=f"Driver {driver_code.upper()} not found"
        )
    
    return HighlightService.get_driver_highlights(driver_code, category)

@router.post("/{driver_code}/highlights", response_model=DriverHighlight, status_code=201)
def create_driver_highlight(driver_code: str, highlight: CreateHighlight):
    if not DriverService.driver_exists(driver_code):
        raise HTTPException(
            status_code=404,
            detail=f"Driver {driver_code.upper()} not found"
        )
    
    return HighlightService.create_highlight(driver_code, highlight)

@router.delete("/highlights/{highlight_id}", status_code=204)
def delete_highlight(highlight_id: int):
    if not HighlightService.delete_highlight(highlight_id):
        raise HTTPException(
            status_code=404,
            detail=f"Highlight {highlight_id} not found"
        )

@router.get("/season/{season}", response_model=List[DriverSummary])
def get_season_standings(season: int):
    drivers = DriverService.get_drivers_by_season(season)
    
    if not drivers:
        raise HTTPException(
            status_code=404,
            detail=f"No data found for season {season}"
        )
    
    return drivers

@router.get("/team/{team_name}", response_model=List[DriverSummary])
def get_team_drivers(team_name: str):
    """Get all drivers who have driven for a team"""
    drivers = DriverService.get_drivers_by_team(team_name)
    
    if not drivers:
        raise HTTPException(
            status_code=404,
            detail=f"No drivers found for team '{team_name}'"
        )
    
    return drivers