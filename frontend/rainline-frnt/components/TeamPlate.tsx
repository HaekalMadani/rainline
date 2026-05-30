"use client"

import Image from "next/image"
import { DriverCareerType } from "@/lib/Types/driverType"
import { teamColors } from "@/lib/teamColors"

const TEAMS_WITH_LOGOS = new Set([
    "Williams",
    "McLaren",
    "Mercedes",
    "Ferrari",
    "Red Bull Racing",
    "Aston Martin",
    "Alpine",
    "Alfa Romeo",
])

interface TeamPlateProps {
    teamName: string
    drivers: DriverCareerType[]
    selectedDriverCode: string | undefined
    onSelect: (fullName: string) => void
    logoSide?: "left" | "right"
}

export default function TeamPlate({ teamName, drivers, selectedDriverCode, onSelect, logoSide = "left" }: TeamPlateProps) {
    const teamColor = teamColors[teamName as keyof typeof teamColors] ?? "#1e1e21"
    const hasLogo = TEAMS_WITH_LOGOS.has(teamName)
    const logoSrc = `/teams/${teamName.replaceAll(" ", "-")}.webp`

    const logoSpine = (
        <div className="relative w-24 shrink-0 flex items-center justify-center">
            {hasLogo && (
                <Image src={logoSrc} alt="" width={75} height={75} className="object-cover" />
            )}
        </div>
    )

    return (
        <div style={{ background: teamColor }} className="flex w-full lg:w-[38rem]">
            {logoSide === "left" && logoSpine}
            <div className="flex-1 flex flex-col gap-1 p-2 min-w-0">
                {/* plate header */}
                <div className="flex items-center gap-3 p-1">
                    <div className="font-orbitron font-extrabold uppercase tracking-[0.2em] text-[var(--rl-fg-on-dark)] text-base lg:text-lg">
                        {teamName}
                    </div>
                </div>

                {/* driver cards */}
                <div className="flex flex-wrap justify-between">
                    {drivers.map((driver) => {
                        const isSelected = driver.driver_code === selectedDriverCode
                        return (
                            <button
                                key={driver.driver_code}
                                type="button"
                                onClick={() => onSelect(driver.full_name)}
                                aria-pressed={isSelected}
                                aria-label={`Select ${driver.full_name}`}
                                className={`relative block text-left p-0 border-0 bg-transparent w-full md:w-80 lg:w-60 h-30 cursor-pointer hover:scale-105 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${isSelected ? "ring-2 ring-white" : ""}`}
                            >
                                <div className="flex relative bg-[var(--rl-bg-card)] h-full w-full overflow-hidden">
                                    <div className="relative w-1/2 h-full items-end overflow-hidden">
                                        <Image
                                            src={`/drivers/${driver.full_name.replaceAll(" ", "-")}.webp`}
                                            alt=""
                                            fill
                                            sizes="(min-width: 1024px) 120px, (min-width: 768px) 160px, 50vw"
                                            className="object-contain translate-y-5 scale-140"
                                        />
                                    </div>
                                    <div className="absolute right-0 bottom-0 whitespace-nowrap text-black font-orbitron">
                                        <div className="text-6xl font-extrabold text-end px-2">{driver.driver_number}</div>
                                        <div className="bg-black text-xl font-extrabold text-[var(--rl-bg-card)] px-2">{driver.full_name}</div>
                                    </div>
                                </div>
                            </button>
                        )
                    })}
                </div>
            </div>
            {logoSide === "right" && logoSpine}
        </div>
    )
}
