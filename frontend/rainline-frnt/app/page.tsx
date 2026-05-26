"use client"

import useDriverStat from "@/lib/Hooks/useDriverStat"
import { DriverCareerType } from "@/lib/Types/driverType"
import DriverBanner from "@/components/DriverBanner"
import { useMemo, useState } from "react"
import { teamColors } from "@/lib/teamColors"
import Image from "next/image"

export default function Home() {
    const {data, error, isLoading} = useDriverStat()
    const [selectedDriverName, setSelectedDriverName] = useState("Charles Leclerc")

    const activeDriver = useMemo(()=> {
        if (!data) return null

        return data.find((d:DriverCareerType) => d.full_name.toLowerCase() === selectedDriverName.toLowerCase()) || data[0]
    },[data, selectedDriverName])

    if (isLoading) return <p className="p-10 text-center text-black">Loading Grid...</p>
    if (error) return <p className="p-10 text-center text-red-600">Error loading data</p>

    return(
        <div className="flex flex-col min-h-screen bg-[#E1E5EF]">
            <div className="sticky top-10 z-50">
              <DriverBanner displayDriver={activeDriver}/>
            </div>


            <div className="flex flex-col w-full h-10 relative font-titillium pt-2">
                <div className="absolute left-1/2 -translate-x-1/2 top-2 px-4 bg-[#E1E5EF] text-black text-center text-xl font-bold">Driver List</div>
                <div className="h-1/2 w-full border-b-1 border-black"></div>
            </div>

            {/* driver list card */}
            <div className="flex flex-wrap gap-y-8 gap-x-10 justify-center p-4">
                {data?.map((driver: DriverCareerType) => {
                    const isSelected = activeDriver?.driver_code === driver.driver_code;

                    return(
                        <div
                        key={driver.driver_code}
                        onClick={()=>setSelectedDriverName(driver.full_name)}
                        className="relative w-full md:w-80 lg:w-60 h-30 cursor-pointer hover:scale-105">
                            <div style={{background: teamColors[driver?.current_team as keyof typeof teamColors]}} className={`${isSelected ? "absolute inset-0 translate-y-3 -translate-x-2 z-0" : "hidden"}`}></div>
                            <div className="flex relative bg-[#D9D9D9] h-full w-full z-10 overflow-hidden">

                                <div className="relative w-1/2 h-full items-end overflow-hidden">
                                    <Image
                                    src={`/drivers/${driver.full_name.replaceAll(" ", "-")}.webp`}
                                    alt=""
                                    fill
                                    className="object-contain translate-y-5 scale-140 "/>


                                </div>

                                <div className="absolute right-0 bottom-0 whitespace-nowrap text-black font-orbitron">
                                    <div className="text-6xl font-extrabold text-end px-2">{driver.driver_number}</div>
                                    <div className="bg-black text-xl font-extrabold text-[#D9D9D9] px-2">{driver.full_name}</div>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
