import fastf1 as ff1
from pathlib import Path

cache_path = Path("ff1_cache")

cache_path.mkdir(parents=True, exist_ok=True)

ff1.Cache.enable_cache(cache_path)
class F1Service:
    def calculate_seasonal_wet_performance(self, year: int) -> list[dict]:
        """
        The core function for performing the heavy data analysis.
        """
        print(f"--- Performing heavy F1 data analysis for {year} season ---")
        
        # MOCK DATA.
        if year == 2021:
            return [
                {'rank': 1, 'driver_code': 'HAM', 'full_name': 'Lewis Hamilton', 'team_name': 'Mercedes', 'average_wet_to_dry_delta': 107.1, 'races_analyzed_count': 2, 'races_analyzed_list': ['Belgian Grand Prix', 'Russian Grand Prix']},
                {'rank': 2, 'driver_code': 'VER', 'full_name': 'Max Verstappen', 'team_name': 'Red Bull Racing', 'average_wet_to_dry_delta': 107.5, 'races_analyzed_count': 2, 'races_analyzed_list': ['Belgian Grand Prix', 'Russian Grand Prix']},
                {'rank': 3, 'driver_code': 'ALO', 'full_name': 'Fernando Alonso', 'team_name': 'Alpine', 'average_wet_to_dry_delta': 107.9, 'races_analyzed_count': 1, 'races_analyzed_list': ['Russian Grand Prix']},
            ]
        else:
            return []