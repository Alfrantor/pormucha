import { db } from "@/lib/db";
import { FlaskConical, Beaker } from "lucide-react";
import { emptyBaseBeverageContainer, updateBaseBeverageInventoryDisposition } from "@/app/_actions/production";

export default async function BaseBeverageInventoryPage() {
  const rows = await db.$queryRawUnsafe<any[]>(`
    SELECT
      bbi.*,
      t.id AS tank_id_ref,
      t.name AS tank_name,
      p.id AS production_id_ref,
      p.name AS production_name
    FROM "BaseBeverageInventory" bbi
    LEFT JOIN "Tank" t ON t.id = bbi."tankId"
    LEFT JOIN "Production" p ON p.id = bbi."productionId"
    ORDER BY bbi."createdAt" DESC
  `).catch(() => []);

  const totalProduced = rows.reduce((sum: number, row: any) => sum + Number(row.litersProduced || 0), 0);
  const totalRemaining = rows.reduce((sum: number, row: any) => sum + Number(row.litersRemaining || 0), 0);

  return (
    <div className="space-y-6">
      <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Inventario</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Inventario de bebida base</h1>
        <p className="mt-2 text-sm text-slate-500">Aqui queda registrado lo que entro al proceso, lo que salio y lo que quedo por cada lote completado.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Metric label="Lotes disponibles" value={rows.length} />
        <Metric label="Litros producidos" value={totalProduced} unit="Lt" />
        <Metric label="Litros remanentes" value={totalRemaining} unit="Lt" />
      </section>

      <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <FlaskConical size={18} className="text-slate-500" />
          <h2 className="text-xl font-black text-slate-950">Lotes de bebida base</h2>
        </div>

        <div className="mt-5 space-y-4">
          {rows.length === 0 && (
            <div className="rounded-2xl bg-slate-50 p-6 text-sm text-slate-500">
              Aun no hay bebida base en inventario. Los lotes entran aqui cuando la produccion se marca como completada.
            </div>
          )}

          {rows.map((row: any) => {
            const entered = row.litersEntered != null ? Number(row.litersEntered) : null;
            const produced = Number(row.litersProduced || 0);
            const remaining = row.litersRemaining != null ? Number(row.litersRemaining) : null;
            const loss = entered != null ? Math.max(entered - produced, 0) : null;

            return (
              <div key={row.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-black text-slate-950">{row.production_name || "Lote sin referencia"}</p>
                    <p className="mt-1 text-xs text-slate-400">Tipo {row.productType} | Cubeta: {row.tank_name || "-"}</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] ${
                      row.status === "HELD"
                        ? "bg-amber-100 text-amber-700"
                        : row.status === "MIX_PENDING"
                          ? "bg-violet-100 text-violet-700"
                          : row.status === "DISPATCHED"
                            ? "bg-sky-100 text-sky-700"
                        : row.status === "AVAILABLE"
                          ? "bg-emerald-100 text-emerald-700"
                          : row.status === "EMPTIED"
                            ? "bg-slate-200 text-slate-600"
                            : "bg-slate-100 text-slate-600"
                    }`}>
                      {row.status === "HELD"
                        ? "En cubeta"
                        : row.status === "MIX_PENDING"
                          ? "Listo para unificar"
                          : row.status === "DISPATCHED"
                            ? "Con salida"
                            : row.status === "AVAILABLE"
                              ? "Disponible"
                              : row.status === "EMPTIED"
                                ? "Cubeta vaciada"
                                : row.status}
                    </span>
                    {remaining != null && remaining > 0 && row.status !== "MIX_PENDING" && row.status !== "EMPTIED" && (
                      <form action={async () => {
                        "use server";
                        await updateBaseBeverageInventoryDisposition(row.id, "MIX_PENDING");
                      }}>
                        <button className="rounded-full bg-violet-600 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-violet-500">
                          Marcar para unificar
                        </button>
                      </form>
                    )}
                    {remaining != null && remaining > 0 && row.status !== "AVAILABLE" && row.status !== "EMPTIED" && (
                      <form action={async () => {
                        "use server";
                        await updateBaseBeverageInventoryDisposition(row.id, "AVAILABLE");
                      }}>
                        <button className="rounded-full bg-emerald-600 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-emerald-500">
                          Mantener disponible
                        </button>
                      </form>
                    )}
                    {remaining != null && remaining > 0 && row.status !== "DISPATCHED" && row.status !== "EMPTIED" && (
                      <form action={async () => {
                        "use server";
                        await updateBaseBeverageInventoryDisposition(row.id, "DISPATCHED");
                      }}>
                        <button className="rounded-full bg-sky-600 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-sky-500">
                          Marcar con salida
                        </button>
                      </form>
                    )}
                    {["HELD", "MIX_PENDING", "DISPATCHED", "AVAILABLE"].includes(String(row.status)) && (
                      <form action={async () => {
                        "use server";
                        await emptyBaseBeverageContainer(row.id);
                      }}>
                        <button className="rounded-full bg-slate-950 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-slate-800">
                          Vaciar cubeta
                        </button>
                      </form>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  <CardStat label="Litros de entrada" value={entered} />
                  <CardStat label="Litros de salida" value={produced} />
                  <CardStat label="Litros remanentes" value={remaining} />
                  <CardStat label="Diferencia" value={loss} />
                </div>

                {remaining != null && remaining > 0 && row.status !== "EMPTIED" && (
                  <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                    Quedan <span className="font-black">{remaining.toLocaleString("es-MX")} Lt</span> utilizables para un nuevo proceso, unificacion o embotellado.
                  </div>
                )}

                {row.notes && <p className="mt-4 text-sm text-slate-500">{row.notes}</p>}
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-[1.8rem] border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <Beaker size={16} className="text-slate-500" />
          <p>
            Este inventario representa bebida base terminada. Desde aqui puedes decidir despues si un lote se mantiene, se unifica o se prepara para salida sin perder el control del remanente.
          </p>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, unit = "" }: { label: string; value: number; unit?: string }) {
  return (
    <div className="rounded-[1.4rem] border border-slate-200 bg-slate-950 p-5 text-white shadow-lg">
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/65">{label}</p>
      <p className="mt-3 text-3xl font-black">
        {value.toLocaleString("es-MX")}
        {unit ? ` ${unit}` : ""}
      </p>
    </div>
  );
}

function CardStat({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-xl bg-white px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">{label}</p>
      <p className="mt-2 text-xl font-black text-slate-950">{value != null ? `${value.toLocaleString("es-MX")} Lt` : "-"}</p>
    </div>
  );
}
