from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    # Database
    DATABASE_PATH: str = str(BASE_DIR / "f1_drivers.db")
    
    # API
    API_TITLE: str = "F1 Driver Statistics API"
    API_VERSION: str = "1.0.0"
    
    # Paths
    ANALYSIS_DIR: Path = Path("./analysis_results")
    
    class Config:
        env_file = ".env"

settings = Settings()