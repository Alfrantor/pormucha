import { db } from "@/lib/db";
import { FlaskConical, Beaker } from "lucide-react";

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
                    <p className="mt-1 text-xs text-slate-400">Tipo {row.productType} | Tanque: {row.tank_name || "-"}</p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-emerald-700">
                    {row.status === "AVAILABLE" ? "Disponible" : row.status}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  <CardStat label="Litros de entrada" value={entered} />
                  <CardStat label="Litros de salida" value={produced} />
                  <CardStat label="Litros remanentes" value={remaining} />
                  <CardStat label="Diferencia" value={loss} />
                </div>

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
            Este inventario representa bebida base terminada. El siguiente paso natural es conectar su consumo automatico cuando arranque el proceso que la use.
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
