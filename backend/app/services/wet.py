import fastf1 as ff1
from pathlib import Path
import logging
import numpy as np
from fastf1.events import Session
from typing import Optional, List, Dict, Any

# Setup logging and cache as before
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
cache_path = Path("ff1_cache")
cache_path.mkdir(parents=True, exist_ok=True)
ff1.Cache.enable_cache(cache_path)


class F1Service:

    def get_season(self, year: int) -> list[dict]:
        """Gets the F1 season schedule for a given year."""
        schedule = ff1.get_event_schedule(year, include_testing=False)
        return schedule.to_dict(orient="records")

    def get_dry_baseline_session(self, year: int, event_name: str) -> Optional[Session]:
        """Finds the first available fully dry practice session to use as a performance baseline."""
        for session_name in ['FP1', 'FP2', 'FP3']:
            try:
                practice_session = ff1.get_session(year, event_name, session_name)
                practice_session.load(laps=True, weather=True, telemetry=False, messages=False)

                rain_series = practice_session.weather_data.get('Rainfall')
                if rain_series is None or rain_series.empty:
                    logging.warning(f"No rainfall data for {event_name} {session_name}")
                    continue

                if not ((rain_series == True) | (rain_series > 0)).any():
                    logging.info(f"Found dry baseline session for {event_name}: {session_name}")
                    return practice_session

            except Exception as e:
                logging.warning(f"Could not process {session_name} for {event_name} to find baseline: {e}")
                continue
        
        logging.warning(f"Could not find any suitable dry baseline session for {event_name}")
        return None

    def calculate_seasonal_wet_performance(self, year: int, include_practice=True) -> List[Dict[str, Any]]:
        """
        Calculates driver performance in wet conditions compared to a dry baseline for a given season.
        """
        logging.info(f"Starting detailed wet performance calculation for the {year} season...")
        schedule = ff1.get_event_schedule(year)
        races = schedule[schedule['EventFormat'] != 'testing'] if 'EventFormat' in schedule.columns else schedule

        driver_session_details = {} # ## Changed: More descriptive name, will store detailed objects
        driver_info = {}

        for _, event in races.iterrows():
            event_name = event['EventName']
            logging.info(f"--- Processing Event: {event_name} ---")

            dry_baseline_session = self.get_dry_baseline_session(year, event_name)
            if not dry_baseline_session:
                logging.warning(f"Skipping {event_name} due to no valid dry baseline.")
                continue

            dry_laps = dry_baseline_session.laps.pick_quicklaps()

            session_types = ['R', 'Q'] 
            if include_practice:
                 session_types.extend(['FP1', 'FP2', 'FP3'])

            for session_type in session_types:
                try:
                    wet_session = ff1.get_session(year, event_name, session_type)
                    wet_session.load(laps=True, weather=True, telemetry=False, messages=False)

                    rain_series = wet_session.weather_data.get('Rainfall')
                    if rain_series is None or not ((rain_series == True) | (rain_series > 0)).any():
                        continue
                    
                    logging.info(f"Wet conditions detected for {event_name} {session_type}. Analyzing driver pace...")
                    
                    wet_laps = (
                        wet_session.laps
                        .pick_compounds(['INTERMEDIATE', 'WET'])
                        .pick_quicklaps()
                    )
                    
                    if wet_laps.empty:
                        continue

                    drivers_in_wet_session = wet_laps['Driver'].unique()
                    for driver in drivers_in_wet_session:
                        driver_dry_laps = dry_laps.pick_driver(driver)
                        if driver_dry_laps.empty:
                            continue
                        
                        dry_pace = driver_dry_laps['LapTime'].dt.total_seconds().median()

                        driver_wet_laps = wet_laps.pick_driver(driver)
                        wet_pace = driver_wet_laps['LapTime'].dt.total_seconds().median()

                        delta = ((wet_pace - dry_pace) / dry_pace) * 100
                        
                        if driver not in driver_session_details:
                            driver_session_details[driver] = []
                            d_info = wet_session.get_driver(driver)
                            # ## Added driver number to the stored info
                            driver_info[driver] = {
                                'full_name': d_info['FullName'], 
                                'team_name': d_info['TeamName'],
                                'driver_number': d_info['DriverNumber']
                            }
                        
                        # ## Changed: Store a detailed dictionary for each session
                        session_detail = {
                            "session_name": f"{event_name} {session_type}",
                            "dry_baseline_session_name": dry_baseline_session.name,
                            "dry_lap_time_median": round(dry_pace, 3),
                            "dry_laps_analyzed_count": len(driver_dry_laps),
                            "wet_lap_time_median": round(wet_pace, 3),
                            "wet_laps_analyzed_count": len(driver_wet_laps),
                            "wet_compound_used": driver_wet_laps['Compound'].mode()[0] if not driver_wet_laps.empty else 'N/A',
                            "delta_percentage": round(delta, 2)
                        }
                        
                        driver_session_details[driver].append(session_detail)
                        logging.info(f"  {driver}: Dry Pace={dry_pace:.3f}s ({len(driver_dry_laps)} laps), Wet Pace={wet_pace:.3f}s ({len(driver_wet_laps)} laps), Delta={delta:+.2f}%")

                except Exception as e:
                    logging.warning(f"Could not process {session_type} for {event_name}: {e}")

        logging.info("--- Aggregating all season results ---")
        aggregated_results = []
        # ## Changed: Loop through the new detailed data structure
        for driver, sessions_list in driver_session_details.items():
            if sessions_list:
                deltas = [dp['delta_percentage'] for dp in sessions_list]
                info = driver_info.get(driver, {'full_name': 'N/A', 'team_name': 'N/A', 'driver_number': 'N/A'})

                # ## Changed: Structure now matches the updated Pydantic model
                aggregated_results.append({
                    "driver_code": driver,
                    "driver_number": info['driver_number'],
                    "full_name": info['full_name'],
                    "team_name": info['team_name'],
                    "average_wet_to_dry_delta": round(np.mean(deltas), 2),
                    "sessions_analyzed_count": len(sessions_list),
                    "sessions_analyzed_list": sessions_list
                })

        aggregated_results.sort(key=lambda x: x['average_wet_to_dry_delta'])

        final_ranking_with_rank = []
        for rank, driver_data in enumerate(aggregated_results, 1):
            driver_data['rank'] = rank
            final_ranking_with_rank.append(driver_data)

        return final_ranking_with_rank