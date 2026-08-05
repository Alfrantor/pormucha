import { createStaffUser, deleteStaffUser, updateStaffUser } from "@/app/_actions/staff-users";

type StaffUser = {
  id: string;
  fullName: string;
  email: string | null;
  role: string;
  status: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const ROLE_OPTIONS = [
  { value: "admin", label: "Administrador" },
  { value: "ventas", label: "Ventas" },
  { value: "caja", label: "Caja" },
  { value: "inventario", label: "Inventario" },
  { value: "produccion", label: "Producción" },
  { value: "soporte", label: "Soporte" },
];

const STATUS_OPTIONS = [
  { value: "ACTIVO", label: "Activo" },
  { value: "INACTIVO", label: "Inactivo" },
];

export default function StaffUserManagement({ users }: { users: StaffUser[] }) {
  return (
    <div className="space-y-6">
      <section className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Alta rápida</p>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">Nuevo usuario interno</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Crea personal del ERP sin pasar por Clerk. Aquí viven los usuarios del equipo, no los clientes.
          </p>

          <form action={createStaffUser} className="mt-6 space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Nombre completo</label>
              <input
                name="fullName"
                placeholder="Ej. Jaime Ruiz"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition focus:border-slate-400 focus:bg-white"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Correo opcional</label>
              <input
                name="email"
                type="email"
                placeholder="correo@empresa.com"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition focus:border-slate-400 focus:bg-white"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Rol</label>
                <select
                  name="role"
                  defaultValue="ventas"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition focus:border-slate-400 focus:bg-white"
                >
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Estatus</label>
                <select
                  name="status"
                  defaultValue="ACTIVO"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition focus:border-slate-400 focus:bg-white"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Notas</label>
              <textarea
                name="notes"
                rows={3}
                placeholder="Opcional"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition focus:border-slate-400 focus:bg-white"
              />
            </div>
            <button className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black uppercase tracking-[0.25em] text-white transition hover:bg-slate-800">
              Guardar usuario
            </button>
          </form>
        </div>

        <div className="rounded-[1.8rem] border border-dashed border-slate-200 bg-slate-50 p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Reglas</p>
          <h3 className="mt-3 text-xl font-black tracking-tight text-slate-950">Sólo usuarios internos</h3>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
            <li>• No se muestran clientes aquí.</li>
            <li>• No necesitas crear el usuario en Clerk para usarlo en el ERP.</li>
            <li>• Si quieres, luego podemos agregar PIN, permisos por módulo y bitácora de accesos.</li>
          </ul>
        </div>
      </section>

      <section className="rounded-[1.8rem] border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Equipo interno</p>
            <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">Usuarios registrados</h2>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-[0.25em] text-slate-500">
            {users.length} usuarios
          </span>
        </div>

        {users.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-500">
            Todavía no hay usuarios internos. Crea el primero en el panel superior.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">
                <tr>
                  <th className="px-6 py-4">Nombre</th>
                  <th className="px-6 py-4">Correo</th>
                  <th className="px-6 py-4">Rol</th>
                  <th className="px-6 py-4">Estatus</th>
                  <th className="px-6 py-4">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr key={user.id} className="align-top">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-950">{user.fullName}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        Creado {new Date(user.createdAt).toLocaleDateString("es-MX")}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{user.email || "Sin correo"}</td>
                    <td className="px-6 py-4">
                      <form action={updateStaffUser} className="flex items-center gap-2">
                        <input type="hidden" name="id" value={user.id} />
                        <input type="hidden" name="notes" value={user.notes || ""} />
                        <select
                          name="role"
                          defaultValue={user.role}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium outline-none"
                        >
                          {ROLE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <button className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-white">
                          Guardar
                        </button>
                      </form>
                    </td>
                    <td className="px-6 py-4">
                      <form action={updateStaffUser} className="flex items-center gap-2">
                        <input type="hidden" name="id" value={user.id} />
                        <input type="hidden" name="notes" value={user.notes || ""} />
                        <select
                          name="status"
                          defaultValue={user.status}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium outline-none"
                        >
                          {STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <button className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-white">
                          Guardar
                        </button>
                      </form>
                    </td>
                    <td className="px-6 py-4">
                      <form action={deleteStaffUser}>
                        <input type="hidden" name="id" value={user.id} />
                        <button className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-rose-700 hover:bg-rose-100">
                          Eliminar
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
