export const DEFAULT_FLAVOR_PRESENTATIONS = ["Bala", "Euro"];

export function parseFlavorPresentations(value: unknown): string[] {
  if (Array.isArray(value)) {
    return normalizeFlavorPresentations(value);
  }

  const text = String(value || "").trim();
  if (!text) return DEFAULT_FLAVOR_PRESENTATIONS;

  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return normalizeFlavorPresentations(parsed);
  } catch {
    // Permite capturar presentaciones como texto pegado, una por linea o separadas por coma.
  }

  return normalizeFlavorPresentations(text.split(/[\n,]/));
}

export function serializeFlavorPresentations(value: unknown): string {
  return JSON.stringify(parseFlavorPresentations(value));
}

export function presentationsToInputValue(value: unknown): string {
  return parseFlavorPresentations(value).join("\n");
}

function normalizeFlavorPresentations(values: unknown[]) {
  const seen = new Set<string>();
  const normalized = values
    .map((entry) => String(entry || "").trim())
    .filter(Boolean)
    .filter((entry) => {
      const key = entry.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return normalized.length > 0 ? normalized : DEFAULT_FLAVOR_PRESENTATIONS;
}
