from fastapi import APIRouter, HTTPException
from app.schemas.season import SeasonAnalysisResponse, SeasonScheduleResponse
from app.services.wet import F1Service
from app.core.cache import CACHE
import logging
import json
from pathlib import Path

router = APIRouter()
f1_service = F1Service()

@router.get("/driver/{year}", response_model=SeasonAnalysisResponse)
def get_season_analysis(year: int):

    analysis_file = Path("analysis_results") / f"{year}.json"

    if not analysis_file.exists():
        raise HTTPException(
            status_code=404, 
            detail=f"Analysis for the {year} season not found. It may not have been pre-calculated yet."
        )

    with open(analysis_file, 'r') as f:
        standings_data = json.load(f)

    return {"season": year, "standings": standings_data}

@router.get("/{year}", response_model=SeasonScheduleResponse)
def get_season_details(year: int):
    cache_key = f"schedule_{year}"
    if cache_key in CACHE:
        logging.info(f"Returning cached schedule for {year} season.")
        return CACHE[cache_key]
    
    try:
        season_data = f1_service.get_season(year)
        if not season_data:
            raise HTTPException(status_code=404, detail=f"Could not retrieve season schedule for {year}.")
    except Exception as e:
        logging.error(f"Error getting schedule for year {year}: {e}")
        raise HTTPException(status_code=500, detail=f"An error occurred while getting season data: {str(e)}")
    
    response_data = {"season": year, "schedule": season_data}
    CACHE[cache_key] = response_data
    logging.info(f"Cached new schedule for {year} season.")
    return response_data