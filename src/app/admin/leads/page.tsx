import { db } from "@/lib/db";
import { deleteLead } from "@/actions/admin-actions";
import { Mail, Trash2, Users } from "lucide-react";

export default async function AdminLeadsPage() {
  const leads = await db.lead.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Web</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Leads</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Aquí centralizamos los prospectos capturados desde la web para que el equipo de ventas pueda darles seguimiento.
        </p>
      </section>

      <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Captura</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Prospectos registrados</h2>
          </div>
          <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
            Total: <span className="font-black text-slate-950">{leads.length}</span>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr className="text-left text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                <th className="px-6 py-4">Nombre</th>
                <th className="px-6 py-4">Correo</th>
                <th className="px-6 py-4">Teléfono</th>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {leads.length > 0 ? (
                leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-slate-950 p-2 text-white">
                          <Users size={14} />
                        </div>
                        <span className="font-bold text-slate-950">{lead.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      <div className="flex items-center gap-2">
                        <Mail size={14} className="text-slate-400" />
                        {lead.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">{lead.phone || "-"}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {new Date(lead.createdAt).toLocaleDateString("es-MX")}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <form action={deleteLead}>
                        <input type="hidden" name="leadId" value={lead.id} />
                        <button
                          className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-rose-700 transition hover:bg-rose-100"
                          type="submit"
                        >
                          <Trash2 size={14} />
                          Eliminar
                        </button>
                      </form>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-6 py-10 text-center text-sm text-slate-500" colSpan={5}>
                    Aún no hay leads capturados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
