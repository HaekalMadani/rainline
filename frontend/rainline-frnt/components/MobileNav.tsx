"use client";

import { useState } from "react";
import Link from "next/link";

export default function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        className="text-white text-2xl"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Toggle menu"
      >
        {open ? "✕" : "☰"}
      </button>

      <div
        className={`absolute top-13 left-0 w-full bg-[#1A1A1A] overflow-hidden transition-all duration-300 ${
          open ? "max-h-60 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <nav className="flex flex-col px-4 pb-4 gap-4 font-orbitron text-lg">
          <Link href="/" onClick={() => setOpen(false)} className="hover:text-[#0048b7] transition">
            Leaderboard
          </Link>
          <Link href="/drivers" onClick={() => setOpen(false)} className="hover:text-[#0048b7] transition">
            Drivers
          </Link>
          <Link href="/teams" onClick={() => setOpen(false)} className="hover:text-[#0048b7] transition">
            Teams
          </Link>
        </nav>
      </div>
    </div>
  );
}