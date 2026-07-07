const DEFAULT_PUBLIC_APP_URL = "https://www.pormuchakombucha.com";

function normalizeUrl(value: string) {
  return value.replace(/\/+$/, "");
}

export function resolvePublicAppUrl(browserOrigin?: string | null) {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envUrl) return normalizeUrl(envUrl);

  const origin = browserOrigin?.trim();
  if (!origin) return DEFAULT_PUBLIC_APP_URL;

  const normalizedOrigin = normalizeUrl(origin);
  if (
    normalizedOrigin.includes("localhost") ||
    normalizedOrigin.includes("127.0.0.1") ||
    normalizedOrigin.includes("0.0.0.0")
  ) {
    return DEFAULT_PUBLIC_APP_URL;
  }

  return normalizedOrigin;
}
