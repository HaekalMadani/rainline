"use client"

import useDriverStat from "@/lib/Hooks/useDriverStat"
import { DriverCareerType } from "@/lib/Types/driverType"
import DriverBanner from "@/components/DriverBanner"
import TeamPlate from "@/components/TeamPlate"
import { useMemo, useState } from "react"
import { teamColors } from "@/lib/teamColors"
import Image from "next/image"
import Link from "next/link"

export default function Home() {
    const { data, error, isLoading } = useDriverStat()
    const [selectedDriverName, setSelectedDriverName] = useState("Charles Leclerc")

    const activeDriver = useMemo(() => {
        if (!data) return null
        return data.find((d: DriverCareerType) => d.full_name.toLowerCase() === selectedDriverName.toLowerCase()) || data[0]
    }, [data, selectedDriverName])

    const { teamGroups, legacy, currentSeason } = useMemo(() => {
        if (!data) return { teamGroups: [] as Array<[string, DriverCareerType[]]>, legacy: [] as DriverCareerType[], currentSeason: null as number | null }

        const seasons = data
            .map((d: DriverCareerType) => d.last_season)
            .filter((s: number | null): s is number => typeof s === "number")
        const currentSeason = seasons.length ? Math.max(...seasons) : null

        const active = data.filter((d: DriverCareerType) => d.last_season === currentSeason)
        const legacy = data.filter((d: DriverCareerType) => d.last_season !== currentSeason)

        const grouped = new Map<string, DriverCareerType[]>()
        for (const d of active) {
            const team = d.current_team || "Unknown"
            const arr = grouped.get(team) ?? []
            arr.push(d)
            grouped.set(team, arr)
        }

        const teamGroups = Array.from(grouped.entries()).sort((a, b) => {
            const aPoints = a[1].reduce((sum, d) => sum + (d.total_points ?? 0), 0)
            const bPoints = b[1].reduce((sum, d) => sum + (d.total_points ?? 0), 0)
            return bPoints - aPoints
        })

        return { teamGroups, legacy, currentSeason }
    }, [data])

    if (isLoading) return <p className="p-10 text-center text-black">Loading Grid...</p>
    if (error) return <p className="p-10 text-center text-red-600">Error loading data</p>

    return (
        <div className="flex flex-col min-h-screen bg-[var(--rl-bg-app)]">
            <div className="flex justify-end px-4 py-2">
                <Link href="/playground" className="text-sm font-bold uppercase tracking-wide text-black underline">
                    Playground →
                </Link>
            </div>
            <div className="sticky top-10 z-50">
                <DriverBanner displayDriver={activeDriver} />
            </div>

            <section aria-labelledby="active-heading">
                <SectionHeader id="active-heading" label={currentSeason ? `Active · ${currentSeason}` : "Active"} />

                <div className="grid grid-cols-1 lg:grid-cols-[38rem_38rem] gap-6 px-4 pb-6 justify-center">
                    {teamGroups.map(([teamName, drivers], index) => (
                        <TeamPlate
                            key={teamName}
                            teamName={teamName}
                            drivers={drivers}
                            logoSide={index % 2 === 0 ? "left" : "right"}
                            selectedDriverCode={activeDriver?.driver_code}
                            onSelect={setSelectedDriverName}
                        />
                    ))}
                </div>
            </section>

            {legacy.length > 0 && (
                <section aria-labelledby="legacy-heading">
                    <SectionHeader id="legacy-heading" label="Legacy" />

                    <div className="flex flex-wrap gap-y-8 gap-x-10 justify-center p-4">
                        {legacy.map((driver: DriverCareerType) => {
                            const isSelected = activeDriver?.driver_code === driver.driver_code
                            return (
                                <button
                                    key={driver.driver_code}
                                    type="button"
                                    onClick={() => setSelectedDriverName(driver.full_name)}
                                    aria-pressed={isSelected}
                                    aria-label={`Select ${driver.full_name}`}
                                    className="relative block text-left p-0 border-0 bg-transparent w-full md:w-80 lg:w-60 h-30 cursor-pointer hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
                                >
                                    <div
                                        style={{ background: teamColors[driver?.current_team as keyof typeof teamColors] }}
                                        className={`${isSelected ? "absolute inset-0 translate-y-3 -translate-x-2 z-0" : "hidden"}`}
                                    ></div>
                                    <div className="flex relative bg-[var(--rl-bg-card)] h-full w-full z-10 overflow-hidden">
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
                </section>
            )}
        </div>
    )
}

function SectionHeader({ id, label }: { id?: string; label: string }) {
    return (
        <div className="sticky top-[400px] lg:top-[360px] z-40">
            <div className="flex items-center gap-3 bg-[var(--rl-bg-app)] px-4 py-2 font-orbitron font-extrabold uppercase tracking-[0.2em] text-sm text-black">
                <h2 id={id} className="m-0 text-sm font-extrabold uppercase tracking-[0.2em]">{label}</h2>
                <div className="flex-1 h-px bg-black/20"></div>
            </div>
        </div>
    )
}
