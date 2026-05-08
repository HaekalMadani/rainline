"use client"
import useDriverStat from "@/lib/Hooks/useDriverStat"
import { DriverCareerType } from "@/lib/Types/driverType"
import Image from "next/image"
import { teamColors } from "@/lib/teamColors";

export default function DriverDetail({ name }: { name: string }) {
    const { data, error, isLoading } = useDriverStat()

    const driver: DriverCareerType | undefined = data?.find(
        (d: DriverCareerType) =>
            d.full_name.replaceAll(" ", "-").toLowerCase() === name.toLowerCase()
    )

    if (isLoading) return <p>Loading...</p>
    if (error || !driver) return <p>Driver not found</p>

    return (
        <div className="flex flex-col min-h-screen font-orbitron">
            <div className="flex flex-col md:flex-row md:px-20 md:py-5 lg:h-100">
                <div className="w-80 h-100 rounded-t-full border-2w-[310px] h-[310px] rounded-full border-4 overflow-hidden md:border-none lg:rounded-none">
                    <Image src={`/drivers/${driver?.full_name.replaceAll(' ', '-')}.webp`}
                    alt=""
                    width={310}
                    height={310}
                    className="w-full h-full object-cover object-top scale-x-[-1]"/>
                </div>
                <div className="py-5  font-orbitron flex flex-col gap-5">
                    <div className="">
                        <h1 className="font-bold opacity-70">Name</h1>
                        <div className="text-4xl font-extrabold">{driver.full_name}</div>
                    </div>
                    
                    <div className="flex flex-col pl-10 gap-2">
                        <div className="">
                            <h1 className="font-bold opacity-70">Current Team</h1>
                            <div className="text-2xl font-extrabold">{driver.current_team}</div>
                        </div>
                        
                        <div className="">
                            <h1 className="font-bold opacity-70">Place of Birth</h1>
                            <div className="text-2xl font-extrabold">####</div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-6">
                            <div className="">
                                <h1 className="font-bold opacity-70">Date of Birth</h1>
                                <div className="text-2xl font-extrabold">####</div>
                            </div>

                            <div className="">
                                <h1 className="font-bold opacity-70">Career Status</h1>
                                <div className="text-2xl font-extrabold">####</div>
                            </div>
                            
                        </div>

                    </div>
                </div>
                <div className="flex flex-1 justify-center items-center">
                    <div className=" text-transparent font-extrabold text-[350px]"
                        style={{
                            WebkitTextStroke: `4px ${teamColors[driver?.current_team as keyof typeof teamColors]}`
                        }}>
                            {driver?.driver_number}
                    </div>
                </div>
            </div>
        </div>
    )
}