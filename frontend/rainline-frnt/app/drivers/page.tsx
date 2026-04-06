"use client"
import useDriverStat from "@/lib/Hooks/useDriverStat"
import { DriverCareerType } from "@/lib/Types/driverType"
import Image from "next/image";

export default function Drivers() {

    const { data, error, isLoading } = useDriverStat()

    if (isLoading) return <p>Loading...</p>
    if (error) return <p>Error loading data</p>

    return (
        <div className="px-6">
            <div className="flex flex-col py-10">
                <h1 className="text-2xl font-extrabold border-b-2 pb-6">
                    View Driver Career Stats
                </h1>
            </div>

            <div className="grid grid-cols-2 gap-8 gap-x-15">
                {data?.map((driver: DriverCareerType) => (
                    <div 
                        key={driver.driver_code}
                        className="relative flex justify-between items-center rounded-md bg-gray-800 cursor-pointer overflow-hidden"
                    >
                        <h1 className="absolute  right-30 opacity-30 text-[12rem] font-extrabold z-1">{driver.driver_number}</h1>
                        <div className="flex flex-col h-full pt-4 px-4 gap-2">
                             <h2 className="text-md font-bold border-b border-gray-600 pb-4">{driver.full_name} </h2>
                             <div className="flex flex-col">
                                <p className=" font-titillium">Current Driver For</p>
                                <h2 className="text-sm font-bold">{driver.current_team}</h2>  
                                <Image
                                src={`/teams/${driver.current_team.replaceAll(' ', '-')}.webp`}
                                alt=""
                                width={50}
                                height={50}
                                className="px-2 py-2"
                                />
                             </div>
                             
                        </div>
                       

                        <div className="flex justify-end z-3">
                            <Image
                            src={`/drivers/${driver.full_name.replaceAll(' ','-')}.webp`}
                            alt={driver.full_name}
                            width={200}
                            height={200}/> 
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
