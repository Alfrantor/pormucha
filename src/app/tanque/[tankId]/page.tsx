import { getTankWithProduction } from "@/app/_actions/production";
import { notFound } from "next/navigation";
import TanqueView from "@/components/tanque/TanqueView";

export default async function TanquePage({ params }: { params: { tankId: string } }) {
  const { tankId } = await params;
  const tank = await getTankWithProduction(tankId);
  if (!tank) notFound();

  return (
    <div className="min-h-screen bg-gray-50">
      <TanqueView tank={tank} />
    </div>
  );
}
