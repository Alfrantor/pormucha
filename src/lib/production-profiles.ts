export type ProductionType = "A" | "B" | "C";

export type ParameterKey = "ph" | "brix" | "temperature" | "acidity";

export type ParameterRange = {
  label: string;
  min: number;
  max: number;
};

export type ProductionProfile = {
  type: ProductionType;
  title: string;
  durationDays: number;
  durationHours: number;
  formulaSummary: string;
  parameters: Record<ParameterKey, ParameterRange>;
};

export type ProductionFormulaItemView = {
  id: string;
  sourceKind: "RAW_MATERIAL" | "BASE_BEVERAGE";
  sourceProductionType?: ProductionType | null;
  rawMaterialId?: string | null;
  rawMaterialName: string;
  rawMaterialUnit: string;
  quantity: number;
  defaultLocationId?: string | null;
  defaultLocationName?: string | null;
  notes?: string | null;
};

export type ProductionFormulaStepView = {
  id: string;
  stepNumber: number;
  title: string;
  instructions?: string | null;
  resultLiters?: number | null;
  items: ProductionFormulaItemView[];
};

export type ProductionFormulaView = {
  id: string;
  code: ProductionType;
  name: string;
  description?: string | null;
  formulaSummary?: string | null;
  targetLiters?: number | null;
  durationDays: number;
  durationHours: number;
  phMin: number;
  phMax: number;
  brixMin: number;
  brixMax: number;
  temperatureMin: number;
  temperatureMax: number;
  acidityMin: number;
  acidityMax: number;
  isActive: boolean;
  steps: ProductionFormulaStepView[];
  items: ProductionFormulaItemView[];
};

export const PRODUCTION_PROFILES: Record<ProductionType, ProductionProfile> = {
  A: {
    type: "A",
    title: "Formula A",
    durationDays: 0,
    durationHours: 48,
    formulaSummary: "Usa los insumos iniciales del lote como formula base y valida el arranque antes de pasar a fase dos.",
    parameters: {
      ph: { label: "pH", min: 2.8, max: 3.4 },
      brix: { label: "Brix", min: 5, max: 8 },
      temperature: { label: "Temperatura", min: 18, max: 24 },
      acidity: { label: "Acidez", min: 0.6, max: 1.2 },
    },
  },
  B: {
    type: "B",
    title: "Formula B",
    durationDays: 0,
    durationHours: 72,
    formulaSummary: "Mantiene una fermentacion mas larga y requiere control mas estable antes de segunda fase.",
    parameters: {
      ph: { label: "pH", min: 2.9, max: 3.5 },
      brix: { label: "Brix", min: 4, max: 7 },
      temperature: { label: "Temperatura", min: 18, max: 23 },
      acidity: { label: "Acidez", min: 0.7, max: 1.3 },
    },
  },
  C: {
    type: "C",
    title: "Formula C",
    durationDays: 0,
    durationHours: 96,
    formulaSummary: "Proceso mas largo con seguimiento mas fino del cierre de azucares y acidez.",
    parameters: {
      ph: { label: "pH", min: 2.7, max: 3.3 },
      brix: { label: "Brix", min: 3, max: 6 },
      temperature: { label: "Temperatura", min: 17, max: 22 },
      acidity: { label: "Acidez", min: 0.8, max: 1.5 },
    },
  },
};

export function evaluateProductionParameters(
  type: string,
  values: Partial<Record<ParameterKey, number | null | undefined>>
) {
  const profile = PRODUCTION_PROFILES[(type as ProductionType) || "A"] || PRODUCTION_PROFILES.A;
  const failing: { key: ParameterKey; label: string; actual: number; min: number; max: number }[] = [];

  (Object.keys(profile.parameters) as ParameterKey[]).forEach((key) => {
    const actual = values[key];
    if (actual == null || Number.isNaN(actual)) return;
    const range = profile.parameters[key];
    if (actual < range.min || actual > range.max) {
      failing.push({ key, label: range.label, actual, min: range.min, max: range.max });
    }
  });

  return {
    profile,
    failing,
    ok: failing.length === 0,
  };
}

export function profileFromFormula(
  formula: ProductionFormulaView | null | undefined,
  fallbackType: string
): ProductionProfile {
  if (!formula) {
    return PRODUCTION_PROFILES[(fallbackType as ProductionType) || "A"] || PRODUCTION_PROFILES.A;
  }

  return {
    type: formula.code,
    title: formula.name,
    durationDays: formula.durationDays,
    durationHours: formula.durationHours,
    formulaSummary: formula.formulaSummary || formula.description || "",
    parameters: {
      ph: { label: "pH", min: formula.phMin, max: formula.phMax },
      brix: { label: "Brix", min: formula.brixMin, max: formula.brixMax },
      temperature: { label: "Temperatura", min: formula.temperatureMin, max: formula.temperatureMax },
      acidity: { label: "Acidez", min: formula.acidityMin, max: formula.acidityMax },
    },
  };
}

export function formatFormulaDuration(profile: Pick<ProductionProfile, "durationDays" | "durationHours">) {
  const parts: string[] = [];
  if (profile.durationDays > 0) parts.push(`${profile.durationDays} dia${profile.durationDays === 1 ? "" : "s"}`);
  if (profile.durationHours > 0) parts.push(`${profile.durationHours} hora${profile.durationHours === 1 ? "" : "s"}`);
  if (parts.length === 0) return "0 horas";
  return parts.join(" ");
}

export function evaluateProductionParametersWithFormula(
  formula: ProductionFormulaView | null | undefined,
  fallbackType: string,
  values: Partial<Record<ParameterKey, number | null | undefined>>
) {
  const profile = profileFromFormula(formula, fallbackType);
  const failing: { key: ParameterKey; label: string; actual: number; min: number; max: number }[] = [];

  (Object.keys(profile.parameters) as ParameterKey[]).forEach((key) => {
    const actual = values[key];
    if (actual == null || Number.isNaN(actual)) return;
    const range = profile.parameters[key];
    if (actual < range.min || actual > range.max) {
      failing.push({ key, label: range.label, actual, min: range.min, max: range.max });
    }
  });

  return {
    profile,
    failing,
    ok: failing.length === 0,
  };
}
