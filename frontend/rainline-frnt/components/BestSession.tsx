"use client";
import { DriverSeasonPerformance } from "@/lib/Types/SeasonType";

interface BestSessionShowcaseProps {
  driver: DriverSeasonPerformance;
}

export default function BestSessionShowcase({ driver }: BestSessionShowcaseProps) {
  if (!driver || driver.sessions_analyzed_list.length === 0) return null;

  const bestSession = driver.sessions_analyzed_list.reduce(
    (best, current) => (current.delta_percentage < best.delta_percentage ? current : best),
    driver.sessions_analyzed_list[0]
  );

  return (
    <div className="flex flex-col font-titillium gap-5 relative bg-gray-900/50 p-4 rounded-md mt-4">
      <div className="max-w-max bg-gray-700 px-2 py-1 absolute top-0 -left-2 -mt-3">
        <p className="font-bold text-gray-200 text-md">Best Wet Performance</p>
      </div>

      <div className="flex flex-col gap-3 mt-3">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold">{bestSession.session_name}</h2>
          <p className="text-green-400 font-bold text-xl">
            {"+" + bestSession.delta_percentage + "%"}
          </p>
        </div>

        <div className="flex gap-8 text-gray-300">
          <div className="flex flex-col">
            <span className="text-sm text-gray-400">Dry Lap Median</span>
            <span className="text-2xl font-bold">
              {bestSession.dry_lap_time_median}s
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm text-gray-400">Wet Lap Median</span>
            <span className="text-2xl font-bold">
              {bestSession.wet_lap_time_median}s
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm text-gray-400">Wet Compound</span>
            <span className="text-2xl font-bold">
              {bestSession.wet_compound_used || "N/A"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
