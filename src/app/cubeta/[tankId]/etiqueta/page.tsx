import Link from "next/link";
import { getTankWithProduction } from "@/app/_actions/production";
import { notFound } from "next/navigation";
import { resolvePublicAppUrl } from "@/lib/public-app-url";
import PrintLabelButton from "@/components/production/PrintLabelButton";

export default async function CubetaLabelPage({ params }: { params: Promise<{ tankId: string }> }) {
  const { tankId } = await params;
  const tank = await getTankWithProduction(tankId);

  if (!tank) notFound();

  const publicUrl = resolvePublicAppUrl();
  const cubetaUrl = `${publicUrl}/cubeta/${tank.id}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=420x420&data=${encodeURIComponent(cubetaUrl)}`;

  return (
    <main className="min-h-screen bg-white p-6 text-slate-950 print:min-h-0 print:p-0">
      <div className="mx-auto max-w-2xl print:max-w-none">
        <div className="mb-6 flex items-center justify-between print:hidden">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Etiqueta imprimible</p>
            <h1 className="mt-2 text-3xl font-black">Cubeta {tank.name}</h1>
          </div>
          <div className="flex gap-3">
            <Link href="/admin/production" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">
              Volver
            </Link>
            <PrintLabelButton />
          </div>
        </div>

        <section className="mx-auto flex min-h-[820px] max-w-[620px] flex-col items-center justify-center rounded-[2rem] border-4 border-slate-950 bg-white p-10 print:min-h-0 print:max-w-none print:rounded-none print:border-0 print:p-0">
          <p className="text-sm font-black uppercase tracking-[0.45em] text-slate-400">Pormucha Kombucha</p>
          <h2 className="mt-5 text-center text-6xl font-black tracking-tight text-slate-950">
            CUBETA {String(tank.name).toUpperCase()}
          </h2>
          <div className="mt-10 rounded-[2rem] border-2 border-slate-200 bg-white p-6">
            <img src={qrUrl} alt={`QR de cubeta ${tank.name}`} className="h-[360px] w-[360px]" />
          </div>
        </section>
      </div>
    </main>
  );
}
