"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { SelectSeasonProps } from "@/lib/Types/SeasonType";

const seasons = [2021, 2022, 2023, 2024];

export default function SelectSeason({ selectedSeason, onSeasonSelect }: SelectSeasonProps) {
  const [openSeason, setOpenSeason] = useState<number | null>(selectedSeason ?? null);

  const handleSelect = (season: number) => {
    onSeasonSelect(season);
    setOpenSeason(season);
  };

  return (
    <div className="w-screen flex justify-center">
      <div>
        <motion.div
          key="content"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="flex"
        >
          <ul className="flex gap-10">
            {seasons.map((season) => (
              <li
                key={season}
                onClick={() => handleSelect(season)}
                className={`px-6 py-3 font-orbitron border border-[#0048b7] bg-black cursor-pointer rounded-s hover:bg-blue-900 ${
                  openSeason === season ? "bg-blue-900" : ""
                }`}
              >
                {season}
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </div>
  );
}
