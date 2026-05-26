import useSWR from "swr";
import { DriverWetPerformanceType } from "../Types/driverType";

const fetcher = async (url: string): Promise<DriverWetPerformanceType> => {
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error("An error occurred while fetching wet performance.");
    }
    return res.json();
};

export default function useDriverWet(code: string | null | undefined) {
    const url = code
        ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/drivers/${code.toUpperCase()}/wet`
        : null;

    const { data, error, isLoading } = useSWR<DriverWetPerformanceType>(url, fetcher, {
        revalidateOnFocus: false,
    });

    return { data, isLoading, error };
}
