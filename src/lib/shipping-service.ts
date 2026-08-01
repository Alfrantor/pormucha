import { db } from "@/lib/db";
import {
  getShippingConfig,
  getShippingProviderLabel,
  normalizeShippingOrigin,
  sanitizePhone,
  type ShippingOrigin,
} from "@/lib/shipping-config";

type ShippingLabelResult =
  | { success: true; labelUrl: string }
  | { success: false; error: string };

type QuoteInput = {
  zip: string;
  state?: string;
  city?: string;
  neighborhood?: string;
  productIds?: string[];
};

type EnviosPerrosRate = {
  summary?: string;
  available?: boolean;
  details?: {
    courier?: string;
    service?: string;
    total?: number | string;
    shippingTotal?: number | string;
    deliveryCommitment?: string;
  } | null;
  comment?: string | null;
  courier?: string;
  service?: string;
  total?: number | string;
  price?: number | string;
  amount?: number | string;
  deliveryDays?: number | string;
  days?: number | string;
  estimatedDays?: number | string;
};

const SKYDROPX_TOKEN_URLS = [
  "https://pro.skydropx.com/api/v1/oauth/token",
  "https://sb-pro.skydropx.com/api/v1/oauth/token",
];

async function tryGetSkydropxToken(url: string): Promise<string | null> {
  const jsonResponse = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: process.env.SKYDROPX_CLIENT_ID,
      client_secret: process.env.SKYDROPX_CLIENT_SECRET,
    }),
  });

  if (jsonResponse.ok) {
    const data = await jsonResponse.json();
    if (data.access_token) return data.access_token;
  }

  const formResponse = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.SKYDROPX_CLIENT_ID || "",
      client_secret: process.env.SKYDROPX_CLIENT_SECRET || "",
    }).toString(),
  });

  if (!formResponse.ok) return null;

  const formData = await formResponse.json();
  return formData.access_token || null;
}

async function getSkydropxToken() {
  for (const url of SKYDROPX_TOKEN_URLS) {
    const token = await tryGetSkydropxToken(url);
    if (token) return token;
  }

  throw new Error(
    "No se pudo obtener token de Skydropx. Verifica tus credenciales en Skydropx PRO > Conexiones > API."
  );
}

async function getParcelMetrics(productIds: string[] = []) {
  let totalWeight = 1;
  let maxHeight = 10;
  let maxWidth = 10;
  let maxLength = 10;

  if (productIds.length > 0) {
    const products = await db.product.findMany({
      where: { id: { in: productIds } },
    });

    if (products.length > 0) {
      totalWeight = products.reduce((sum, product) => sum + Number(product.weight || 0), 0) || 1;
      maxHeight = Math.max(...products.map((product) => Number(product.height || 10)));
      maxWidth = Math.max(...products.map((product) => Number(product.width || 10)));
      maxLength = Math.max(...products.map((product) => Number(product.length || 10)));
    }
  }

  return {
    weight: totalWeight,
    height: maxHeight,
    width: maxWidth,
    length: maxLength,
  };
}

function buildQuoteOrigin(origin: ShippingOrigin) {
  return {
    country_code: origin.countryCode,
    postal_code: origin.postalCode,
    area_level1: origin.state,
    area_level2: origin.city,
    area_level3: origin.neighborhood,
  };
}

function buildShipmentOrigin(origin: ShippingOrigin) {
  return {
    country_code: origin.countryCode,
    postal_code: origin.postalCode,
    area_level1: origin.state,
    area_level2: origin.city,
    area_level3: origin.neighborhood,
    street1: origin.street1,
    apartment_number: origin.apartmentNumber || undefined,
    name: origin.contactName,
    company: origin.companyName,
    phone: sanitizePhone(origin.phone),
    email: origin.email,
    reference: origin.reference || undefined,
  };
}

function parseEnviosperrosRateReference(reference: string | null | undefined) {
  const [courierRaw, serviceRaw] = String(reference || "")
    .split("::")
    .map((part) => part.trim());

  return {
    courier: courierRaw || "",
    service: serviceRaw || "",
  };
}

function truncateCarrierText(value: string | null | undefined, maxLength: number) {
  return String(value || "").trim().slice(0, maxLength);
}

