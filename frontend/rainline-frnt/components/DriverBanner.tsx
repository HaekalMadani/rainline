"use client"
import { DriverCareerType } from "@/lib/Types/driverType"
import Image from "next/image";
import { teamColors } from "@/lib/teamColors";
import AnimatedNumber from "./AnimatedCount";
import { useRouter  } from "next/navigation";

interface DriverBannerProps {
    displayDriver: DriverCareerType | null;
}

export default function DriverBanner({displayDriver}: DriverBannerProps){
    const router = useRouter()

    if(!displayDriver) return <div className="min-h-80 bg-[#D9D9D9]"></div>

    return(
        <div className="flex flex-col lg:flex-row min-h-90 relative min-w-screen lg:min-h-80 bg-[#D9D9D9] font-orbitron text-black overflow-hidden">
            {/* center image */}
            <div className="absolute w-[240px] md:w-[280px] lg:w-[310px] left-1/2 -translate-x-1/2 lg:translate-x-0 lg:left-[30%] bottom-0 z-10">
                <Image src={`/drivers/${displayDriver?.full_name.replaceAll(' ', '-')}.webp`}
                alt=""
                width={310}
                height={310}
                className="w-full h-auto opacity-80 lg:opacity-100 object-contain"/>
            </div>
            <div className="absolute -bottom-20 md:-bottom-10 lg:bottom-0 left-2/3 -translate-x-1/2 lg:translate-x-0 lg:left-[25%] z-9 h-full w-[90%] lg:w-[50%] pointer-events-none">
                <Image src={`/drivers/alt/${displayDriver?.full_name.replaceAll(' ', '-')}-alts.webp`}
                alt=""
                fill
                className="w-full h-auto opacity-40 lg:opacity-100 object-contain brightness-25"/>
            </div>
            {/* div split #1 */}
            <div className="flex-1 flex items-start lg:items-end justify-center lg:justify-start pt-12 lg:pt-0 ">
                <div className="w-[90%] lg:w-80 h-auto lg:h-[50%] flex items-center justify-center lg:justify-start relative py-4 lg:py-0e">
                    <div className="absolute top-[-25px] lg:top-0 right-0 font-bold text-sm lg:text-base">Flag</div>
                    <div className="hidden lg:block absolute -mt-42.5 text-transparent font-extrabold text-[300px] z-0 opacity-35"
                    style={{
                        WebkitTextStroke: `4px ${teamColors[displayDriver?.current_team as keyof typeof teamColors]}`
                    }}>
                        {displayDriver?.driver_code}
                    </div>
                    <div className="px-10 font-extrabold text-3xl md:text-4xl lg:text-5xl text-center z-10 w-full lg:w-auto uppercase tracking-wider">{displayDriver?.full_name}</div>
                    <div style={{background: teamColors[displayDriver?.current_team as keyof typeof teamColors]}} className="absolute bottom-0 w-full h-2 lg:h-3"></div>
                </div>
            </div>

            {/* div split #2 */}
            <div className="flex-1 relative flex flex-col justify-end lg:block pb-8 lg:pb-0">
                <div className="relative lg:absolute lg:right-40 lg:bottom-10 z-10 flex flex-col px-2 lg:px-0 items-start lg:items-center mt-auto z-10">
                    <div className="tabular-nums text-8xl md:text-9xl lg:text-[200px] font-extrabold text-center leading-none text-black drop-shadow-md lg:drop-shadow-none"><AnimatedNumber value={Number(displayDriver?.driver_number)} /></div>
                    <div className="font-orbitron flex justify-center mt-2 lg:mt-0">
                                <button 
                                onClick= {() => router.push(`/drivers/${displayDriver.full_name.replaceAll(' ', '-').toLowerCase()}`)}
                                style={{background: teamColors[displayDriver?.current_team as keyof typeof teamColors]}} className="py-3 px-8 lg:py-2 lg:px-4 font-bold cursor-pointer rounded-sm hover:brightness-80 transition-all text-white">
                                    Driver Details
                                </button>
                    </div>
                </div>
                
                <div style={{background: teamColors[displayDriver?.current_team as keyof typeof teamColors]}} className="hidden lg:block absolute top-10 left-0 w-[70%] h-32 z-0"></div>
               
            </div>
        </div>
    )
}