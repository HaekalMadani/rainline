from fastapi import APIRouter, HTTPException
from app.schemas.season import SeasonAnalysisResponse
from app.schemas.drivers import DriverCareerStats
from app.services.wet import F1Service
from app.core.cache import CACHE
import logging
import json
from pathlib import Path
from typing import List


router = APIRouter()
f1_service = F1Service()

APP_DIR = Path(__file__).resolve().parent.parent
ANALYSIS_DIR = APP_DIR / "analysis_results"

@router.get("/season/{year}", response_model=SeasonAnalysisResponse)
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

@router.get("/driver/{driver_code}", response_model=DriverCareerStats)
def get_driver_career(driver_code: str):
    driver_code = driver_code.upper()
    cache_key = f"driver_{driver_code}"

    if cache_key in CACHE:
        return CACHE[cache_key]
    
    driver_seasons = {}
    team_history = {}
    full_name = None

    for file in ANALYSIS_DIR.glob("*.json"):
        season = int(file.stem)

        with open(file) as f:
            data = json.load(f)

        # ✅ Case 1: { "standings": [...] }
        if isinstance(data, dict) and "standings" in data:
            drivers = data["standings"]

        # ✅ Case 2: [ {...},{...} ]
        elif isinstance(data, list):
            drivers = data

        else:
            print(f"⚠️ Skipping unexpected format: {file}")
            continue

        for d in drivers:
            if d["driver_code"].upper() == driver_code:
                driver_seasons[season] = d
                team_history[season] = d["team_name"]
                full_name = d["full_name"]

    if not driver_seasons:
        raise HTTPException(status_code=404, detail="Driver not found")

    result = {
        "driver_code": driver_code,
        "full_name": full_name,
        "team_history": team_history,
        "seasons": driver_seasons,
    }

    CACHE[cache_key] = result
    return result


@router.get("/", response_model=list[str])
def list_all_drivers():
    cache_key = "driver_list"

    if cache_key in CACHE:
        return CACHE[cache_key]

    drivers = set()

    for file in ANALYSIS_DIR.glob("*.json"):
        with open(file) as f:
            data = json.load(f)

        if isinstance(data, dict) and "standings" in data:
            for d in data["standings"]:
                drivers.add(d["driver_code"])

        elif isinstance(data, list):
            for d in data:
                drivers.add(d["driver_code"])

        else:
            # Log unexpected structure
            print(f"⚠️ Unexpected format in: {file}")

    driver_list = sorted(drivers)
    CACHE[cache_key] = driver_list
    return driver_list


