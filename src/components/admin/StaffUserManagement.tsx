"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { KeyRound, Pencil, Plus, Search, UserRoundCheck, UserRoundX, X } from "lucide-react";
import { toast } from "sonner";
import { createStaffUser, updateStaffUser } from "@/app/_actions/staff-users";

type StaffUser = {
  id: string;
  clerkUserId: string | null;
  fullName: string;
  email: string | null;
  role: string;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

type ActiveTab = "active" | "inactive" | "admins" | "production" | "cashier";
type ModalState = { mode: "create" } | { mode: "edit"; user: StaffUser } | null;

type FormState = {
  fullName: string;
  email: string;
  role: string;
  status: string;
  notes: string;
};

const ROLE_OPTIONS = [
  { value: "admin", label: "Administrador", access: "Acceso admin completo" },
  { value: "vendedor", label: "Vendedor", access: "Acceso admin operativo" },
  { value: "caja", label: "Caja", access: "Rol interno POS" },
  { value: "produccion", label: "Producción", access: "Rol interno producción" },
  { value: "inventario", label: "Inventario", access: "Rol interno inventario" },
  { value: "soporte", label: "Soporte", access: "Rol interno soporte" },
];

const STATUS_OPTIONS = [
  { value: "ACTIVO", label: "Activo" },
  { value: "INACTIVO", label: "Inactivo" },
];

const EMPTY_FORM: FormState = {
  fullName: "",
  email: "",
  role: "vendedor",
  status: "ACTIVO",
  notes: "",
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function roleLabel(role: string) {
  return ROLE_OPTIONS.find((option) => option.value === role)?.label || role;
}

function roleAccess(role: string) {
  return ROLE_OPTIONS.find((option) => option.value === role)?.access || "Rol interno";
}

function hasAdminAccess(role: string) {
  return role === "admin" || role === "vendedor";
}

export default function StaffUserManagement({ users }: { users: StaffUser[] }) {
  const [items, setItems] = useState(users);
  const [activeTab, setActiveTab] = useState<ActiveTab>("active");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<ModalState>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const activeUsers = useMemo(() => items.filter((user) => user.status !== "INACTIVO"), [items]);
  const inactiveUsers = useMemo(() => items.filter((user) => user.status === "INACTIVO"), [items]);
  const adminUsers = useMemo(() => items.filter((user) => user.status !== "INACTIVO" && user.role === "admin"), [items]);
  const productionUsers = useMemo(() => items.filter((user) => user.status !== "INACTIVO" && user.role === "produccion"), [items]);
  const cashierUsers = useMemo(() => items.filter((user) => user.status !== "INACTIVO" && user.role === "caja"), [items]);

  const filtered = useMemo(() => {
    const base =
      activeTab === "inactive"
        ? inactiveUsers
        : activeTab === "admins"
          ? adminUsers
          : activeTab === "production"
            ? productionUsers
            : activeTab === "cashier"
              ? cashierUsers
              : activeUsers;
    const query = normalize(search);

    return base.filter((user) => {
      if (!query) return true;
      return normalize(`${user.fullName} ${user.email || ""} ${user.role} ${user.status}`).includes(query);
    });
  }, [activeTab, activeUsers, adminUsers, cashierUsers, inactiveUsers, productionUsers, search]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setModal({ mode: "create" });
  };

  const openEdit = (user: StaffUser) => {
    setForm({
      fullName: user.fullName,
      email: user.email || "",
      role: user.role,
      status: user.status,
      notes: user.notes || "",
    });
    setModal({ mode: "edit", user });
  };

  const closeModal = () => {
    setModal(null);
    setSaving(false);
  };

  const buildFormData = (payload: FormState, id?: string) => {
    const formData = new FormData();
    if (id) formData.set("id", id);
    formData.set("fullName", payload.fullName.trim());
    formData.set("email", payload.email.trim());
    formData.set("role", payload.role);
    formData.set("status", payload.status);
    formData.set("notes", payload.notes.trim());
    return formData;
  };

  const handleSave = async () => {
    if (!form.fullName.trim()) {
      toast.error("El nombre completo es obligatorio.");
      return;
    }

    setSaving(true);
    try {
      if (modal?.mode === "edit") {
        await updateStaffUser(buildFormData(form, modal.user.id));
        setItems((current) =>
          current.map((user) =>
            user.id === modal.user.id
              ? {
                  ...user,
                  fullName: form.fullName.trim(),
                  email: form.email.trim() || null,
                  role: form.role,
                  status: form.status,
                  notes: form.notes.trim() || null,
                }
              : user,
          ),
        );
        toast.success("Usuario actualizado.");
      } else {
        const result = await createStaffUser(buildFormData(form));
        setItems((current) => [
          {
            id: result.id,
            clerkUserId: null,
            fullName: form.fullName.trim(),
            email: form.email.trim() || null,
            role: form.role,
            status: form.status,
            notes: form.notes.trim() || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          ...current,
        ]);
        toast.success("Usuario creado.");
      }
      closeModal();
    } catch (error: any) {
      toast.error(error.message || "No se pudo guardar el usuario.");
      setSaving(false);
    }
  };

  const handleDeactivate = async (user: StaffUser) => {
    const nextStatus = user.status === "INACTIVO" ? "ACTIVO" : "INACTIVO";
    const formData = buildFormData(
      {
        fullName: user.fullName,
        email: user.email || "",
        role: user.role,
        status: nextStatus,
        notes: user.notes || "",
      },
      user.id,
    );

    try {
      await updateStaffUser(formData);
      setItems((current) => current.map((item) => (item.id === user.id ? { ...item, status: nextStatus } : item)));
      toast.success(nextStatus === "INACTIVO" ? "Usuario desactivado." : "Usuario reactivado.");
    } catch (error: any) {
      toast.error(error.message || "No se pudo cambiar el estatus.");
    }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Equipo interno</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Usuarios</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Administra staff del ERP. Los usuarios con Clerk pueden iniciar sesión; los manuales sirven como registro interno.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-white transition hover:bg-slate-800"
          >
            <Plus size={14} />
            Nuevo usuario
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <TabButton active={activeTab === "active"} onClick={() => setActiveTab("active")} label={`Activos (${activeUsers.length})`} />
            <TabButton active={activeTab === "inactive"} onClick={() => setActiveTab("inactive")} label={`Inactivos (${inactiveUsers.length})`} />
            <TabButton active={activeTab === "admins"} onClick={() => setActiveTab("admins")} label={`Admins (${adminUsers.length})`} />
            <TabButton active={activeTab === "production"} onClick={() => setActiveTab("production")} label={`Producción (${productionUsers.length})`} />
            <TabButton active={activeTab === "cashier"} onClick={() => setActiveTab("cashier")} label={`Caja (${cashierUsers.length})`} />
          </div>
          <div className="relative w-full lg:max-w-sm">
            <Search className="absolute left-4 top-3.5 text-slate-400" size={16} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar usuario, correo o rol..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-semibold text-slate-950 outline-none transition focus:border-slate-400 focus:bg-white"
            />
          </div>
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-slate-950 p-3 text-white">
              <KeyRound size={16} />
            </div>
            <div>
              <p className="font-black text-slate-950">PIN NFC / producción</p>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                Cada usuario configura su PIN en esta misma pantalla. El PIN queda ligado al perfil de Clerk del usuario actual.
              </p>
            </div>
          </div>
          <a href="#pin-nfc-produccion" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-slate-700 transition hover:bg-slate-100">
            Ir al PIN
          </a>
        </div>
      </section>

      <section className="overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white shadow-sm">
        <div className="hidden grid-cols-[1.2fr_1.1fr_0.75fr_0.8fr_0.95fr] gap-4 bg-slate-50 px-5 py-4 text-[10px] font-black uppercase tracking-[0.28em] text-slate-400 lg:grid">
          <div>Usuario</div>
          <div>Correo</div>
          <div>Rol</div>
          <div>Acceso</div>
          <div className="text-right">Acción</div>
        </div>

        <div className="divide-y divide-slate-100">
          {filtered.length > 0 ? (
            filtered.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                onEdit={() => openEdit(user)}
                onDeactivate={() => handleDeactivate(user)}
              />
            ))
          ) : (
            <div className="px-5 py-16 text-center">
              <p className="font-black text-slate-950">No encontré usuarios con ese filtro.</p>
              <p className="mt-1 text-sm font-semibold text-slate-400">Puedes cambiar de pestaña, buscar otra palabra o crear uno nuevo.</p>
            </div>
          )}
        </div>
      </section>

      {modal ? (
        <UserModal
          modal={modal}
          form={form}
          saving={saving}
          setForm={setForm}
          onClose={closeModal}
          onSave={handleSave}
        />
      ) : null}
    </div>
  );
}

function TabButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.16em] transition ${
        active ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-950"
      }`}
    >
      {label}
    </button>
  );
}

function UserRow({ user, onEdit, onDeactivate }: { user: StaffUser; onEdit: () => void; onDeactivate: () => void }) {
  const isInactive = user.status === "INACTIVO";

  return (
    <div className="grid gap-3 px-5 py-4 text-sm lg:grid-cols-[1.2fr_1.1fr_0.75fr_0.8fr_0.95fr] lg:items-center lg:gap-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-black text-slate-950">{user.fullName}</p>
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${isInactive ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
            {isInactive ? "Inactivo" : "Activo"}
          </span>
        </div>
        <p className="mt-1 text-xs font-semibold text-slate-400">
          Creado {new Date(user.createdAt).toLocaleDateString("es-MX")}
        </p>
      </div>
      <MobileLabel label="Correo" value={user.email || "Sin correo"} />
      <MobileLabel label="Rol" value={roleLabel(user.role)} />
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 lg:hidden">Acceso</p>
        <div className="flex flex-wrap gap-1.5">
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${user.clerkUserId ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-500"}`}>
            {user.clerkUserId ? "Clerk" : "Manual ERP"}
          </span>
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${hasAdminAccess(user.role) ? "bg-blue-50 text-blue-700" : "bg-stone-100 text-stone-600"}`}>
            {roleAccess(user.role)}
          </span>
        </div>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white transition hover:bg-slate-800"
        >
          <Pencil size={13} />
          Editar
        </button>
        <button
          type="button"
          onClick={onDeactivate}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black transition ${
            isInactive ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-rose-50 text-rose-700 hover:bg-rose-100"
          }`}
        >
          {isInactive ? <UserRoundCheck size={13} /> : <UserRoundX size={13} />}
          {isInactive ? "Activar" : "Desactivar"}
        </button>
      </div>
    </div>
  );
}

