from typing import List, Optional
from app.core.database import get_db
from app.schemas.drivers import DriverHighlight, CreateHighlight

class HighlightService:
    @staticmethod
    def get_driver_highlights(driver_code: str, category: Optional[str] = None) -> List[DriverHighlight]:
        """Get highlights for a driver"""
        driver_code = driver_code.upper()
        
        with get_db() as conn:
            cursor = conn.cursor()
            
            if category:
                cursor.execute("""
                    SELECT id, season, title, description, category
                    FROM driver_highlights
                    WHERE driver_code = ? AND category = ?
                    ORDER BY season DESC, id DESC
                """, (driver_code, category))
            else:
                cursor.execute("""
                    SELECT id, season, title, description, category
                    FROM driver_highlights
                    WHERE driver_code = ?
                    ORDER BY season DESC, id DESC
                """, (driver_code,))
            
            return [
                DriverHighlight(
                    id=row["id"],
                    season=row["season"],
                    title=row["title"],
                    description=row["description"],
                    category=row["category"]
                )
                for row in cursor.fetchall()
            ]
    
    @staticmethod
    def create_highlight(driver_code: str, highlight: CreateHighlight) -> DriverHighlight:
        """Create a new highlight"""
        driver_code = driver_code.upper()
        
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO driver_highlights (driver_code, season, title, description, category)
                VALUES (?, ?, ?, ?, ?)
            """, (driver_code, highlight.season, highlight.title, 
                  highlight.description, highlight.category))
            
            highlight_id = cursor.lastrowid
            
            return DriverHighlight(
                id=highlight_id,
                season=highlight.season,
                title=highlight.title,
                description=highlight.description,
                category=highlight.category
            )
    
    @staticmethod
    def delete_highlight(highlight_id: int) -> bool:
        """Delete a highlight"""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM driver_highlights WHERE id = ?", (highlight_id,))
            return cursor.rowcount > 0