function formatEnviosperrosError(data: any, status: number) {
  const messages: string[] = [];

  if (typeof data?.message === "string" && data.message.trim()) {
    messages.push(data.message.trim());
  }

  if (data?.errors && typeof data.errors === "object") {
    for (const [field, value] of Object.entries(data.errors)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === "string" && item.trim()) {
            messages.push(`${field}: ${item.trim()}`);
          }
        }
      } else if (typeof value === "string" && value.trim()) {
        messages.push(`${field}: ${value.trim()}`);
      }
    }
  }

  if (messages.length === 0) {
    return `EnvíosPerros error ${status}`;
  }

  return messages.join(" | ");
}

function extractCourierHint(provider: string | null | undefined) {
  const value = String(provider || "").trim();
  if (!value) return "";

  const parenMatch = value.match(/\(([^)]+)\)/);
  if (parenMatch?.[1]) return parenMatch[1].trim();

  const dashMatch = value.split(" - ").map((part) => part.trim()).filter(Boolean);
  if (dashMatch.length > 0) return dashMatch[0];

  return value;
}

async function quoteWithSkydropx(input: QuoteInput, origin: ShippingOrigin) {
  const bearerToken = await getSkydropxToken();
  const parcel = await getParcelMetrics(input.productIds || []);

  const response = await fetch("https://pro.skydropx.com/api/v1/quotations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${bearerToken}`,
    },
    body: JSON.stringify({
      quotation: {
        address_from: buildQuoteOrigin(origin),
        address_to: {
          country_code: origin.countryCode,
          postal_code: input.zip,
          area_level1: input.state || "Destino",
          area_level2: input.city || "Destino",
          area_level3: input.neighborhood || "Centro",
        },
        parcels: [parcel],
      },
    }),
  });

  let data = await response.json();

  if (!response.ok) {
    throw new Error("Error de paquetería al cotizar.");
  }

  let successfulRates: any[] = [];
  for (let attempt = 0; attempt <= 5; attempt++) {
    successfulRates = (data.rates || []).filter((rate: any) => rate.success === true && rate.total != null);
    if (successfulRates.length > 0) break;
    if (data.is_completed && attempt > 0) break;
    if (attempt === 5) break;

    await new Promise((resolve) => setTimeout(resolve, 1500));
    const pollResponse = await fetch(`https://pro.skydropx.com/api/v1/quotations/${data.id}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${bearerToken}`,
      },
    });
    if (!pollResponse.ok) break;
    data = await pollResponse.json();
  }

  successfulRates.sort((a: any, b: any) => Number(a.total) - Number(b.total));

  return successfulRates.map((rate: any) => ({
    rate: Math.ceil(Number(rate.total)),
    provider: `${rate.provider_service_name} (${rate.provider_display_name})`,
    days: String(rate.days || "3-5"),
    id: rate.id || Math.random().toString(36).slice(2),
    source: getShippingProviderLabel("skydropx"),
  }));
}

async function getEnviosperrosToken() {
  const config = await getShippingConfig();
  const apiToken = config.apiToken.trim();

  if (!apiToken) {
    throw new Error("Falta capturar el token API de EnvíosPerros en /admin/orders.");
  }

  return apiToken;
}

export async function quoteShipping(input: QuoteInput) {
  const config = await getShippingConfig();
  const origin = normalizeShippingOrigin(config.origin);
  const rates =
    config.provider === "enviosperros"
      ? await quoteWithEnviosperrosRates(input, origin)
      : await quoteWithSkydropx(input, origin);

  return {
    provider: getShippingProviderLabel(config.provider),
    rates,
  };
}

