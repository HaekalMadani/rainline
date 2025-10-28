import SeasonSelectorWrapper from "@/components/Wrapper";

export default function Home() {

  return (
    <div className="flex flex-col min-h-screen bg-[#15161e]">
      <div className="w-screen h-20 bg-black sticky content-center border-b border-[#0048b7] pl-15 ">
        <div className="font-extrabold text-2xl flex"><h1 className="text-[#0048b7] ">Rain</h1><h1>Line</h1></div>
      </div>

      <div className="flex px-15 py-10 justify-center">
        <h1 className="text-4xl font-extrabold">F1 Wet Performance Analysis</h1>
      </div>

      <div className="flex justify-center w-full">
        <div className="">
          <SeasonSelectorWrapper/>
        </div>
      </div>
    </div>
  );
}
