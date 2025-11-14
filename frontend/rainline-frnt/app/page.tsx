import SeasonSelectorWrapper from "@/components/Wrapper";


export default function Home() {

  return (
    <div className="flex flex-col min-h-screen bg-carbon">

      <div className="">
        <div className="flex flex-col px-15 py-10 justify-center gap-8">
        <h1 className="text-3xl font-extrabold text-center">Rain Performace Leaderboard</h1> 
      </div>

      <div className="flex justify-center w-full">
          <SeasonSelectorWrapper/>
      </div>
    </div>
    </div>
  );
}
