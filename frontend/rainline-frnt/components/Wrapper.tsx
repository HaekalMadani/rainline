
"use client";

import { useState } from "react";
import SelectSeason from "@/components/selectSeason";
import DriversTable from "./DriverTable";

export default function SeasonSelectorWrapper() {
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);

  const handleSeasonSelect = (season: number) => {
    setSelectedSeason(season);
  };

  return (
    <div className="flex flex-col w-full gap-5 ">
      <SelectSeason
        selectedSeason={selectedSeason}
        onSeasonSelect={handleSeasonSelect}
      />

      {/* Conditionally render the table when a season is selected */}
      {selectedSeason && <DriversTable season={selectedSeason} />} 
    </div>
  );
}