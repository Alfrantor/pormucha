"use client";

import { useEffect, useState } from "react";
import { createClient, updateClient } from "@/app/_actions/clients";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";

type ClientType = "FISICA" | "JURIDICA" | "PUBLICO_GENERAL";

interface ClientModalProps {
  client?: any;
  onClose: () => void;
}

export function ClientModal({ client, onClose }: ClientModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [giros, setGiros] = useState<{ id: string; name: string }[]>([]);
  const [formData, setFormData] = useState({
    type: (client?.type || "FISICA") as ClientType,
    fullName: client?.fullName || "",
    email: client?.email || "",
    phone: client?.phone || "",
    rfc: client?.rfc || "",
    businessName: client?.businessName || "",
    zipCode: client?.zipCode || "",
    classification: client?.classification || "MINORISTA",
    creditLimit: client?.creditLimit?.toString() || "0",
    paymentTerms: client?.paymentTerms?.toString() || "",
    contactName: client?.contactName || "",
    contactPhone: client?.contactPhone || "",
    contactEmail: client?.contactEmail || "",
    status: client?.status || "ACTIVO",
    globalDiscount: client?.globalDiscount?.toString() || "",
    giroId: client?.giroId || "",
  });

  useEffect(() => {
    fetch("/api/giros")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setGiros(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (formData.type !== "PUBLICO_GENERAL") return;

    setFormData((prev) => ({
      ...prev,
      rfc: "",
      businessName: "",
      zipCode: "",
      classification: "MINORISTA",
      creditLimit: "0",
      paymentTerms: "",
      contactName: "",
      contactPhone: "",
      contactEmail: "",
      globalDiscount: "",
      giroId: "",
    }));
  }, [formData.type]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = {
        ...formData,
        creditLimit: formData.type === "PUBLICO_GENERAL" ? 0 : formData.creditLimit ? parseFloat(formData.creditLimit) : 0,
        paymentTerms: formData.type === "PUBLICO_GENERAL" ? undefined : formData.paymentTerms ? parseInt(formData.paymentTerms) : undefined,
        globalDiscount: formData.type === "PUBLICO_GENERAL" ? undefined : formData.globalDiscount ? parseInt(formData.globalDiscount) : undefined,
        giroId: formData.type === "PUBLICO_GENERAL" ? undefined : formData.giroId || undefined,
      };

      const result = client ? await updateClient(client.id, data) : await createClient(data);

      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
        onClose();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isPublicoGeneral = formData.type === "PUBLICO_GENERAL";
  const isJuridica = formData.type === "JURIDICA";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white">
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900">{client ? "Editar cliente" : "Nuevo cliente"}</h2>
          <button onClick={onClose} className="rounded-lg p-1 transition hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">Tipo de cliente</label>
            <div className="grid grid-cols-1 gap-2 rounded-xl bg-slate-100 p-1.5 sm:grid-cols-3">
              {[
                { value: "FISICA", label: "Persona física" },
                { value: "JURIDICA", label: "Persona moral" },
                { value: "PUBLICO_GENERAL", label: "Público en general" },
              ].map((option) => (
                <label
                  key={option.value}
                  className={`cursor-pointer rounded-lg px-3 py-2 text-center text-sm font-semibold transition ${
                    formData.type === option.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                  }`}
                >
                  <input
                    type="radio"
                    name="type"
                    value={option.value}
                    checked={formData.type === option.value}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                {isJuridica ? "Nombre comercial" : "Nombre completo"} *
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Correo electrónico</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Teléfono</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {!isPublicoGeneral && (
              <>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">RFC</label>
                  <input
                    type="text"
                    name="rfc"
                    value={formData.rfc}
                    onChange={handleChange}
                    placeholder="Ej: ABC123456DEF"
                    className="w-full rounded-lg border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Razón social {isJuridica ? "*" : "(opcional)"}
                  </label>
                  <input
                    type="text"
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleChange}
                    required={isJuridica}
                    className="w-full rounded-lg border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">Código postal</label>
                  <input
                    type="text"
                    name="zipCode"
                    value={formData.zipCode}
                    onChange={handleChange}
                    placeholder="Ej: 24000"
                    maxLength={10}
                    className="w-full rounded-lg border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}
          </div>

          {!isPublicoGeneral && (
            <>
              <div className="border-t pt-4">
                <h3 className="mb-4 font-semibold text-gray-900">Información comercial</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">Clasificación *</label>
                    <select
                      name="classification"
                      value={formData.classification}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="MINORISTA">Minorista</option>
                      <option value="MAYORISTA">Mayorista</option>
                      <option value="DISTRIBUIDOR">Distribuidor</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">Límite de crédito ($)</label>
                    <input
                      type="number"
                      name="creditLimit"
                      value={formData.creditLimit}
                      onChange={handleChange}
                      step="0.01"
                      min="0"
                      className="w-full rounded-lg border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">Días de pago</label>
                    <input
                      type="number"
                      name="paymentTerms"
                      value={formData.paymentTerms}
                      onChange={handleChange}
                      placeholder="30, 60, 90..."
                      min="0"
                      className="w-full rounded-lg border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">Descuento global (%)</label>
                    <input
                      type="number"
                      name="globalDiscount"
                      value={formData.globalDiscount}
                      onChange={handleChange}
                      min="0"
                      max="100"
                      className="w-full rounded-lg border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="mb-4 font-semibold text-gray-900">Contacto adicional</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">Nombre de contacto</label>
                    <input
                      type="text"
                      name="contactName"
                      value={formData.contactName}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">Teléfono contacto</label>
                    <input
                      type="tel"
                      name="contactPhone"
                      value={formData.contactPhone}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-gray-700">Correo contacto</label>
                    <input
                      type="email"
                      name="contactEmail"
                      value={formData.contactEmail}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {giros.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="mb-4 font-semibold text-gray-900">Giro del negocio</h3>
                  <select
                    name="giroId"
                    value={formData.giroId}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sin giro asignado</option>
                    {giros.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          <div className="flex gap-3 border-t pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 px-4 py-2 font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Guardando..." : client ? "Actualizar" : "Crear"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
