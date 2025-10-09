import json
from pathlib import Path
from services.wet import F1Service 

def run_and_save_analysis(year: int):
    """Runs the analysis for a year and saves the output to a JSON file."""
    print(f"Starting analysis for the {year} season...")
    f1_service = F1Service()
    
    # The results will be saved here
    output_dir = Path("analysis_results")
    output_dir.mkdir(exist_ok=True)
    output_file = output_dir / f"{year}.json"

    try:
        results = f1_service.calculate_seasonal_wet_performance(year)
        if results:
            with open(output_file, 'w') as f:
                json.dump(results, f, indent=2)
            print(f"✅ Successfully saved analysis for {year} to {output_file}")
        else:
            print(f"⚠️ No wet session data found for {year}. No file created.")
    except Exception as e:
        print(f"❌ An error occurred during analysis for {year}: {e}")

if __name__ == '__main__':
    # Define which seasons you want to pre-calculate
    seasons_to_analyze = [2021]
    
    for season in seasons_to_analyze:
        run_and_save_analysis(season)