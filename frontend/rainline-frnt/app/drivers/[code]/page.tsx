import DriverDetailsView from "./DriverDetailsView";

interface PageProps {
    params: Promise<{ code: string }>;
}

export default async function DriverDetailsRoute({ params }: PageProps) {
    const { code } = await params;
    return <DriverDetailsView code={code} />;
}
