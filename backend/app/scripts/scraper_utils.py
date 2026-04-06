import fastf1
import sqlite3
from typing import Dict, Tuple
import logging
from pathlib import Path
import pandas as pd

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
cache_path = Path("ff1_cache")
cache_path.mkdir(parents=True, exist_ok=True)
fastf1.Cache.enable_cache(cache_path)


current_dir = Path(__file__).resolve().parent
DB_PATH = current_dir.parent / "f1_drivers.db"


def get_db_connection():
    """Get database connection"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def scrape_season(year: int) -> bool:
    """
    Scrape complete season using FastF1 Session API
    Returns True if successful
    """
    logger.info(f"🏁 Scraping season {year}...")
    
    try:
        # Get the event schedule for the year
        schedule = fastf1.get_event_schedule(year)
        
        if schedule.empty:
            logger.warning(f"No events found for {year}")
            return False
        
        # Filter only race events (exclude testing, sprints shown separately)
        races = schedule[schedule['EventFormat'] != 'testing']
        
        logger.info(f"Found {len(races)} events in {year}")
        
        # Dictionary to store driver stats across the season
        driver_stats = {}
        
        # Process each race
        for idx, event in races.iterrows():
            event_name = event['EventName']
            round_num = event['RoundNumber']
            
            logger.info(f"  Processing Round {round_num}: {event_name}")
            
            try:
                # Load the race session
                session = fastf1.get_session(year, round_num, 'R')
                session.load()
                
                # Get race results
                results = session.results
                
                if results.empty:
                    logger.warning(f"    No results for {event_name}")
                    continue
                
                # Process each driver's result
                for _, driver_result in results.iterrows():
                    driver_code = driver_result['Abbreviation']
                    
                    # Initialize driver if not seen before
                    if driver_code not in driver_stats:
                        driver_stats[driver_code] = {
                            'full_name': driver_result['FullName'],
                            'team_name': driver_result['TeamName'],  
                            'current_team': driver_result['TeamName'], 
                            'driver_number': driver_result.get('DriverNumber'),  # NEW
                            'points': 0,
                            'wins': 0,
                            'podiums': 0,
                            'pole_positions': 0,
                            'fastest_laps': 0,
                            'dnfs': 0,
                            'races': 0
                        }
                    
                    driver_stats[driver_code]['races'] += 1
                    driver_stats[driver_code]['current_team'] = driver_result['TeamName']
                    
                    # Add points
                    points = driver_result.get('Points', 0)
                    if pd.notna(points):
                        driver_stats[driver_code]['points'] += float(points)
                    
                    # Check for win (Position == 1)
                    position = driver_result.get('Position')
                    if pd.notna(position) and position == 1.0:
                        driver_stats[driver_code]['wins'] += 1
                    
                    # Check for podium (Position 1-3)
                    if pd.notna(position) and position <= 3.0:
                        driver_stats[driver_code]['podiums'] += 1
                    
                    # Check for DNF (Status not 'Finished' and no position or position > race finishers)
                    status = driver_result.get('Status', '')
                    if not pd.isna(status) and status != 'Finished' and '+' not in str(status):
                        if pd.isna(position) or position > 20:
                            driver_stats[driver_code]['dnfs'] += 1
                    
                    # Update team name (use latest)
                    driver_stats[driver_code]['team_name'] = driver_result['TeamName']
                
                # Get qualifying results for pole positions
                try:
                    quali = fastf1.get_session(year, round_num, 'Q')
                    quali.load()
                    
                    if not quali.results.empty:
                        pole_sitter = quali.results.iloc[0]
                        pole_driver = pole_sitter['Abbreviation']
                        
                        if pole_driver in driver_stats:
                            driver_stats[pole_driver]['pole_positions'] += 1
                
                except Exception as e:
                    logger.warning(f"    Could not load qualifying for {event_name}: {e}")
                
                # Check for fastest lap
                try:
                    fastest_lap = session.laps.pick_fastest()
                    if fastest_lap is not None and not fastest_lap.empty:
                        fastest_driver = fastest_lap['Driver']
                        if fastest_driver in driver_stats:
                            driver_stats[fastest_driver]['fastest_laps'] += 1
                except Exception as e:
                    logger.warning(f"    Could not get fastest lap for {event_name}: {e}")
                
            except Exception as e:
                logger.warning(f"    Error processing {event_name}: {e}")
                continue
        
        if not driver_stats:
            logger.error(f"No driver data collected for {year}")
            return False
        
        # Calculate final positions based on points
        sorted_drivers = sorted(
            driver_stats.items(),
            key=lambda x: (x[1]['points'], x[1]['wins']),
            reverse=True
        )
        
        # Assign positions
        for position, (driver_code, stats) in enumerate(sorted_drivers, start=1):
            driver_stats[driver_code]['position'] = position
        
        # Save to database
        save_season_to_db(year, driver_stats)
        
        logger.info(f"✅ Successfully scraped {year} - {len(driver_stats)} drivers")
        return True
        
    except Exception as e:
        logger.error(f"❌ Error scraping season {year}: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return False


def save_season_to_db(year: int, driver_stats: Dict):
    """Save scraped season data to database"""
    logger.info(f"💾 Saving {year} data to database...")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        for driver_code, stats in driver_stats.items():
            # Check if driver exists
            cursor.execute(
                "SELECT total_seasons FROM drivers WHERE driver_code = ?",
                (driver_code,)
            )
            existing = cursor.fetchone()
            
            if existing:
                # Update existing driver
                cursor.execute("""
                    UPDATE drivers 
                    SET full_name = ?,
                        total_seasons = total_seasons + 1,
                        driver_number = ?,
                        current_team = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE driver_code = ?
                """, (stats['full_name'], stats['driver_number'], stats['current_team'] ,driver_code))
            else:
                # Insert new driver
                cursor.execute("""
                    INSERT INTO drivers (driver_code, full_name, total_seasons, average_position, driver_number, current_team)
                    VALUES (?, ?, 1, ?, ?, ?)
                """, (driver_code, stats['full_name'], stats['position']))
            
            # Insert team history
            cursor.execute("""
                INSERT OR REPLACE INTO team_history (driver_code, season, team_name)
                VALUES (?, ?, ?)
            """, (driver_code, year, stats['team_name']))
            
            # Insert season standings
            cursor.execute("""
                INSERT OR REPLACE INTO season_standings 
                (driver_code, season, position, points, wins, podiums, 
                 pole_positions, fastest_laps, dnfs)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                driver_code, year, stats['position'], stats['points'],
                stats['wins'], stats['podiums'], stats['pole_positions'],
                stats['fastest_laps'], stats['dnfs']
            ))
        
        # Update average positions for all drivers
        cursor.execute("""
            UPDATE drivers
            SET average_position = (
                SELECT AVG(position)
                FROM season_standings
                WHERE season_standings.driver_code = drivers.driver_code
                AND position IS NOT NULL
            )
        """)
        
        conn.commit()
        logger.info(f"✅ Saved {len(driver_stats)} drivers to database")
        
    except Exception as e:
        conn.rollback()
        logger.error(f"❌ Error saving to database: {e}")
        raise
    finally:
        conn.close()


def scrape_multiple_seasons(start_year: int, end_year: int):
    """Scrape multiple seasons"""
    logger.info(f"🏁 Starting scrape from {start_year} to {end_year}")
    
    success_count = 0
    for year in range(start_year, end_year + 1):
        logger.info(f"\n{'='*50}")
        logger.info(f"Processing {year}")
        logger.info(f"{'='*50}")
        
        if scrape_season(year):
            success_count += 1
    
    logger.info(f"\n🎉 Scraping complete! Processed {success_count}/{end_year - start_year + 1} seasons")