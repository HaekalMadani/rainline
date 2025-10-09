from fastapi import FastAPI
from app.api import season

app = FastAPI()

app.include_router(
    season.router,
    prefix="/api/season", 
    tags=["Seasons"]          
)