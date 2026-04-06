from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import fastf1
import fastf1.plotting
import json
import os
from pathlib import Path
import numpy as np

app = FastAPI()

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create data directory
DATA_DIR = Path("data")
DATA_DIR.mkdir(exist_ok=True)

# Enable FastF1 cache and plotting
cache_path = Path("ff1_cache")
cache_path.mkdir(parents=True, exist_ok=True)
fastf1.Cache.enable_cache(cache_path)
fastf1.plotting.setup_mpl()

@app.get("/")
def read_root():
    return {"message": "F1 Lap Visualizer API"}

@app.get("/api/telemetry/monza/2023")
def get_monza_2023():
    """
    Fetch telemetry data for Monza 2023 - Verstappen fastest lap
    This is our prototype circuit with proper track layout
    """
    try:
        # Check if data already exists
        filename = "monza_2023_verstappen.json"
        filepath = DATA_DIR / filename
        
        if filepath.exists():
            with open(filepath, 'r') as f:
                return json.load(f)
        
        # Fetch new data
        print("Fetching Monza 2023 data from FastF1...")
        session = fastf1.get_session(2023, 'Monza', 'R')
        session.load()
        
        # Get Verstappen's fastest lap
        ver_laps = session.laps.pick_driver('VER')
        fastest_lap = ver_laps.pick_fastest()
        
        if fastest_lap is None:
            raise HTTPException(status_code=404, detail="No lap data found")
        
        # Get telemetry with all data points
        telemetry = fastest_lap.get_telemetry()
        
        # Get circuit info
        circuit_info = session.get_circuit_info()
        
        # Convert telemetry to list format
        telemetry_list = []
        for idx, row in telemetry.iterrows():
            point = {
                "time": float(row['Time'].total_seconds()),
                "distance": float(row['Distance']),
                "x": float(row['X']),
                "y": float(row['Y']),
                "z": float(row['Z']) if 'Z' in row and not np.isnan(row['Z']) else 0,
                "speed": float(row['Speed']),
                "throttle": float(row['Throttle']),
                "brake": bool(row['Brake']),
                "drs": int(row['DRS']) if 'DRS' in row and not np.isnan(row['DRS']) else 0,
                "gear": int(row['nGear']) if not np.isnan(row['nGear']) else 0,
                "rpm": float(row['RPM']) if 'RPM' in row and not np.isnan(row['RPM']) else 0
            }
            telemetry_list.append(point)
        
        # Prepare complete dataset
        data = {
            "circuit": {
                "name": "Autodromo Nazionale di Monza",
                "location": "Monza, Italy",
                "year": 2023,
                "corners": circuit_info.corners.to_dict('records') if hasattr(circuit_info, 'corners') else []
            },
            "lap": {
                "driver": "Max Verstappen",
                "driver_code": "VER",
                "team": str(fastest_lap['Team']),
                "lap_number": int(fastest_lap['LapNumber']),
                "lap_time": str(fastest_lap['LapTime']),
                "lap_time_seconds": float(fastest_lap['LapTime'].total_seconds()),
                "compound": str(fastest_lap['Compound']) if 'Compound' in fastest_lap else "UNKNOWN"
            },
            "telemetry": telemetry_list,
            "stats": {
                "max_speed": float(telemetry['Speed'].max()),
                "min_speed": float(telemetry['Speed'].min()),
                "avg_speed": float(telemetry['Speed'].mean()),
                "total_distance": float(telemetry['Distance'].max()),
                "data_points": len(telemetry_list)
            }
        }
        
        # Save to file
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)
        
        print(f"Data saved successfully: {len(telemetry_list)} points")
        return data
    
    except Exception as e:
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/available-circuits")
def get_available_circuits():
    """List all available circuit data"""
    files = list(DATA_DIR.glob("*.json"))
    circuits = []
    
    for f in files:
        try:
            with open(f, 'r') as file:
                data = json.load(file)
                circuits.append({
                    "filename": f.stem,
                    "name": data.get("circuit", {}).get("name", "Unknown"),
                    "driver": data.get("lap", {}).get("driver_code", "Unknown"),
                    "year": data.get("circuit", {}).get("year", 0)
                })
        except:
            continue
    
    return {
        "circuits": circuits,
        "count": len(circuits)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)