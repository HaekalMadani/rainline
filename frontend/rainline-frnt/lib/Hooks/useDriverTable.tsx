import useSWR from "swr";
import { SeasonAnalysisResponse } from "../Types/SeasonType";

const fetcher = async (url: string): Promise<SeasonAnalysisResponse> => {
    const res = await fetch(url)
    if(!res.ok){
        const error = new Error('An error occurred while fetching the data.');
        throw error
    }

    return res.json();
}

export function useDriverTable(season: number | null){
    const APIUrl = season ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/season/${season}` : null

    const {data, error, isLoading} = useSWR(APIUrl, fetcher, {revalidateOnFocus: false})

    return{data: data, isLoading: isLoading, error: error}
}