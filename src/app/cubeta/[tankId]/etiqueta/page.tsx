import Link from "next/link";
import { getTankWithProduction } from "@/app/_actions/production";
import { notFound } from "next/navigation";
import { getContainerStatus, getContainerStatusLabel } from "@/lib/container-status";
import { resolvePublicAppUrl } from "@/lib/public-app-url";

export default async function CubetaLabelPage({ params }: { params: Promise<{ tankId: string }> }) {
  const { tankId } = await params;
  const tank = await getTankWithProduction(tankId);

  if (!tank) notFound();

  const activeProd = tank.productions?.[0] || null;
  const status = getContainerStatus(tank, activeProd);
  const publicUrl = resolvePublicAppUrl();
  const cubetaUrl = `${publicUrl}/cubeta/${tank.id}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=420x420&data=${encodeURIComponent(cubetaUrl)}`;

  return (
    <main className="min-h-screen bg-white p-6 text-slate-950 print:p-0">
      <div className="mx-auto max-w-3xl print:max-w-none">
        <div className="mb-6 flex items-center justify-between print:hidden">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Etiqueta imprimible</p>
            <h1 className="mt-2 text-3xl font-black">Cubeta {tank.name}</h1>
          </div>
          <div className="flex gap-3">
            <Link href="/admin/production" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">
              Volver
            </Link>
            <button
              onClick={() => window.print()}
              className="rounded-full bg-slate-950 px-5 py-2 text-sm font-black text-white hover:bg-slate-800"
            >
              Imprimir etiqueta
            </button>
          </div>
        </div>

        <section className="mx-auto grid min-h-[1000px] max-w-[780px] grid-rows-[auto_1fr_auto] rounded-[2rem] border-4 border-slate-950 bg-white p-8 print:min-h-0 print:max-w-none print:rounded-none print:border-0 print:p-0">
          <header className="border-b-2 border-slate-200 pb-6 text-center">
            <p className="text-sm font-black uppercase tracking-[0.45em] text-slate-400">Pormucha Kombucha</p>
            <h2 className="mt-4 text-6xl font-black tracking-tight">CUBETA {String(tank.name).toUpperCase()}</h2>
            <div className="mt-4 flex items-center justify-center gap-3">
              <span className="rounded-full bg-slate-950 px-4 py-2 text-sm font-black uppercase tracking-[0.2em] text-white">
                {getContainerStatusLabel(status)}
              </span>
              {tank.capacityLt != null && (
                <span className="rounded-full border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600">
                  {Number(tank.capacityLt)} Lt
                </span>
              )}
            </div>
          </header>

          <div className="grid items-center gap-8 py-8 md:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-5">
              <div className="rounded-[1.5rem] border-2 border-slate-200 p-5">
                <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">Consulta</p>
                <p className="mt-3 text-lg font-semibold text-slate-900">Escanea este código para ver el estado de la cubeta y su proceso activo.</p>
                <p className="mt-4 break-all text-sm text-slate-500">{cubetaUrl}</p>
              </div>

              <div className="rounded-[1.5rem] border-2 border-slate-200 p-5">
                <p className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400">Proceso actual</p>
                <p className="mt-3 text-2xl font-black text-slate-950">{activeProd?.name || "Sin proceso activo"}</p>
                <p className="mt-2 text-sm text-slate-500">
                  {activeProd ? `Tipo ${activeProd.productType} en curso` : "Disponible para iniciar un nuevo proceso"}
                </p>
              </div>
            </div>

            <div className="flex justify-center">
              <div className="rounded-[2rem] border-2 border-slate-200 bg-white p-6 shadow-sm">
                <img src={qrUrl} alt={`QR de cubeta ${tank.name}`} className="h-[320px] w-[320px]" />
              </div>
            </div>
          </div>

          <footer className="border-t-2 border-slate-200 pt-5 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-400">Etiqueta de identificación operativa</p>
          </footer>
        </section>
      </div>
    </main>
  );
}
