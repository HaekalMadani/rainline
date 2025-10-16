from fastapi import APIRouter, HTTPException
from app.schemas.season import SeasonAnalysisResponse, SeasonScheduleResponse
from app.services.wet import F1Service
from app.core.cache import CACHE
import logging
import json
from pathlib import Path

router = APIRouter()
f1_service = F1Service()

APP_DIR = Path(__file__).resolve().parent.parent
ANALYSIS_DIR = APP_DIR / "analysis_results"

@router.get("/{year}", response_model=SeasonAnalysisResponse)
def get_season_analysis(year: int):
    cache_key = f"analysis_{year}"

    if cache_key in CACHE:
        return {"season": year, "standings": CACHE[cache_key]}

    analysis_file = ANALYSIS_DIR / f"{year}.json"
    if not analysis_file.exists():
        raise HTTPException(
            status_code=404, 
            detail=f"Analysis for the {year} season not found."
        )

    try:
        with open(analysis_file, 'r') as f:
            standings_data = json.load(f)
    except json.JSONDecodeError:
        logging.error(f"Failed to decode JSON from {analysis_file}")
        raise HTTPException(status_code=500, detail="Failed to process analysis file.")

    CACHE[cache_key] = standings_data
    
    return {"season": year, "standings": standings_data}

# @router.get("/{year}", response_model=SeasonScheduleResponse)
# def get_season_details(year: int):
#     cache_key = f"schedule_{year}"
#     if cache_key in CACHE:
#         logging.info(f"Returning cached schedule for {year} season.")
#         return CACHE[cache_key]
    
#     try:
#         season_data = f1_service.get_season(year)
#         if not season_data:
#             raise HTTPException(status_code=404, detail=f"Could not retrieve season schedule for {year}.")
#     except Exception as e:
#         logging.error(f"Error getting schedule for year {year}: {e}")
#         raise HTTPException(status_code=500, detail=f"An error occurred while getting season data: {str(e)}")
    
#     response_data = {"season": year, "schedule": season_data}
#     CACHE[cache_key] = response_data
#     logging.info(f"Cached new schedule for {year} season.")
#     return response_data