async function quoteWithEnviosperrosRates(input: QuoteInput, origin: ShippingOrigin) {
  const apiToken = await getEnviosperrosToken();
  const parcel = await getParcelMetrics(input.productIds || []);
  const packageType = parcel.height <= 3 && parcel.width <= 30 && parcel.length <= 40 ? "Envelope" : "Box";

  const response = await fetch("https://app.enviosperros.com/api/v3/rates", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${apiToken}`,
    },
    body: JSON.stringify({
      package:
        packageType === "Envelope"
          ? { type: "Envelope" }
          : {
              type: "Box",
              depth: Number(parcel.length.toFixed(2)),
              width: Number(parcel.width.toFixed(2)),
              height: Number(parcel.height.toFixed(2)),
              weight: Number(parcel.weight.toFixed(2)),
            },
      originZipCode: origin.postalCode,
      destinationZipCode: input.zip,
    }),
  });

  const rawText = await response.text();
  let data: any;

  try {
    data = JSON.parse(rawText);
  } catch {
    throw new Error(`Respuesta inválida de EnvíosPerros: ${rawText.slice(0, 200)}`);
  }

  if (!response.ok) {
    throw new Error(formatEnviosperrosError(data, response.status));
  }

  const entries: EnviosPerrosRate[] = Array.isArray(data)
    ? data
    : Array.isArray(data?.rates)
      ? data.rates
      : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.value)
          ? data.value
          : [];

  return entries
    .map((rate) => {
      const detail = rate.details || null;
      const amount = Number(
        detail?.total ??
        detail?.shippingTotal ??
        rate.total ??
        rate.price ??
        rate.amount ??
        0
      );
      const courier = String(detail?.courier ?? rate.courier ?? "").trim();
      const service = String(detail?.service ?? rate.service ?? "").trim();
      const days = String(
        detail?.deliveryCommitment ??
        rate.deliveryDays ??
        rate.days ??
        rate.estimatedDays ??
        "3-5"
      );

      return {
        rate: Math.ceil(amount),
        provider: courier && service ? `${courier} - ${service}` : String(rate.summary || "Paquetería"),
        days,
        id: `${courier}::${service}`,
        source: getShippingProviderLabel("enviosperros"),
        available: rate.available !== false,
      };
    })
    .filter((rate) => rate.available && Number.isFinite(rate.rate) && rate.rate > 0 && !rate.id.startsWith("::"))
    .sort((a, b) => a.rate - b.rate);
}

async function getEnviosperrosRatesForOrder(order: {
  zipCode: string | null;
  orderItems: Array<{ productId: string | null }>;
}, origin: ShippingOrigin, apiToken: string) {
  if (!order.zipCode) {
    throw new Error("La orden no tiene código postal para recotizar en EnvíosPerros.");
  }

  const parcel = await getParcelMetrics(
    order.orderItems.map((item) => item.productId).filter((productId): productId is string => Boolean(productId))
  );

  const packageType = parcel.height <= 3 && parcel.width <= 30 && parcel.length <= 40 ? "Envelope" : "Box";

  const response = await fetch("https://app.enviosperros.com/api/v3/rates", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${apiToken}`,
    },
    body: JSON.stringify({
      package:
        packageType === "Envelope"
          ? { type: "Envelope" }
          : {
              type: "Box",
              depth: Number(parcel.length.toFixed(2)),
              width: Number(parcel.width.toFixed(2)),
              height: Number(parcel.height.toFixed(2)),
              weight: Number(parcel.weight.toFixed(2)),
            },
      originZipCode: origin.postalCode,
      destinationZipCode: order.zipCode,
    }),
  });

  const rawText = await response.text();
  let data: any;

  try {
    data = JSON.parse(rawText);
  } catch {
    throw new Error(`Respuesta inválida de EnvíosPerros: ${rawText.slice(0, 200)}`);
  }

  if (!response.ok) {
    throw new Error(data?.message || `EnvíosPerros error ${response.status}`);
  }

  const entries: EnviosPerrosRate[] = Array.isArray(data?.value)
    ? data.value
    : Array.isArray(data)
      ? data
      : Array.isArray(data?.rates)
        ? data.rates
        : Array.isArray(data?.data)
          ? data.data
          : [];

  return entries
    .filter((rate) => rate.available !== false)
    .map((rate) => ({
      courier: String(rate.details?.courier ?? rate.courier ?? "").trim(),
      service: String(rate.details?.service ?? rate.service ?? "").trim(),
      total: Number(rate.details?.total ?? rate.details?.shippingTotal ?? rate.total ?? rate.price ?? rate.amount ?? 0),
      summary: String(rate.summary || "").trim(),
    }))
    .filter((rate) => rate.courier && rate.service && Number.isFinite(rate.total) && rate.total > 0)
    .sort((a, b) => a.total - b.total);
}

