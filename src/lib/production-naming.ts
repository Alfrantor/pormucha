export function formatProductionName(startedAt: string | Date, tankName: string | null | undefined, productType: string) {
  const date = new Date(startedAt);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());

  const tankSegment = extractTankSegment(tankName);
  const processSegment = String(productType || "").trim().toUpperCase() || "A";

  return `${day}-${month}-${year}-${tankSegment}-${processSegment}`;
}

function extractTankSegment(tankName: string | null | undefined) {
  if (!tankName) return "SIN-TANQUE";

  const numberMatch = tankName.match(/\d+/);
  if (numberMatch) return numberMatch[0];

  return tankName
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-")
    .replace(/[^A-Z0-9-]/g, "") || "SIN-TANQUE";
}
