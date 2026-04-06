import useSWR from "swr";
import { DriverCareerType } from "../Types/driverType";

const fetcher = async (url: string): Promise<DriverCareerType[]> => {
    const res = await fetch(url)
    if(!res.ok){
        const error = new Error('An error occurred while fetching the data.');
        throw error
    }

    return res.json();
}

export default function useDriverStat(){
    const APIUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/drivers/`

    const {data, error, isLoading} = useSWR<DriverCareerType[]>(APIUrl, fetcher, {revalidateOnFocus: false})

    return{data, isLoading, error}
}