async function createSkydropxLabel(orderId: string, origin: ShippingOrigin): Promise<ShippingLabelResult> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { orderItems: { include: { product: true } } },
  });

  if (!order) throw new Error("Orden no encontrada");

  const bearerToken = await getSkydropxToken();
  const parcel = await getParcelMetrics(
    order.orderItems.map((item) => item.productId).filter((productId): productId is string => Boolean(productId))
  );

  const quoteRes = await fetch("https://pro.skydropx.com/api/v1/quotations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${bearerToken}`,
    },
    body: JSON.stringify({
      quotation: {
        address_from: buildQuoteOrigin(origin),
        address_to: {
          country_code: origin.countryCode,
          postal_code: order.zipCode,
          area_level1: order.state,
          area_level2: order.city,
          area_level3: order.neighborhood || "Centro",
        },
        parcels: [parcel],
      },
    }),
  });

  let quoteData = await quoteRes.json();
  let freshRateId: string | null = null;

  for (let index = 0; index < 5; index++) {
    const match = (quoteData.rates || []).find(
      (rate: any) => `${rate.provider_service_name} (${rate.provider_display_name})` === order.shippingProvider
    );
    if (match) {
      freshRateId = match.id;
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, 1500));
    const poll = await fetch(`https://pro.skydropx.com/api/v1/quotations/${quoteData.id}`, {
      headers: { Authorization: `Bearer ${bearerToken}` },
    });
    quoteData = await poll.json();
  }

  if (!freshRateId) {
    throw new Error("No se encontró tarifa vigente para generar la guía.");
  }

  const orderTotal = parseFloat(order.total?.toString() || "0");
  const response = await fetch("https://pro.skydropx.com/api/v1/shipments/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${bearerToken}`,
    },
    body: JSON.stringify({
      shipment: {
        rate_id: freshRateId,
        printing_format: "standard",
        address_from: buildShipmentOrigin(origin),
        address_to: {
          country_code: origin.countryCode,
          postal_code: order.zipCode,
          area_level1: order.state,
          area_level2: order.city,
          area_level3: order.neighborhood || "Centro",
          street1: order.street,
          apartment_number: order.number || undefined,
          name: order.fullName,
          company: order.fullName,
          phone: sanitizePhone(String(order.phone || "")),
          email: order.email,
          reference: order.reference || "Entrega a domicilio",
        },
        packages: [
          {
            package_number: 1,
            package_protected: false,
            declared_value: orderTotal,
            total: orderTotal,
            package_type: "4G",
            consignment_note: "50202300",
          },
        ],
        ...(process.env.SKYDROPX_HEADQUARTER_ID
          ? { headquarter_id: process.env.SKYDROPX_HEADQUARTER_ID }
          : {}),
      },
    }),
  });

  const rawText = await response.text();
  let data: any;
  try {
    data = JSON.parse(rawText);
  } catch {
    throw new Error(`Respuesta inválida de Skydropx: ${rawText.slice(0, 200)}`);
  }

  if (!response.ok) {
    throw new Error(`Skydropx error ${response.status}: ${JSON.stringify(data)}`);
  }

  const tracking = data.master_tracking_number || data.data?.attributes?.master_tracking_number;
  const labelUrl = data.label_url || data.data?.attributes?.label_url;
  if (!labelUrl) throw new Error("Envío creado pero no se recibió URL de guía.");

  await db.order.update({
    where: { id: orderId },
    data: {
      trackingNumber: String(tracking),
      trackingUrl: labelUrl,
      status: "SHIPPED",
    },
  });

  return { success: true, labelUrl };
}

export async function createShippingLabel(orderId: string): Promise<ShippingLabelResult> {
  const config = await getShippingConfig();
  const origin = normalizeShippingOrigin(config.origin);

  if (config.provider === "enviosperros") {
    return createEnviosperrosLabel(orderId, origin, config.apiToken.trim());
  }

  return createSkydropxLabel(orderId, origin);
}

