import useSWR from "swr";
import { MethodologyPayload } from "../Types/playgroundType";

const fetcher = async (url: string): Promise<MethodologyPayload> => {
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error("An error occurred while fetching methodology.");
    }
    return res.json();
};

// `enabled` defers the fetch until the methodology disclosure is opened.
export default function usePlaygroundMethodology(enabled: boolean = true) {
    const url = enabled
        ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/playground/methodology`
        : null;

    const { data, error, isLoading } = useSWR<MethodologyPayload>(url, fetcher, {
        revalidateOnFocus: false,
    });

    return { data, isLoading, error };
}
