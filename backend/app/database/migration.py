import json
from pathlib import Path
import sqlite3
from core.config import settings

def migrate_from_json(analysis_dir: Path = None):
    """Migrate existing JSON data to SQLite"""
    if analysis_dir is None:
        analysis_dir = settings.ANALYSIS_DIR
    
    conn = sqlite3.connect(settings.DATABASE_PATH)
    cursor = conn.cursor()
    
    driver_data = {}  # Collect all driver data first
    
    # Read all JSON files
    for file in analysis_dir.glob("*.json"):
        season = int(file.stem)
        
        with open(file) as f:
            data = json.load(f)
        
        # Handle both data formats
        if isinstance(data, dict) and "standings" in data:
            drivers = data["standings"]
        elif isinstance(data, list):
            drivers = data
        else:
            print(f"⚠️ Skipping unexpected format: {file}")
            continue
        
        # Process each driver
        for d in drivers:
            driver_code = d["driver_code"].upper()
            
            if driver_code not in driver_data:
                driver_data[driver_code] = {
                    "full_name": d.get("full_name", ""),
                    "seasons": {},
                    "teams": {}
                }
            
            # Store season data
            driver_data[driver_code]["seasons"][season] = {
                "position": d.get("position"),
                "points": d.get("points"),
                "wins": d.get("wins", 0),
                "podiums": d.get("podiums", 0),
                "pole_positions": d.get("pole_positions", 0),
                "fastest_laps": d.get("fastest_laps", 0),
                "dnfs": d.get("dnfs", 0)
            }
            
            driver_data[driver_code]["teams"][season] = d.get("team_name", "Unknown")
    
    # Insert into database
    for driver_code, data in driver_data.items():
        positions = [s["position"] for s in data["seasons"].values() if s["position"]]
        avg_position = sum(positions) / len(positions) if positions else None
        
        # Insert driver
        cursor.execute("""
            INSERT OR REPLACE INTO drivers (driver_code, full_name, average_position, total_seasons)
            VALUES (?, ?, ?, ?)
        """, (driver_code, data["full_name"], avg_position, len(data["seasons"])))
        
        # Insert team history
        for season, team_name in data["teams"].items():
            cursor.execute("""
                INSERT OR REPLACE INTO team_history (driver_code, season, team_name)
                VALUES (?, ?, ?)
            """, (driver_code, season, team_name))
        
        # Insert season standings
        for season, stats in data["seasons"].items():
            cursor.execute("""
                INSERT OR REPLACE INTO season_standings 
                (driver_code, season, position, points, wins, podiums, pole_positions, fastest_laps, dnfs)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (driver_code, season, stats["position"], stats["points"], 
                  stats["wins"], stats["podiums"], stats["pole_positions"], 
                  stats["fastest_laps"], stats["dnfs"]))
    
    conn.commit()
    conn.close()
    print(f"✅ Migrated {len(driver_data)} drivers to database")