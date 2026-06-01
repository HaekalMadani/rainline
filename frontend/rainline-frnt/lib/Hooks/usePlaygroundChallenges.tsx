import useSWR from "swr";
import { Challenge } from "../Types/playgroundType";

const fetcher = async (url: string): Promise<Challenge[]> => {
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error("An error occurred while fetching challenges.");
    }
    return res.json();
};

// `enabled` defers the fetch until challenge mode is opened (spec §9.3).
export default function usePlaygroundChallenges(enabled: boolean = true) {
    const url = enabled
        ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/playground/challenges`
        : null;

    const { data, error, isLoading } = useSWR<Challenge[]>(url, fetcher, {
        revalidateOnFocus: false,
    });

    return { data, isLoading, error };
}
