import useSWR from "swr";
import { DriverCareerStatsType } from "../Types/driverType";

const fetcher = async (url: string): Promise<DriverCareerStatsType> => {
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error('An error occurred while fetching the driver.');
    }
    return res.json();
};

export default function useDriver(code: string | null | undefined) {
    const url = code
        ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/drivers/${code.toUpperCase()}`
        : null;

    const { data, error, isLoading } = useSWR<DriverCareerStatsType>(url, fetcher, {
        revalidateOnFocus: false,
    });

    return { data, isLoading, error };
}
