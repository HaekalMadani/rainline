"use client";
import { useDriverTable } from "@/lib/Hooks/useDriverTable";
import { DriverSeasonPerformance, DriversTableProps } from "@/lib/Types/SeasonType";
import { useEffect, useState } from "react";
import {teamColors} from "@/lib/teamColors.js"
import Image from "next/image";
import BestSessionShowcase from "./BestSession";



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
                            <div className="col-span-2"></div>
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
                    <div style={{borderBlockColor: teamColors[selectedDriver.team_name as keyof typeof teamColors]}} className="bg-black h-150 overflow-visible mt-20 border-b-6">
                        <div className="flex bg-black h-[20%] z-10">
                            <div style={{background: teamColors[selectedDriver.team_name as keyof typeof teamColors]}} className="flex gap flex-3 items-center pl-4 gap-2">
                                <Image
                                src={`/teams/${selectedDriver.team_name.replaceAll(' ','-')}.webp`}
                                alt={selectedDriver.team_name}
                                width={100}
                                height={100}/>
                                <div className="flex flex-col justify-center">
                                    <h1 className="font-extrabold text-2xl break-words">{selectedDriver.full_name}</h1>
                                    <h1 className="text-gray-300 font-extrabold">{selectedDriver.team_name}</h1>
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

                        <div className="flex flex-col gap-8 mt-2 p-4">
                            <div className="-mb-7 font-titillium bg-gray-700 max-w-max px-2">
                                <p className="font-bold">Session Name ({selectedDriver.sessions_analyzed_count}):</p>
                            </div>
                            <div className="bg-[#15161e] w-[100%] max-h-max">
                                <select
                                onChange={(e) => setSelectedSessionName(e.target.value)}
                                value={selectedSessionName || ''}
                                className="w-full p-2 bg-gray-900 font-titillium">
                                    
                                    {selectedDriver.sessions_analyzed_list.map((session) => (
                                        <option key={session.session_name} value={session.session_name}>{session.session_name}</option>
                                    ))}

                                </select>
                            </div>

                            
                            {selectedSessionDetails && (
                                <div className="flex flex-col gap-10">
                                    <div className="flex gap-10">
                                        <div className="flex flex-1 flex-col justify-center font-titillium bg-gray-900/50 ml-2 py-10 px-2 gap-5 relative">
                                            <div className="max-w-max bg-gray-700 px-2 py-1 absolute top-0 -left-2 -mt-3 ">
                                                <p className="font-bold text-gray-200 text-md">Dry Pace</p>
                                            </div>
                                            <div className="flex gap-1">
                                                <p className="text-4xl text-gray-200">{selectedSessionDetails.dry_lap_time_median}</p> 
                                                <p className="self-end text-xl">s</p>
                                            </div>
                                        
                                        </div>

                                        <div className="flex flex-1 flex-col bg-gray-900/50 font-titillium gap-5 py-10 px-2  relative">
                                            <div className="max-w-max bg-gray-700 px-2 py-1 absolute top-0 -left-2 -mt-3 ">
                                                <p className="font-bold text-gray-200 text-md">Wet Pace</p>
                                            </div>
                                            <div className="flex justify-between">
                                                <div className="flex gap-1">
                                                    <p className="text-4xl text-gray-200 ">{selectedSessionDetails.wet_lap_time_median}</p>
                                                    <p className=" text-xl self-end">s</p>
                                                </div>                
                                                <p className="text-red-400 self-center text-xl font-extrabold">{"+" +selectedSessionDetails.delta_percentage +"%"}</p>
                                            </div>
                                            
                                        </div>
                                    </div>
                                    
                                    {/* Best session showcase */}
                                    <div className="px-2">
                                        <BestSessionShowcase driver={selectedDriver} />
                                    </div>
                                    
                                    

                                    
                                </div>
                            )}
                            <div className="font-orbitron -mt-2 flex justify-center">
                                        <button style={{background: teamColors[selectedDriver.team_name as keyof typeof teamColors]}} className="p-2 font-bold cursor-pointer rounded-sm hover:brightness-80">
                                            View Career Stats
                                        </button>
                                    </div>
                        </div>
                        
                    </div>

                ) : (<p className="text-gray-500">Select a driver to view details.</p>)}
            </div>
        </div>
    )

}