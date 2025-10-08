from fastapi import APIRouter, HTTPException
from app.schemas.season import SeasonAnalysisResponse
from app.services.wet import F1Service
from app.core.cache import SEASON_CACHE

router = APIRouter()
f1_service = F1Service()

@router.get("/{year}", response_model=SeasonAnalysisResponse)
def get_season_analysis(year: int):
    if year in SEASON_CACHE:
        print(f"Returning cached result for {year} season.")
        return SEASON_CACHE[year]

    try:
        standings_data = f1_service.calculate_seasonal_wet_performance(year)
        if not standings_data:
            raise HTTPException(status_code=404, detail=f"No wet race data found for the {year} season.")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred during analysis: {str(e)}")

    response_data = {"season": year, "standings": standings_data}
    SEASON_CACHE[year] = response_data
    print(f"Cached new result for {year} season.")
    
    return response_data