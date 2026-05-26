import sys
from pathlib import Path
import sqlite3

# Add parent directory to path to import from database
sys.path.insert(0, str(Path(__file__).parent.parent))

from scraper_utils import (
    scrape_season,
    scrape_multiple_seasons,
    DB_PATH
)

# Initialize database if it doesn't exist
def ensure_database_exists():
    """Create database tables if they don't exist"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create tables (same as database/models.py)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS drivers (
            driver_code TEXT PRIMARY KEY,
            driver_number INTEGER NOT NULL,
            current_team TEXT NOT NULL,
            full_name TEXT NOT NULL,
            average_position REAL,
            total_seasons INTEGER DEFAULT 0,
            date_of_birth TEXT,
            nationality TEXT,
            country_code TEXT,
            total_wins INTEGER DEFAULT 0,
            total_points REAL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Migrate existing drivers tables that pre-date the bio/totals columns
    cursor.execute("PRAGMA table_info(drivers)")
    existing_cols = {row[1] for row in cursor.fetchall()}
    for col, definition in (
        ("date_of_birth", "TEXT"),
        ("nationality", "TEXT"),
        ("country_code", "TEXT"),
        ("total_wins", "INTEGER DEFAULT 0"),
        ("total_points", "REAL DEFAULT 0"),
    ):
        if col not in existing_cols:
            cursor.execute(f"ALTER TABLE drivers ADD COLUMN {col} {definition}")
    
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
    
    # Create indexes
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_team_history_driver ON team_history(driver_code)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_standings_driver ON season_standings(driver_code)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_standings_season ON season_standings(season)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_highlights_driver ON driver_highlights(driver_code)")
    
    conn.commit()
    conn.close()
    print("✅ Database initialized")


def main():
    print("\n" + "="*60)
    print("F1 Data Scraper - FastF1 (Standalone)")
    print("="*60)
    
    # Ensure database exists
    print("\n🗄️  Checking database...")
    ensure_database_exists()
    
    while True:
        print("\n" + "-"*60)
        print("Options:")
        print("1. Scrape a single season")
        print("2. Scrape multiple seasons")
        print("3. Scrape recent seasons (2020-2024)")
        print("4. Scrape modern era (2014-2024) - Hybrid era")
        print("5. Scrape historical data (2010-2024)")
        print("6. Exit")
        print("-"*60)
        
        choice = input("\nEnter choice (1-6): ").strip()
        
        if choice == "1":
            year = input("Enter year (e.g., 2024): ").strip()
            try:
                year = int(year)
                if year < 1950 or year > 2030:
                    print("❌ Year must be between 1950 and 2030")
                    continue
                
                if scrape_season(year):
                    print(f"\n✅ Successfully scraped {year}")
                else:
                    print(f"\n❌ Failed to scrape {year}")
            except ValueError:
                print("❌ Invalid year")
        
        elif choice == "2":
            start = input("Start year (e.g., 2020): ").strip()
            end = input("End year (e.g., 2024): ").strip()
            try:
                start_year = int(start)
                end_year = int(end)
                
                if start_year < 1950 or end_year > 2030:
                    print("❌ Years must be between 1950 and 2030")
                    continue
                
                if start_year > end_year:
                    print("❌ Start year must be <= end year")
                    continue
                
                scrape_multiple_seasons(start_year, end_year)
            except ValueError:
                print("❌ Invalid years")
        
        elif choice == "3":
            print("\n🏎️  Scraping recent seasons (2020-2024)...")
            print("⏱️  Estimated time: 2-3 minutes")
            confirm = input("Continue? (y/n): ").strip().lower()
            if confirm == 'y':
                scrape_multiple_seasons(2020, 2024)
        
        elif choice == "4":
            print("\n🏎️  Scraping hybrid era (2014-2024)...")
            print("⏱️  Estimated time: 4-5 minutes")
            confirm = input("Continue? (y/n): ").strip().lower()
            if confirm == 'y':
                scrape_multiple_seasons(2014, 2024)
        
        elif choice == "5":
            print("\n🏎️  Scraping historical data (2010-2024)...")
            print("⏱️  Estimated time: 6-8 minutes")
            confirm = input("Continue? (y/n): ").strip().lower()
            if confirm == 'y':
                scrape_multiple_seasons(2010, 2024)
        
        elif choice == "6":
            print("\n👋 Goodbye!")
            break
        
        else:
            print("❌ Invalid choice")


if __name__ == "__main__":
    main()