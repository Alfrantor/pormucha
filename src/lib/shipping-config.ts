import { db } from "@/lib/db";

export type ShippingProvider = "skydropx" | "enviosperros";

export type ShippingOrigin = {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  countryCode: string;
  postalCode: string;
  state: string;
  city: string;
  neighborhood: string;
  street1: string;
  apartmentNumber: string;
  reference: string;
};

export type ShippingConfig = {
  provider: ShippingProvider;
  apiToken: string;
  origin: ShippingOrigin;
};

const DEFAULT_CONFIG: ShippingConfig = {
  provider: "skydropx",
  apiToken: "",
  origin: {
    companyName: "Pormucha",
    contactName: "Alfredo Andrés Pérez Toralla",
    email: "admin@pormucha.com",
    phone: "9811234567",
    countryCode: "MX",
    postalCode: "24090",
    state: "Campeche",
    city: "Campeche",
    neighborhood: "Samulá",
    street1: "Siete",
    apartmentNumber: "25",
    reference: "casa de dos pisos",
  },
};

function cleanString(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

export function sanitizePhone(phone: string) {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits.length >= 10 ? digits : digits.padEnd(10, "0");
}

export function normalizeShippingOrigin(origin: Partial<ShippingOrigin> | undefined): ShippingOrigin {
  return {
    companyName: cleanString(origin?.companyName, DEFAULT_CONFIG.origin.companyName),
    contactName: cleanString(origin?.contactName, DEFAULT_CONFIG.origin.contactName),
    email: cleanString(origin?.email, DEFAULT_CONFIG.origin.email),
    phone: sanitizePhone(cleanString(origin?.phone, DEFAULT_CONFIG.origin.phone)),
    countryCode: cleanString(origin?.countryCode, DEFAULT_CONFIG.origin.countryCode).toUpperCase() || "MX",
    postalCode: cleanString(origin?.postalCode, DEFAULT_CONFIG.origin.postalCode),
    state: cleanString(origin?.state, DEFAULT_CONFIG.origin.state),
    city: cleanString(origin?.city, DEFAULT_CONFIG.origin.city),
    neighborhood: cleanString(origin?.neighborhood, DEFAULT_CONFIG.origin.neighborhood),
    street1: cleanString(origin?.street1, DEFAULT_CONFIG.origin.street1),
    apartmentNumber: cleanString(origin?.apartmentNumber, DEFAULT_CONFIG.origin.apartmentNumber),
    reference: cleanString(origin?.reference, DEFAULT_CONFIG.origin.reference),
  };
}

export function getShippingProviderLabel(provider: ShippingProvider) {
  return provider === "enviosperros" ? "EnvíosPerros" : "Skydropx";
}

export async function getShippingConfig(): Promise<ShippingConfig> {
  try {
    const setting = await (db as any).systemSetting.findUnique({
      where: { key: "shipping_config" },
    });

    if (!setting?.value) {
      return DEFAULT_CONFIG;
    }

    const parsed = JSON.parse(setting.value) as Partial<ShippingConfig>;
    return {
      provider: parsed.provider === "enviosperros" ? "enviosperros" : "skydropx",
      apiToken: cleanString(parsed.apiToken, ""),
      origin: {
        ...DEFAULT_CONFIG.origin,
        ...(parsed.origin || {}),
      },
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}
