import useSWR from "swr";
import { ChoicesPayload } from "../Types/playgroundType";

const fetcher = async (url: string): Promise<ChoicesPayload> => {
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error("An error occurred while fetching playground choices.");
    }
    return res.json();
};

export default function usePlaygroundChoices() {
    const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/playground/choices`;

    const { data, error, isLoading } = useSWR<ChoicesPayload>(url, fetcher, {
        revalidateOnFocus: false,
    });

    return { data, isLoading, error };
}
