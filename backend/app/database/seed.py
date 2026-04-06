import sqlite3
from typing import Optional
from core.config import settings

def add_highlight(driver_code: str, title: str, description: str, 
                  season: Optional[int] = None, category: Optional[str] = None):
    """Add a highlight for a driver"""
    conn = sqlite3.connect(settings.DATABASE_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO driver_highlights (driver_code, season, title, description, category)
        VALUES (?, ?, ?, ?, ?)
    """, (driver_code.upper(), season, title, description, category))
    
    conn.commit()
    conn.close()

def seed_highlights():
    """Add example highlights"""
    highlights = [
        # Max Verstappen
        ("VER", 2021, "Championship Drama", 
         "Secured his first World Championship in a controversial final lap battle with Lewis Hamilton in Abu Dhabi", 
         "Championship"),
        ("VER", 2022, "First Title Defense", 
         "Successfully defended his title with 15 wins, establishing himself as the dominant force", 
         "Championship"),
        ("VER", 2023, "Record-Breaking Season", 
         "Won 19 out of 22 races with the RB19, breaking multiple F1 records including most consecutive wins", 
         "Dominance"),
        
        # Lewis Hamilton
        ("HAM", 2008, "Maiden Championship", 
         "Won his first World Championship by overtaking Glock on the final corner in Brazil", 
         "Championship"),
        ("HAM", 2020, "Seventh Title", 
         "Equaled Michael Schumacher's record of 7 World Championships", 
         "Championship"),
        ("HAM", 2021, "Heartbreak in Abu Dhabi", 
         "Lost the championship on the final lap after leading for most of the race", 
         "Championship"),
        
        # Charles Leclerc
        ("LEC", 2019, "First Wins", 
         "Secured his first F1 victories at Spa and Monza with Ferrari", 
         "Milestone"),
        ("LEC", 2022, "Title Challenge", 
         "Led the championship early with Ferrari before reliability issues cost him", 
         "Performance"),
        
        # Lando Norris
        ("NOR", 2024, "Breaking Through", 
         "Finally secured his maiden F1 victory after years of near-misses", 
         "Milestone"),
    ]
    
    for highlight in highlights:
        add_highlight(*highlight)
    
    print(f"✅ Seeded {len(highlights)} highlights")