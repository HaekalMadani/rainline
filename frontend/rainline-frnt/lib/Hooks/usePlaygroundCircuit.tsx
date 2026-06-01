import useSWR from "swr";
import { CircuitGeometry } from "../Types/playgroundType";

const fetcher = async (url: string): Promise<CircuitGeometry> => {
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error("An error occurred while loading the circuit map.");
    }
    return res.json();
};

// Static asset committed under public/playground/ by scripts/derive_bahrain_circuit.py.
// Served same-origin, so no API base URL is needed.
export default function usePlaygroundCircuit() {
    const { data, error, isLoading } = useSWR<CircuitGeometry>(
        "/playground/bahrain-circuit.json",
        fetcher,
        { revalidateOnFocus: false, revalidateIfStale: false },
    );

    return { data, isLoading, error };
}
