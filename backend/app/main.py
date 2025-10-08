from fastapi import FastAPI
from app.api import season

app = FastAPI(
    title="F1 Wet Weather Performance API",
    description="An API to analyze F1 driver performance in wet conditions."
)

app.include_router(
    season.router,
    prefix="/api/season", 
    tags=["Seasons"]          
)