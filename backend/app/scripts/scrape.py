
import sys
from pathlib import Path
import argparse

sys.path.insert(0, str(Path(__file__).parent.parent))

from scraper_utils import scrape_season, scrape_multiple_seasons
from scrape_f1_data import ensure_database_exists


def main():
    parser = argparse.ArgumentParser(description='Quick F1 data scraper')
    parser.add_argument('--year', type=int, help='Scrape a single year')
    parser.add_argument('--years', type=str, help='Scrape year range (e.g., 2020-2024)')
    parser.add_argument('--recent', action='store_true', help='Scrape recent years (2020-2024)')
    parser.add_argument('--all', action='store_true', help='Scrape all years (2010-2024)')
    parser.add_argument('--force', action='store_true', help='Re-scrape years that already have data')

    args = parser.parse_args()

    # Ensure database exists
    ensure_database_exists()

    if args.year:
        print(f"🏁 Scraping {args.year}...")
        scrape_season(args.year, force=args.force)

    elif args.years:
        try:
            start, end = map(int, args.years.split('-'))
            print(f"🏁 Scraping {start} to {end}...")
            scrape_multiple_seasons(start, end, force=args.force)
        except ValueError:
            print("❌ Invalid format. Use: --years 2020-2024")
            sys.exit(1)

    elif args.recent:
        print("🏁 Scraping recent seasons (2020-2024)...")
        scrape_multiple_seasons(2020, 2024, force=args.force)

    elif args.all:
        print("🏁 Scraping all seasons (2010-2024)...")
        scrape_multiple_seasons(2010, 2024, force=args.force)

    else:
        # Default: scrape recent years
        print("🏁 Scraping recent seasons (2020-2024)...")
        print("💡 Tip: Use --help to see all options")
        scrape_multiple_seasons(2020, 2024, force=args.force)


if __name__ == "__main__":
    main()