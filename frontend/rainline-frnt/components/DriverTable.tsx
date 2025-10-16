"use client";
import { useDriverTable } from "@/lib/Hooks/useDriverTable";
import { DriverSeasonPerformance, DriversTableProps } from "@/lib/Types/SeasonType";
import { useEffect, useState } from "react";
import {teamColors} from "@/lib/teamColors.js"
import Image from "next/image";
import { Session } from "inspector/promises";
import { option } from "framer-motion/client";



export default function DriversTable({season}: DriversTableProps){
    const [selectedDriver, setSelectedDriver] = useState<DriverSeasonPerformance | null> (null)
    const [selectedSessionName, setSelectedSessionName] = useState<string | null>(null);
    const{data, isLoading, error} = useDriverTable(season)


    const standings: DriverSeasonPerformance[] = data?.standings || [];

    useEffect(() => {
        if(standings && standings.length > 0){
            const firstRank = standings.find((driver) => driver.rank === 1)
            if(firstRank){setSelectedDriver(firstRank)}
        }
    },[standings])

    useEffect(() => {
        if(selectedDriver && selectedDriver.sessions_analyzed_list.length > 0){
            setSelectedSessionName(selectedDriver.sessions_analyzed_list[0].session_name)
        }else{
            setSelectedSessionName(null);
        }
    }, [selectedDriver])

    const selectedSessionDetails = selectedDriver?.sessions_analyzed_list.find((session) => session.session_name === selectedSessionName)


        if (isLoading) {
        return <p className="mt-10 text-center animate-pulse">Loading {season} Standings...</p>;
    }

        if (error) {
            return <p className="mt-10 text-center text-red-400">Error: Failed to load data.</p>;
        }

        if (!data) {
            return null;
    }

    return(
        <div className="grid grid-cols-5 gap-10 px-15 py-4">
            <div className="col-span-2">
                <h1 className="text-xl font-bold">{season} Wet Performance Standing</h1>

                <div className="bg-black border rounded-md border-gray-800 mt-4 p-2">
                    <div className="sticky top-0 font-orbitron py-2 px-4 text-gray-400">
                        <div className="grid grid-cols-12 gap-2 items-center">
                            <div className="col-span-2">POS</div>
  
                            <div className="col-span-5">DRIVER</div>
                            <div className="col-span-3">DELTA</div>
                            <div className="col-span-2">RATING</div>
                        </div>  
                    </div>

                    <div className="max-h-[600px] overflow-y-auto">
                        {standings.map((driver) => (
                            <div 
                            key={driver.driver_code} 
                            onClick={() => setSelectedDriver(driver)} 
                            className={`py-2 px-4 font-titillium hover:bg-gray-800 cursor-pointer ${selectedDriver?.driver_code === driver.driver_code ? "bg-gray-700 border-l-4 " : ""}`}
                            style={{borderLeftColor: selectedDriver?.driver_code === driver.driver_code ? teamColors[driver.team_name as keyof typeof teamColors] : undefined}}
                            >
                                <div className="grid grid-cols-12 gap-2 items-center">
                                    <div className="col-span-2 text-xl font-bold">{driver.rank}</div>
                                    <div className="col-span-1">
                                        <div style={{background: teamColors[driver.team_name as keyof typeof teamColors]}} className= {`flex items-center h-8 w-8 text-xl rounded-full justify-center font-bold`}>{driver.driver_number}</div>
                                    </div>
                                    <div className="col-span-4 flex flex-col">
                                        <div className="text-lg font-bold">{driver.full_name}</div>
                                        <div className="text-xs text-gray-500">{driver.team_name}</div>
                                    </div>
                                    <div className="col-span-3">{"+" + driver.average_wet_to_dry_delta + "%"}</div>
                                    
                                </div>
                            </div>
                        ))}
                    </div>
                    
                </div>
                
            </div>

            <div className="col-span-3">
                {selectedDriver? (
                    <div className="bg-black h-150 overflow-visible mt-20">
                        <div className="flex bg-black h-[20%] z-10">
                            <div style={{background: teamColors[selectedDriver.team_name as keyof typeof teamColors]}} className="flex gap flex-3 items-center pl-4 gap-2">
                                <Image
                                src={`/teams/${selectedDriver.team_name.replaceAll(' ','-')}.webp`}
                                alt={selectedDriver.team_name}
                                width={100}
                                height={100}/>
                                <div className="flex flex-col justify-center">
                                    <h1 className="font-extrabold text-2xl break-words whitespace-normal">{selectedDriver.full_name}</h1>
                                    <h1 className="">{selectedDriver.team_name}</h1>
                                </div>
                                
                            </div>
                            <div className="flex-1 bg-breen-600 relative">
                                <div style={{background: teamColors[selectedDriver.team_name as keyof typeof teamColors]}} className="flex stats-divider items-center ">
                                    <h1 className="text-9xl font-black">{selectedDriver.driver_number}</h1>
                                </div>
                            </div>
                            <div className="flex-2 relative">
                                <div className="absolute bottom-0 right-0 ">
                                    <Image
                                    src={`/drivers/${selectedDriver.full_name.replaceAll(' ','-')}.webp`}
                                    alt={selectedDriver.full_name}
                                    width={250}
                                    height={250}/> 
                                </div>

                            </div>
                        </div>

                        <div className="flex gap-5 mt-6 p-4">
                            <div className="bg-[#15161e] min-w-min">
                                <select
                                onChange={(e) => setSelectedSessionName(e.target.value)}
                                value={selectedSessionName || ''}
                                className="w-full p-2 bg-gray-900 font-titillium">
                                    
                                    {selectedDriver.sessions_analyzed_list.map((session) => (
                                        <option key={session.session_name} value={session.session_name}>{session.session_name}</option>
                                    ))}

                                </select>

                                {selectedSessionDetails && (
                                    <div className="bg-gray-900/50 p-4">
                                        <div className="flex justify-between items-center  font-titillium ">
                                            <h3 className="font-bold text-gray-400">
                                                Baseline: {selectedSessionDetails.dry_baseline_session_name}
                                            </h3>
                                            <span className={`font-bold text-xl ${selectedSessionDetails.delta_percentage > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                                {selectedSessionDetails.delta_percentage > 0 ? '+' : ''}
                                                {selectedSessionDetails.delta_percentage.toFixed(2)}%
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 mt-4 text-sm font-titillium">
                                            <div>
                                                <p className="font-bold">Dry Pace</p>
                                                <p>
                                                    {selectedSessionDetails.dry_lap_time_median.toFixed(3)}s
                                                    <span className="text-gray-400"> ({selectedSessionDetails.dry_laps_analyzed_count} laps)</span>
                                                </p>
                                            </div>
                                            <div>
                                                <p className="font-bold">Wet Pace ({selectedSessionDetails.wet_compound_used})</p>
                                                <p>
                                                    {selectedSessionDetails.wet_lap_time_median.toFixed(3)}s
                                                    <span className="text-gray-400"> ({selectedSessionDetails.wet_laps_analyzed_count} laps)</span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                    </div>

                ) : (<p className="text-gray-500">Select a driver to view details.</p>)}
            </div>
        </div>
    )

}