function extractEnviosPerrosTracking(data: any) {
  return String(
    data?.trackingNumber ||
      data?.tracking_number ||
      data?.reference ||
      data?.label ||
      data?.id ||
      data?.data?.trackingNumber ||
      data?.data?.tracking_number ||
      data?.data?.reference ||
      data?.data?.id ||
      ""
  ).trim();
}

async function createEnviosperrosLabel(orderId: string, origin: ShippingOrigin, apiToken: string): Promise<ShippingLabelResult> {
  if (!apiToken) {
    throw new Error("Falta capturar el token API de EnvíosPerros en /admin/orders.");
  }

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { orderItems: { include: { product: true } } },
  });

  if (!order) throw new Error("Orden no encontrada");

  const parcel = await getParcelMetrics(
    order.orderItems.map((item) => item.productId).filter((productId): productId is string => Boolean(productId))
  );

  const rateRef = parseEnviosperrosRateReference(order.shippingRateId);
  let courier = rateRef.courier;
  let service = rateRef.service;
  const courierHint = extractCourierHint(order.shippingProvider);

  if (!courier || !service) {
    const [providerCourier = "", providerService = ""] = String(order.shippingProvider || "")
      .split(" - ")
      .map((part) => part.trim());
    courier = courier || providerCourier;
    service = service || providerService;
  }

  if (!courier || !service) {
    const freshRates = await getEnviosperrosRatesForOrder(order, origin, apiToken);
    const matchedRate =
      freshRates.find((rate) => courierHint && rate.courier.toLowerCase() === courierHint.toLowerCase()) ||
      freshRates[0];

    if (!matchedRate) {
      throw new Error("No se pudo identificar la paquetería o el servicio de EnvíosPerros para esta orden.");
    }

    courier = matchedRate.courier;
    service = matchedRate.service;
  }

  const response = await fetch("https://app.enviosperros.com/api/v3/labels", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${apiToken}`,
    },
    body: JSON.stringify({
      courier,
      service,
      package: {
        type: parcel.height <= 3 && parcel.width <= 30 && parcel.length <= 40 ? "Envelope" : "Box",
        weight: Number(parcel.weight.toFixed(2)),
        depth: Number(parcel.length.toFixed(2)),
        width: Number(parcel.width.toFixed(2)),
        height: Number(parcel.height.toFixed(2)),
        description: order.orderItems.map((item) => item.productName).filter(Boolean).join(", ") || "Productos Pormucha",
      },
      origin: {
        name: origin.contactName,
        neighborhood: origin.neighborhood,
        zipCode: origin.postalCode,
        company: origin.companyName,
        phone: sanitizePhone(origin.phone),
        street: origin.street1.trim(),
        exteriorNumber: (origin.apartmentNumber || "S/N").trim(),
        email: origin.email,
        references: truncateCarrierText(origin.reference || "Pormucha", 25),
      },
      destination: {
        name: order.fullName,
        neighborhood: order.neighborhood || "Centro",
        zipCode: order.zipCode,
        company: order.fullName,
        phone: sanitizePhone(String(order.phone || "")),
        street: String(order.street || "").trim(),
        exteriorNumber: String(order.number || "S/N").trim(),
        references: truncateCarrierText(order.reference || "Entrega a domicilio", 25),
      },
    }),
  });

  const rawText = await response.text();
  let data: any;

  try {
    data = JSON.parse(rawText);
  } catch {
    throw new Error(`Respuesta inválida de EnvíosPerros: ${rawText.slice(0, 200)}`);
  }

  if (!response.ok) {
    throw new Error(formatEnviosperrosError(data, response.status));
  }

  const tracking = extractEnviosPerrosTracking(data);
  if (!tracking) {
    throw new Error("EnvíosPerros creó la guía pero no devolvió un identificador de descarga.");
  }

  const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
  const labelUrl = `${baseUrl}/api/shipping/enviosperros/labels/${encodeURIComponent(tracking)}/download`;

  await db.order.update({
    where: { id: orderId },
    data: {
      trackingNumber: tracking,
      trackingUrl: labelUrl,
      status: "SHIPPED",
    },
  });

  return { success: true, labelUrl };
}
