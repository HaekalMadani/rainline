from pathlib import Path
import logging
import fastf1 as ff1
import pandas as p

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
cache_path = Path("ff1_cache")
cache_path.mkdir(parents=True, exist_ok=True)
ff1.Cache.enable_cache(cache_path)

session = ff1.get_session(2024, 'Monza', 'R')
session.load()

goat = session.laps.pick_drivers('LEC').pick_fastest()
data = goat.get_car_data()

print(data[0])
