"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Ban, Check, Eye, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { cancelTransfer, createTransfer, receiveTransfer } from "@/actions/admin-actions";
import { NoScrollNumberInput } from "@/components/NoScrollNumberInput";

type LocationOption = {
  id: string;
  name: string;
  isDefault?: boolean;
};

type FlavorOption = {
  id: string;
  name: string;
  slug?: string;
  locationStocks?: Array<{
    locationId: string;
    quantity: number;
  }>;
};

type TransferItem = {
  id: string;
  status: string;
  quantitySent: number;
  quantityReceived?: number | null;
  senderEmail?: string | null;
  receiverEmail?: string | null;
  observations?: string | null;
  createdAt: string;
  updatedAt: string;
  flavor?: FlavorOption | null;
  fromLocation?: LocationOption | null;
  toLocation?: LocationOption | null;
};

type ActiveTab = "PENDING" | "COMPLETED" | "SHORT" | "CANCELLED" | "ALL";

type CreateForm = {
  flavorId: string;
  fromLocationId: string;
  toLocationId: string;
  quantitySent: string;
  observations: string;
};

type ReceiveForm = {
  quantityReceived: string;
  observations: string;
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function getTransferCode(transfer: TransferItem) {
  return `TR-${transfer.id.slice(-6).toUpperCase()}`;
}

function getStockFor(flavor?: FlavorOption | null, locationId?: string) {
  if (!flavor || !locationId) return 0;
  return Number(flavor.locationStocks?.find((stock) => stock.locationId === locationId)?.quantity || 0);
}

function statusLabel(status: string) {
  if (status === "PENDING") return "En tránsito";
  if (status === "COMPLETED") return "Recibido";
  if (status === "CANCELLED") return "Cancelado";
  return status;
}

function statusClass(status: string, isShort = false) {
  if (status === "PENDING") return "bg-amber-50 text-amber-700";
  if (status === "CANCELLED") return "bg-rose-50 text-rose-700";
  if (isShort) return "bg-orange-50 text-orange-700";
  return "bg-emerald-50 text-emerald-700";
}

export function TabEnvios({ activeFlavors, activeLocations, transfers, userEmail }: any) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<ActiveTab>("PENDING");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailTransfer, setDetailTransfer] = useState<TransferItem | null>(null);
  const [receiveTransferItem, setReceiveTransferItem] = useState<TransferItem | null>(null);
  const [cancelTransferItem, setCancelTransferItem] = useState<TransferItem | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const safeFlavors = (activeFlavors || []) as FlavorOption[];
  const safeLocations = (activeLocations || []) as LocationOption[];
  const safeTransfers = (transfers || []) as TransferItem[];

  const [createForm, setCreateForm] = useState<CreateForm>({
    flavorId: safeFlavors[0]?.id || "",
    fromLocationId: safeLocations[0]?.id || "",
    toLocationId: safeLocations.find((location) => location.id !== safeLocations[0]?.id)?.id || "",
    quantitySent: "",
    observations: "",
  });
  const [receiveForm, setReceiveForm] = useState<ReceiveForm>({ quantityReceived: "", observations: "" });

  const pendingCount = safeTransfers.filter((transfer) => transfer.status === "PENDING").length;
  const completedCount = safeTransfers.filter((transfer) => transfer.status === "COMPLETED").length;
  const shortCount = safeTransfers.filter(
    (transfer) => transfer.status === "COMPLETED" && Number(transfer.quantityReceived || 0) < Number(transfer.quantitySent || 0),
  ).length;
  const cancelledCount = safeTransfers.filter((transfer) => transfer.status === "CANCELLED").length;

  const selectedCreateFlavor = safeFlavors.find((flavor) => flavor.id === createForm.flavorId) || null;
  const availableInOrigin = getStockFor(selectedCreateFlavor, createForm.fromLocationId);

  const filteredTransfers = useMemo(() => {
    const query = normalize(search);
    return safeTransfers.filter((transfer) => {
      const isShort = transfer.status === "COMPLETED" && Number(transfer.quantityReceived || 0) < Number(transfer.quantitySent || 0);
      const matchesTab =
        activeTab === "ALL" ||
        transfer.status === activeTab ||
        (activeTab === "SHORT" && isShort);
      const text = normalize(
        `${getTransferCode(transfer)} ${transfer.flavor?.name || ""} ${transfer.fromLocation?.name || ""} ${transfer.toLocation?.name || ""} ${transfer.senderEmail || ""} ${transfer.receiverEmail || ""}`,
      );
      return matchesTab && (!query || text.includes(query));
    });
  }, [activeTab, safeTransfers, search]);

  const openReceiveModal = (transfer: TransferItem) => {
    setReceiveForm({ quantityReceived: String(transfer.quantitySent), observations: "" });
    setReceiveTransferItem(transfer);
  };

  const refreshAfterAction = (message: string) => {
    toast.success(message);
    startTransition(() => router.refresh());
  };

  const handleCreate = async () => {
    const quantity = Number(createForm.quantitySent);
    if (!createForm.flavorId || !createForm.fromLocationId || !createForm.toLocationId) {
      toast.error("Selecciona producto, origen y destino.");
      return;
    }
    if (createForm.fromLocationId === createForm.toLocationId) {
      toast.error("El origen y destino no pueden ser el mismo almacén.");
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error("La cantidad debe ser mayor a cero.");
      return;
    }
    if (quantity > availableInOrigin) {
      toast.error(`No hay suficiente stock en origen. Disponibles: ${availableInOrigin} pzas.`);
      return;
    }

    const formData = new FormData();
    formData.set("flavorId", createForm.flavorId);
    formData.set("fromLocationId", createForm.fromLocationId);
    formData.set("toLocationId", createForm.toLocationId);
    formData.set("quantitySent", createForm.quantitySent);
    formData.set("senderEmail", userEmail || "");
    formData.set("observations", createForm.observations);

    const result = await createTransfer(formData);
    if (!result?.success) {
      toast.error(result?.error || "No se pudo crear el traspaso.");
      return;
    }

    setCreateOpen(false);
    setCreateForm((current) => ({ ...current, quantitySent: "", observations: "" }));
    refreshAfterAction("Traspaso creado y descontado del origen.");
  };

  const handleReceive = async () => {
    if (!receiveTransferItem) return;
    const quantity = Number(receiveForm.quantityReceived);
    if (!Number.isFinite(quantity) || quantity < 0 || quantity > receiveTransferItem.quantitySent) {
      toast.error("La cantidad recibida debe estar entre 0 y lo enviado.");
      return;
    }

    const formData = new FormData();
    formData.set("transferId", receiveTransferItem.id);
    formData.set("quantityReceived", receiveForm.quantityReceived);
    formData.set("receiverEmail", userEmail || "");
    formData.set("observations", receiveForm.observations);

    const result = await receiveTransfer(formData);
    if (!result?.success) {
      toast.error(result?.error || "No se pudo recibir el traspaso.");
      return;
    }

    setReceiveTransferItem(null);
    refreshAfterAction(quantity < receiveTransferItem.quantitySent ? "Traspaso recibido con merma registrada." : "Traspaso recibido completo.");
  };

  const handleCancel = async () => {
    if (!cancelTransferItem) return;
    if (!cancelReason.trim()) {
      toast.error("Escribe el motivo de cancelación.");
      return;
    }

    const formData = new FormData();
    formData.set("transferId", cancelTransferItem.id);
    formData.set("userEmail", userEmail || "");
    formData.set("reason", cancelReason);

    const result = await cancelTransfer(formData);
    if (!result?.success) {
      toast.error(result?.error || "No se pudo cancelar el traspaso.");
      return;
    }

    setCancelTransferItem(null);
    setCancelReason("");
    refreshAfterAction("Traspaso cancelado y stock devuelto al origen.");
  };

  return (
    <div className="space-y-5">
      <section className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Movimientos entre almacenes</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Traspasos</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Mueve producto terminado entre ubicaciones con control de tránsito, recepción y merma.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-white transition hover:bg-slate-800"
          >
            <Plus size={14} />
            Nuevo traspaso
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            <TabButton active={activeTab === "PENDING"} onClick={() => setActiveTab("PENDING")} label={`En tránsito (${pendingCount})`} />
            <TabButton active={activeTab === "COMPLETED"} onClick={() => setActiveTab("COMPLETED")} label={`Recibidos (${completedCount})`} />
            <TabButton active={activeTab === "SHORT"} onClick={() => setActiveTab("SHORT")} label={`Con merma (${shortCount})`} />
            <TabButton active={activeTab === "CANCELLED"} onClick={() => setActiveTab("CANCELLED")} label={`Cancelados (${cancelledCount})`} />
            <TabButton active={activeTab === "ALL"} onClick={() => setActiveTab("ALL")} label={`Todos (${safeTransfers.length})`} />
          </div>
          <div className="relative xl:w-[26rem]">
            <Search className="absolute left-4 top-3.5 text-slate-400" size={16} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar folio, sabor, almacén o usuario..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-semibold text-slate-950 outline-none transition focus:border-slate-400 focus:bg-white"
            />
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white shadow-sm">
        <div className="hidden grid-cols-[0.75fr_1.1fr_1.5fr_0.9fr_0.9fr_0.95fr] gap-4 bg-slate-50 px-5 py-4 text-[10px] font-black uppercase tracking-[0.28em] text-slate-400 lg:grid">
          <div>Folio</div>
          <div>Producto</div>
          <div>Ruta</div>
          <div>Piezas</div>
          <div>Estado</div>
          <div className="text-right">Acción</div>
        </div>
        <div className="divide-y divide-slate-100">
          {filteredTransfers.length > 0 ? (
            filteredTransfers.map((transfer) => (
              <TransferRow
                key={transfer.id}
                transfer={transfer}
                onView={() => setDetailTransfer(transfer)}
                onReceive={() => openReceiveModal(transfer)}
                onCancel={() => setCancelTransferItem(transfer)}
              />
            ))
          ) : (
            <div className="px-5 py-16 text-center">
              <p className="font-black text-slate-950">No encontré traspasos con ese filtro.</p>
              <p className="mt-1 text-sm font-semibold text-slate-400">Cambia la búsqueda o la pestaña seleccionada.</p>
            </div>
          )}
        </div>
      </section>

      {createOpen ? (
        <TransferModal title="Nuevo traspaso" eyebrow="Salida de almacén" onClose={() => setCreateOpen(false)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Producto">
              <select
                value={createForm.flavorId}
                onChange={(event) => setCreateForm((current) => ({ ...current, flavorId: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-950 outline-none focus:border-slate-400"
              >
                {safeFlavors.map((flavor) => (
                  <option key={flavor.id} value={flavor.id}>
                    {flavor.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Cantidad a enviar">
              <NoScrollNumberInput
                min="1"
                step="1"
                value={createForm.quantitySent}
                onChange={(event) => setCreateForm((current) => ({ ...current, quantitySent: event.target.value }))}
                placeholder="Ej. 24"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-950 outline-none focus:border-slate-400"
              />
            </Field>
            <Field label="Origen">
              <select
                value={createForm.fromLocationId}
                onChange={(event) => setCreateForm((current) => ({ ...current, fromLocationId: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-950 outline-none focus:border-slate-400"
              >
                {safeLocations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Destino">
              <select
                value={createForm.toLocationId}
                onChange={(event) => setCreateForm((current) => ({ ...current, toLocationId: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-950 outline-none focus:border-slate-400"
              >
                <option value="">Selecciona destino</option>
                {safeLocations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </Field>
            <label className="block sm:col-span-2">
              <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Notas</span>
              <textarea
                value={createForm.observations}
                onChange={(event) => setCreateForm((current) => ({ ...current, observations: event.target.value }))}
                rows={3}
                placeholder="Ej. Caja dañada, lote, operador, motivo del movimiento..."
                className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-950 outline-none focus:border-slate-400"
              />
            </label>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
            Disponible en origen: <span className="font-black text-slate-950">{availableInOrigin.toLocaleString("es-MX")} pzas</span>.
            Al crear el traspaso se descuenta del origen y queda en tránsito hasta recibirlo.
          </div>

          <ModalActions onCancel={() => setCreateOpen(false)} onSave={handleCreate} saving={isPending} label="Crear traspaso" />
        </TransferModal>
      ) : null}

      {receiveTransferItem ? (
        <TransferModal title="Recibir traspaso" eyebrow={getTransferCode(receiveTransferItem)} onClose={() => setReceiveTransferItem(null)}>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="font-black text-slate-950">{receiveTransferItem.flavor?.name || "Producto"}</p>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {receiveTransferItem.fromLocation?.name || "Origen"} hacia {receiveTransferItem.toLocation?.name || "Destino"} · Enviado:{" "}
              {receiveTransferItem.quantitySent} pzas
            </p>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Cantidad recibida">
              <NoScrollNumberInput
                min="0"
                max={String(receiveTransferItem.quantitySent)}
                step="1"
                value={receiveForm.quantityReceived}
                onChange={(event) => setReceiveForm((current) => ({ ...current, quantityReceived: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-950 outline-none focus:border-slate-400"
              />
            </Field>
            <Field label="Merma calculada">
              <input
                value={`${Math.max(0, receiveTransferItem.quantitySent - Number(receiveForm.quantityReceived || 0))} pzas`}
                readOnly
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-600 outline-none"
              />
            </Field>
            <label className="block sm:col-span-2">
              <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Observaciones de recepción</span>
              <textarea
                value={receiveForm.observations}
                onChange={(event) => setReceiveForm((current) => ({ ...current, observations: event.target.value }))}
                rows={3}
                placeholder="Ej. Llegó completo, llegaron rotas 2 piezas, diferencia por conteo..."
                className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-950 outline-none focus:border-slate-400"
              />
            </label>
          </div>
          <ModalActions onCancel={() => setReceiveTransferItem(null)} onSave={handleReceive} saving={isPending} label="Recibir traspaso" />
        </TransferModal>
      ) : null}

      {cancelTransferItem ? (
        <TransferModal title="Cancelar traspaso" eyebrow={getTransferCode(cancelTransferItem)} onClose={() => setCancelTransferItem(null)}>
          <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
            Al cancelar, las {cancelTransferItem.quantitySent} piezas se devuelven al almacén de origen.
          </div>
          <label className="mt-4 block">
            <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Motivo de cancelación</span>
            <textarea
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              rows={3}
              className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-950 outline-none focus:border-slate-400"
            />
          </label>
          <ModalActions onCancel={() => setCancelTransferItem(null)} onSave={handleCancel} saving={isPending} label="Cancelar y devolver stock" danger />
        </TransferModal>
      ) : null}

      {detailTransfer ? <DetailModal transfer={detailTransfer} onClose={() => setDetailTransfer(null)} /> : null}
    </div>
  );
}

function TransferRow({
  transfer,
  onView,
  onReceive,
  onCancel,
}: {
  transfer: TransferItem;
  onView: () => void;
  onReceive: () => void;
  onCancel: () => void;
}) {
  const received = transfer.quantityReceived ?? null;
  const isShort = transfer.status === "COMPLETED" && Number(received || 0) < Number(transfer.quantitySent || 0);

  return (
    <div className="grid gap-3 px-5 py-4 text-sm lg:grid-cols-[0.75fr_1.1fr_1.5fr_0.9fr_0.9fr_0.95fr] lg:items-center lg:gap-4">
      <div>
        <p className="font-black text-slate-950">{getTransferCode(transfer)}</p>
        <p className="mt-1 text-xs font-semibold text-slate-400">{formatDateTime(transfer.createdAt)}</p>
      </div>
      <div>
        <p className="font-black text-slate-950">{transfer.flavor?.name || "Sin producto"}</p>
        <p className="mt-1 text-xs font-semibold text-slate-400">Enviado por {transfer.senderEmail?.split("@")[0] || "sistema"}</p>
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 lg:hidden">Ruta</p>
        <div className="flex flex-wrap items-center gap-2 font-black text-slate-700">
          <span>{transfer.fromLocation?.name || "Origen"}</span>
          <ArrowRight size={14} className="text-slate-300" />
          <span>{transfer.toLocation?.name || "Destino"}</span>
        </div>
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 lg:hidden">Piezas</p>
        <p className="font-black text-slate-950">
          {received == null ? transfer.quantitySent : `${received} / ${transfer.quantitySent}`} pzas
        </p>
        {isShort ? <p className="mt-1 text-xs font-bold text-orange-600">Merma: {transfer.quantitySent - Number(received || 0)}</p> : null}
      </div>
      <div>
        <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${statusClass(transfer.status, isShort)}`}>
          {isShort ? "Con merma" : statusLabel(transfer.status)}
        </span>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onView}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
        >
          <Eye size={13} />
          Ver
        </button>
        {transfer.status === "PENDING" ? (
          <>
            <button
              type="button"
              onClick={onReceive}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-xs font-black text-white transition hover:bg-emerald-700"
            >
              <Check size={13} />
              Recibir
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-4 py-2 text-xs font-black text-rose-700 transition hover:bg-rose-100"
            >
              <Ban size={13} />
              Cancelar
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

function DetailModal({ transfer, onClose }: { transfer: TransferItem; onClose: () => void }) {
  const received = transfer.quantityReceived ?? null;
  const shrinkage = received == null ? 0 : Math.max(0, transfer.quantitySent - received);

  return (
    <TransferModal title="Detalle del traspaso" eyebrow={getTransferCode(transfer)} onClose={onClose}>
      <div className="grid gap-3 sm:grid-cols-2">
        <DetailRow label="Producto" value={transfer.flavor?.name || "Sin producto"} />
        <DetailRow label="Estado" value={shrinkage > 0 ? "Recibido con merma" : statusLabel(transfer.status)} />
        <DetailRow label="Origen" value={transfer.fromLocation?.name || "Sin origen"} />
        <DetailRow label="Destino" value={transfer.toLocation?.name || "Sin destino"} />
        <DetailRow label="Enviado" value={`${transfer.quantitySent} pzas`} />
        <DetailRow label="Recibido" value={received == null ? "Pendiente" : `${received} pzas`} />
        <DetailRow label="Merma" value={`${shrinkage} pzas`} />
        <DetailRow label="Fecha" value={formatDateTime(transfer.createdAt)} />
        <DetailRow label="Envió" value={transfer.senderEmail || "Sin usuario"} />
        <DetailRow label="Recibió / cerró" value={transfer.receiverEmail || "Pendiente"} />
      </div>
      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Notas</p>
        <p className="mt-2 whitespace-pre-line text-sm font-semibold text-slate-600">{transfer.observations || "Sin notas registradas."}</p>
      </div>
    </TransferModal>
  );
}

function TransferModal({ title, eyebrow, children, onClose }: { title: string; eyebrow: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="max-h-[88vh] w-full max-w-4xl overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">{eyebrow}</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">{title}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-950">
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[calc(88vh-7rem)] overflow-y-auto p-6">{children}</div>
      </div>
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

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">{label}</p>
      <p className="mt-2 font-black text-slate-950">{value}</p>
    </div>
  );
}

function ModalActions({
  onCancel,
  onSave,
  saving,
  label,
  danger = false,
}: {
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
  label: string;
  danger?: boolean;
}) {
  return (
    <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center">
      <button type="button" onClick={onCancel} className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50">
        Cancelar
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className={`flex-1 rounded-full px-4 py-3 text-sm font-black text-white transition disabled:opacity-50 ${
          danger ? "bg-rose-600 hover:bg-rose-700" : "bg-slate-950 hover:bg-slate-800"
        }`}
      >
        {saving ? "Guardando..." : label}
      </button>
    </div>
  );
}
