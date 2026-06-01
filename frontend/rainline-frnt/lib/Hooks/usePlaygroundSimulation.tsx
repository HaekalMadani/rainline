import useSWR from "swr";
import { Selections, SimulationResult } from "../Types/playgroundType";

const fetcher = async (url: string): Promise<SimulationResult> => {
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error("An error occurred while running the simulation.");
    }
    return res.json();
};

// Pass `null` to skip fetching (e.g. before choices/defaults are ready, or in
// challenge mode before a challenge is picked). SWR treats a null key as "don't fetch".
export default function usePlaygroundSimulation(selections: Selections | null) {
    const ready = selections && selections.driver && selections.chassis && selections.engine;
    const url = ready
        ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/playground/lap?driver=${encodeURIComponent(selections.driver)}&chassis=${encodeURIComponent(selections.chassis)}&engine=${encodeURIComponent(selections.engine)}`
        : null;

    const { data, error, isLoading } = useSWR<SimulationResult>(url, fetcher, {
        revalidateOnFocus: false,
        keepPreviousData: true, // avoid flicker while changing slots
    });

    return { data, isLoading, error };
}
