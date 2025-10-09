import fastf1 as ff1
from pathlib import Path
import logging
import numpy as np
from fastf1.events import Event, Session

# Configure logging for visibility
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Enable cache
cache_path = Path("ff1_cache")
cache_path.mkdir(parents=True, exist_ok=True)
ff1.Cache.enable_cache(cache_path)


class F1Service:
    def get_season(self, year: int) -> list[dict]:
        schedule = ff1.get_event_schedule(year, include_testing="true")
        return schedule.to_dict(orient="records")

    def get_dry_baseline(self, event: Event, driver: str) -> float | None:
        """Find a dry practice session and get median lap time for driver."""
        for session_name in ['FP1', 'FP2', 'FP3']:
            try:
                practice = event.get_session(session_name)
                practice.load(laps=True, weather=True)

                rain_series = practice.weather_data.get('Rainfall')
                if rain_series is None or rain_series.empty:
                    logging.warning(f"No weather data for {event.EventName} {session_name}")
                    continue
                if ((rain_series == True) | (rain_series > 0)).any():
                    logging.info(f"{event.EventName} {session_name} was wet, skipping as a baseline.")
                    continue

                driver_laps = practice.laps.pick_driver(driver).pick_quick()
                if not driver_laps.empty():
                    dry_pace = driver_laps['LapTime'].dt.total_seconds().median()
                    logging.info(f"Found dry baseline for {driver} in {session_name}: {dry_pace:.3f}s")
                    return dry_pace

            except Exception as e:
                logging.warning(f"Could not process {session_name} for {event.EventName}: {e}")
                continue

        logging.warning(f"No suitable dry baseline found for {driver} at {event.EventName}")
        return None

    def get_wet_pace(self, race_session: Session, driver: str) -> float | None:
        """Get median wet-lap time (INTERMEDIATE/WET tyres)."""
        driver_wet_laps = (
            race_session.laps.pick_driver(driver)
            .pick_compounds(['INTERMEDIATE', 'WET'])
            .pick_quick()
        )
        if not driver_wet_laps.empty():
            wet_pace = driver_wet_laps['LapTime'].dt.total_seconds().median()
            logging.info(f"Found wet pace for {driver}: {wet_pace:.3f}s")
            return wet_pace

        logging.warning(f"No wet laps found for {driver} in {race_session.event.EventName}")
        return None

    # FIX #1: This function is now correctly indented to be part of the class.
    def calculate_seasonal_wet_performance(self, year: int, include_practice=True):
        logging.info(f"Starting detailed wet performance calculation for the {year} season...")
        schedule = ff1.get_event_schedule(year)
        races = schedule[schedule['EventFormat'] != 'testing']

        driver_deltas = {}
        driver_info = {}

        session_types = ['R', 'Q']
        if include_practice:
            session_types.extend(['FP1', 'FP2', 'FP3'])

        for _, event in races.iterrows():
            for session_type in session_types:
                try:
                    session = event.get_session(session_type)
                    session.load(laps=True, weather=True)

                    rain_series = session.weather_data.get('Rainfall')
                    if rain_series is None or rain_series.empty:
                        continue
                    if not ((rain_series == True) | (rain_series > 0)).any():
                        continue

                    logging.info(f"Wet conditions detected for {event['EventName']} {session_type}")

                    drivers = session.laps['Driver'].unique()
                    for driver in drivers:
                        if driver not in driver_deltas:
                            driver_deltas[driver] = []
                        if driver not in driver_info:
                            d_info = session.get_driver(driver)
                            driver_info[driver] = {
                                'full_name': d_info['FullName'],
                                'team_name': d_info['TeamName']
                            }

                        dry_pace = self.get_dry_baseline(event, driver)
                        wet_pace = self.get_wet_pace(session, driver)

                        if dry_pace is not None and wet_pace is not None:
                            delta = ((wet_pace - dry_pace) / dry_pace) * 100
                            driver_deltas[driver].append({
                                'event_name': f"{event['EventName']} {session_type}",
                                'delta': delta
                            })

                except Exception as e:
                    logging.warning(f"Could not process {event['EventName']} {session_type}: {e}")
                    continue

        # FIX #2: This entire block is now de-indented to run AFTER the loops finish.
        # Aggregate results
        aggregated_results = []
        for driver, data_points in driver_deltas.items():
            if data_points:
                deltas = [dp['delta'] for dp in data_points]
                # Renamed variable for clarity
                sessions_analyzed = [dp['event_name'] for dp in data_points]
                info = driver_info.get(driver, {'full_name': 'N/A', 'team_name': 'N/A'})

                aggregated_results.append({
                    "driver_code": driver,
                    "full_name": info['full_name'],
                    "team_name": info['team_name'],
                    "average_wet_to_dry_delta": round(np.mean(deltas), 2),
                    "races_analyzed_count": len(sessions_analyzed),
                    "races_analyzed_list": sessions_analyzed
                })

        aggregated_results.sort(key=lambda x: x['average_wet_to_dry_delta'])

        # Add rank
        final_ranking_with_rank = []
        for rank, driver_data in enumerate(aggregated_results, 1):
            driver_data['rank'] = rank
            final_ranking_with_rank.append(driver_data)

        return final_ranking_with_rank