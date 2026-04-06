import sqlite3
from app.core.config import settings

def init_database():
    """Create all database tables and indexes"""
    conn = sqlite3.connect(settings.DATABASE_PATH)
    cursor = conn.cursor()
    
    # Drivers table - core driver information
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS drivers (
            driver_code TEXT PRIMARY KEY,
            driver_number INTEGER,
            current_team TEXT,
            full_name TEXT NOT NULL,
            average_position REAL,
            total_seasons INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Team history - tracks which team a driver was with each season
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS team_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            driver_code TEXT NOT NULL,
            season INTEGER NOT NULL,
            team_name TEXT NOT NULL,
            FOREIGN KEY (driver_code) REFERENCES drivers(driver_code),
            UNIQUE(driver_code, season)
        )
    """)
    
    # Season standings - detailed standings for each season
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS season_standings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            driver_code TEXT NOT NULL,
            season INTEGER NOT NULL,
            position INTEGER,
            points REAL,
            wins INTEGER DEFAULT 0,
            podiums INTEGER DEFAULT 0,
            pole_positions INTEGER DEFAULT 0,
            fastest_laps INTEGER DEFAULT 0,
            dnfs INTEGER DEFAULT 0,
            FOREIGN KEY (driver_code) REFERENCES drivers(driver_code),
            UNIQUE(driver_code, season)
        )
    """)
    
    # Driver highlights - memorable moments and achievements
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS driver_highlights (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            driver_code TEXT NOT NULL,
            season INTEGER,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            category TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (driver_code) REFERENCES drivers(driver_code)
        )
    """)
    
    # Create indexes for better query performance
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_team_history_driver ON team_history(driver_code)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_standings_driver ON season_standings(driver_code)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_standings_season ON season_standings(season)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_highlights_driver ON driver_highlights(driver_code)")
    
    conn.commit()
    conn.close()
    print("✅ Database schema created successfully")
