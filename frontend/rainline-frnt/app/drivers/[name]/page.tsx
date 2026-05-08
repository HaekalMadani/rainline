import DriverDetail from "./driverDetails"

interface DriverPageProps {
    params: Promise<{ name: string }>
}

export default async function DriverPage({ params }: DriverPageProps) {
    const { name } = await params   

    return <DriverDetail name={name} />
}