function MobileLabel({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 lg:hidden">{label}</p>
      <p className="font-bold text-slate-700">{value}</p>
    </div>
  );
}

function UserModal({
  modal,
  form,
  saving,
  setForm,
  onClose,
  onSave,
}: {
  modal: Exclude<ModalState, null>;
  form: FormState;
  saving: boolean;
  setForm: Dispatch<SetStateAction<FormState>>;
  onClose: () => void;
  onSave: () => void;
}) {
  const isEdit = modal.mode === "edit";
  const hasClerk = isEdit && Boolean(modal.user.clerkUserId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[1.8rem] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">{isEdit ? "Edición" : "Alta"}</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
              {isEdit ? "Editar usuario" : "Nuevo usuario"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {hasClerk ? "Este usuario tiene acceso real por Clerk." : "Este registro queda como usuario interno/manual del ERP."}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-950">
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">Nombre completo</span>
              <input
                value={form.fullName}
                onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
                placeholder="Ej. Jaime Ruiz"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-950 outline-none focus:border-slate-400"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">Correo</span>
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="correo@empresa.com"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-950 outline-none focus:border-slate-400"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">Rol</span>
              <select
                value={form.role}
                onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-950 outline-none focus:border-slate-400"
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs font-semibold text-slate-400">{roleAccess(form.role)}</p>
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">Estatus</span>
              <select
                value={form.status}
                onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-950 outline-none focus:border-slate-400"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">Notas</span>
              <textarea
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                rows={3}
                placeholder="Notas internas, turno, permisos esperados o comentarios."
                className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-950 outline-none focus:border-slate-400"
              />
            </label>
          </div>

          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
            Hoy el acceso a `/admin` lo permite el sistema sólo para roles `admin` y `vendedor` en Clerk. Los demás roles quedan como clasificación interna hasta que definamos permisos finos por módulo.
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center">
            <button type="button" onClick={onClose} className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50">
              Cancelar
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="flex-1 rounded-full bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear usuario"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
