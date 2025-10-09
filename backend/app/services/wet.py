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
        # Use boolean True instead of string for include_testing
        schedule = ff1.get_event_schedule(year, include_testing=True)
        return schedule.to_dict(orient="records")

    def get_dry_baseline(self, year: int, event_name: str, driver: str) -> float | None:
        """Find a dry practice session and get median lap time for driver.

        Uses FastF1 to load FP1/FP2/FP3 for the given event name and
        returns the driver's median quick-lap time from the first fully dry session.
        """
        for session_name in ['FP1', 'FP2', 'FP3']:
            try:
                practice = ff1.get_session(year, event_name, session_name)
                practice.load(laps=True, weather=True)

                rain_series = practice.weather_data.get('Rainfall')
                if rain_series is None or rain_series.empty:
                    logging.warning(f"No weather data for {event_name} {session_name}")
                    continue
                if ((rain_series == True) | (rain_series > 0)).any():
                    logging.info(f"{event_name} {session_name} was wet, skipping as a baseline.")
                    continue

                driver_laps = practice.laps.pick_drivers([driver]).pick_quicklaps()
                if not driver_laps.empty:
                    dry_pace = driver_laps['LapTime'].dt.total_seconds().median()
                    logging.info(f"Found dry baseline for {driver} in {session_name}: {dry_pace:.3f}s")
                    return dry_pace

            except Exception as e:
                logging.warning(f"Could not process {session_name} for {event_name}: {e}")
                continue

        logging.warning(f"No suitable dry baseline found for {driver} at {event_name}")
        return None

    def get_wet_pace(self, race_session: Session, driver: str) -> float | None:
        """Get median wet-lap time (INTERMEDIATE/WET tyres)."""
        driver_wet_laps = (
            race_session.laps
            .pick_drivers([driver])
            .pick_compounds(['INTERMEDIATE', 'WET'])
            .pick_quicklaps()
        )
        if not driver_wet_laps.empty:
            wet_pace = driver_wet_laps['LapTime'].dt.total_seconds().median()
            logging.info(f"Found wet pace for {driver}: {wet_pace:.3f}s")
            return wet_pace

        logging.warning(f"No wet laps found for {driver} in {race_session.event.EventName}")
        return None

    # FIX #1: This function is now correctly indented to be part of the class.
    def calculate_seasonal_wet_performance(self, year: int, include_practice=True, only_event_names: list[str] | None = None):
        logging.info(f"Starting detailed wet performance calculation for the {year} season...")
        schedule = ff1.get_event_schedule(year)
        # Exclude testing if present in the schedule (defensive)
        races = schedule
        if 'EventFormat' in schedule.columns:
            races = schedule[schedule['EventFormat'] != 'testing']

        # Optionally limit to specific events by name to reduce API calls
        if only_event_names:
            races = races[races['EventName'].isin(only_event_names)]

        driver_deltas = {}
        driver_info = {}

        session_types = ['R', 'Q']
        if include_practice:
            session_types.extend(['FP1', 'FP2', 'FP3'])

        for _, event_row in races.iterrows():
            event_name = event_row['EventName'] if 'EventName' in event_row else str(event_row.get('OfficialEventName', 'Unknown Event'))
            for session_type in session_types:
                try:
                    # Create session directly from FastF1 using event name
                    session = ff1.get_session(year, event_name, session_type)
                    session.load(laps=True, weather=True)

                    # Determine if session had wet running by either
                    # 1) recorded rainfall, or 2) any laps on INTERMEDIATE/WET compounds
                    had_rain = False
                    rain_series = session.weather_data.get('Rainfall')
                    if rain_series is not None and not rain_series.empty:
                        had_rain = ((rain_series == True) | (rain_series > 0)).any()

                    has_wet_compounds = False
                    if 'Compound' in session.laps.columns:
                        comp = session.laps['Compound'].astype('string')
                        has_wet_compounds = comp.isin(['INTERMEDIATE', 'WET']).any()

                    if not (had_rain or has_wet_compounds):
                        continue

                    logging.info(f"Wet conditions detected for {event_name} {session_type}")

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

                        dry_pace = self.get_dry_baseline(year, event_name, driver)
                        wet_pace = self.get_wet_pace(session, driver)

                        if dry_pace is not None and wet_pace is not None:
                            delta = ((wet_pace - dry_pace) / dry_pace) * 100
                            driver_deltas[driver].append({
                                'event_name': f"{event_name} {session_type}",
                                'delta': delta
                            })

                except Exception as e:
                    logging.warning(f"Could not process {event_name} {session_type}: {e}")
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