"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SelectSeasonProps } from "@/lib/Types/SeasonType";

const seasons = [2021, 2022, 2023, 2024];

export default function SelectSeason({selectedSeason, onSeasonSelect}: SelectSeasonProps) {
    
  const [open, setOpen] = useState(false);


  const handleSelect = (season: number) => {
    onSeasonSelect(season)
    setOpen(false);
  };

  return (
    <div className="w-screen flex justify-center">
      <motion.div
        layout
        className=""
        transition={{ layout: { duration: 0, type: "spring" } }}
      >
        {/* Header / Button */}
        <motion.button
          layout="position"
          className={`w-full text-xl  font-orbitron px-4 py-3 cursor-pointer ${
            open ? "text-gray-500" : "animate-breathe"
          }`}
          onClick={() => setOpen(!open)}
        >
          {selectedSeason ? `${selectedSeason} Season` : "Select Season"}
        </motion.button>

        {/* Expanding Content */}
        <AnimatePresence>
          {open && (
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
                    className="px-6 py-3 font-orbitron border border-[#0048b7] cursor-pointer rounded-s hover:bg-blue-900"
                  >
                    {season}
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
