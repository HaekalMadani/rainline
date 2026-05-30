from fastapi import FastAPI
from app.api import season
from app.api.routes import drivers
from app.api.routes import playground
from fastapi.middleware.cors import CORSMiddleware
from app.database.models import init_database
from app.core.config import settings

init_database()

app = FastAPI()

origins = [
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,       
    allow_credentials=True,      
    allow_methods=["*"],         
    allow_headers=["*"],         
)

app.include_router(
    season.router,
    prefix="/api", 
    tags=["Seasons"]          
)

app.include_router(
    drivers.router,
    prefix="/api",
    tags=["Drivers"]
)

app.include_router(
    playground.router,
    prefix="/api",
    tags=["Playground"]
)
