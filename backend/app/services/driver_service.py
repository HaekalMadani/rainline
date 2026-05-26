from typing import List, Optional
from app.core.database import get_db
from app.schemas.drivers import DriverCareerStats, DriverSummary, SeasonStats

class DriverService:
    @staticmethod
    def get_all_drivers(sort_by: str = "driver_code") -> List[DriverSummary]:
        """Get all drivers with summary statistics"""
        valid_sorts = ["driver_code", "full_name", "average_position", "total_seasons", "driver_number", "current_team", "total_wins", "total_points"]
        if sort_by not in valid_sorts:
            sort_by = "driver_code"

        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(f"""
                SELECT driver_code, full_name, average_position, total_seasons,
                       driver_number, current_team,
                       date_of_birth, nationality, country_code,
                       total_wins, total_points
                FROM drivers
                ORDER BY {sort_by}
            """)

            return [
                DriverSummary(
                    driver_code=row["driver_code"],
                    full_name=row["full_name"],
                    average_position=row["average_position"],
                    total_seasons=row["total_seasons"],
                    driver_number=row["driver_number"],
                    current_team=row["current_team"],
                    date_of_birth=row["date_of_birth"],
                    nationality=row["nationality"],
                    country_code=row["country_code"],
                    total_wins=row["total_wins"] or 0,
                    total_points=row["total_points"] or 0,
                )
                for row in cursor.fetchall()
            ]
    
    @staticmethod
    def get_driver_by_code(driver_code: str) -> Optional[DriverCareerStats]:
        """Get complete driver data"""
        driver_code = driver_code.upper()
        
        with get_db() as conn:
            cursor = conn.cursor()
            
            # Get driver basic info
            cursor.execute("""
                SELECT driver_code, full_name, average_position, total_seasons,
                       driver_number, current_team,
                       date_of_birth, nationality, country_code,
                       total_wins, total_points
                FROM drivers
                WHERE driver_code = ?
            """, (driver_code,))

            driver_row = cursor.fetchone()
            if not driver_row:
                return None
            
            # Get team history
            cursor.execute("""
                SELECT season, team_name
                FROM team_history
                WHERE driver_code = ?
                ORDER BY season
            """, (driver_code,))
            
            team_history = {row["season"]: row["team_name"] for row in cursor.fetchall()}
            
            # Get season standings
            cursor.execute("""
                SELECT season, position, points, wins, podiums, 
                       pole_positions, fastest_laps, dnfs
                FROM season_standings
                WHERE driver_code = ?
                ORDER BY season
            """, (driver_code,))
            
            seasons_standings = {}
            for row in cursor.fetchall():
                seasons_standings[row["season"]] = SeasonStats(
                    position=row["position"],
                    points=row["points"],
                    wins=row["wins"],
                    podiums=row["podiums"],
                    pole_positions=row["pole_positions"],
                    fastest_laps=row["fastest_laps"],
                    dnfs=row["dnfs"]
                )
            
            # Get highlights (using HighlightService)
            from app.services.highlight_service import HighlightService
            highlights = HighlightService.get_driver_highlights(driver_code)
            
            return DriverCareerStats(
                driver_code=driver_row["driver_code"],
                full_name=driver_row["full_name"],
                average_position=driver_row["average_position"],
                total_seasons=driver_row["total_seasons"],
                driver_number=driver_row["driver_number"],
                current_team=driver_row["current_team"],
                date_of_birth=driver_row["date_of_birth"],
                nationality=driver_row["nationality"],
                country_code=driver_row["country_code"],
                total_wins=driver_row["total_wins"] or 0,
                total_points=driver_row["total_points"] or 0,
                team_history=team_history,
                seasons_standings=seasons_standings,
                highlights=highlights,
            )
    
    @staticmethod
    def get_drivers_by_season(season: int) -> List[DriverSummary]:
        """Get all drivers from a specific season"""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT d.driver_code, d.full_name, d.average_position, d.total_seasons,
                       d.driver_number, d.current_team,
                       d.date_of_birth, d.nationality, d.country_code,
                       d.total_wins, d.total_points
                FROM drivers d
                JOIN season_standings ss ON d.driver_code = ss.driver_code
                WHERE ss.season = ?
                ORDER BY ss.position
            """, (season,))

            return [
                DriverSummary(
                    driver_code=row["driver_code"],
                    full_name=row["full_name"],
                    average_position=row["average_position"],
                    total_seasons=row["total_seasons"],
                    driver_number=row["driver_number"],
                    current_team=row["current_team"],
                    date_of_birth=row["date_of_birth"],
                    nationality=row["nationality"],
                    country_code=row["country_code"],
                    total_wins=row["total_wins"] or 0,
                    total_points=row["total_points"] or 0,
                )
                for row in cursor.fetchall()
            ]

    @staticmethod
    def get_drivers_by_team(team_name: str) -> List[DriverSummary]:
        """Get all drivers who have driven for a team"""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT DISTINCT d.driver_code, d.full_name, d.average_position, d.total_seasons,
                       d.driver_number, d.current_team,
                       d.date_of_birth, d.nationality, d.country_code,
                       d.total_wins, d.total_points
                FROM drivers d
                JOIN team_history th ON d.driver_code = th.driver_code
                WHERE th.team_name LIKE ?
                ORDER BY d.driver_code
            """, (f"%{team_name}%",))

            return [
                DriverSummary(
                    driver_code=row["driver_code"],
                    full_name=row["full_name"],
                    average_position=row["average_position"],
                    total_seasons=row["total_seasons"],
                    driver_number=row["driver_number"],
                    current_team=row["current_team"],
                    date_of_birth=row["date_of_birth"],
                    nationality=row["nationality"],
                    country_code=row["country_code"],
                    total_wins=row["total_wins"] or 0,
                    total_points=row["total_points"] or 0,
                )
                for row in cursor.fetchall()
            ]
    
    @staticmethod
    def driver_exists(driver_code: str) -> bool:
        """Check if a driver exists"""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT 1 FROM drivers WHERE driver_code = ?", (driver_code.upper(),))
            return cursor.fetchone() is not None