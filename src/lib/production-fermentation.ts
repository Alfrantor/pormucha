export type FermentationVisualStatus = "PENDING_PHASE2" | "IN_PROGRESS" | "READY" | "AWAITING_COMPLETION" | "COMPLETED" | "CANCELLED";

type FormulaLike = {
  durationDays?: number | null;
  durationHours?: number | null;
};

type PhaseLike = {
  phase?: number | string | null;
  measuredAt?: string | Date | null;
};

type ProductionLike = {
  status?: string | null;
  secondPhaseRecords?: PhaseLike[] | null;
};

const MS_PER_HOUR = 1000 * 60 * 60;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

function toDate(value: string | Date | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getFormulaDurationHours(formula?: FormulaLike | null) {
  const days = Number(formula?.durationDays || 0);
  const hours = Number(formula?.durationHours || 0);
  return (days * 24) + hours;
}

export function getFermentationMetrics(production: ProductionLike, formula?: FormulaLike | null, now = new Date()) {
  const records = Array.isArray(production.secondPhaseRecords) ? production.secondPhaseRecords : [];
  const phase2 = records.find((record) => Number(record.phase) === 2) || null;
  const phase3 = records.find((record) => Number(record.phase) === 3) || null;
  const phase2Date = toDate(phase2?.measuredAt);
  const durationHours = getFormulaDurationHours(formula);

  if (!phase2Date || durationHours <= 0) {
    return {
      phase2Date,
      phase3,
      readyAt: null,
      elapsedDays: null,
      remainingDays: null,
      overdueDays: null,
      durationHours,
      isReady: false,
    };
  }

  const readyAt = new Date(phase2Date.getTime() + durationHours * MS_PER_HOUR);
  const elapsedMs = now.getTime() - phase2Date.getTime();
  const remainingMs = readyAt.getTime() - now.getTime();
  const overdueMs = now.getTime() - readyAt.getTime();

  return {
    phase2Date,
    phase3,
    readyAt,
    elapsedDays: Math.max(0, elapsedMs / MS_PER_DAY),
    remainingDays: remainingMs > 0 ? remainingMs / MS_PER_DAY : 0,
    overdueDays: overdueMs > 0 ? overdueMs / MS_PER_DAY : 0,
    durationHours,
    isReady: remainingMs <= 0,
  };
}

export function getFermentationVisualStatus(production: ProductionLike, formula?: FormulaLike | null, now = new Date()): FermentationVisualStatus {
  if (production.status === "CANCELLED") return "CANCELLED";
  if (production.status === "COMPLETED") return "COMPLETED";

  const metrics = getFermentationMetrics(production, formula, now);
  if (!metrics.phase2Date) return "PENDING_PHASE2";
  if (metrics.phase3) return "AWAITING_COMPLETION";
  if (metrics.isReady) return "READY";
  return "IN_PROGRESS";
}

export function getFermentationVisualClasses(status: FermentationVisualStatus) {
  switch (status) {
    case "READY":
      return "border-emerald-400 ring-1 ring-emerald-100";
    case "IN_PROGRESS":
      return "border-amber-300 ring-1 ring-amber-100";
    case "AWAITING_COMPLETION":
      return "border-rose-400 ring-1 ring-rose-100";
    case "COMPLETED":
      return "border-emerald-200";
    case "CANCELLED":
      return "border-slate-200";
    default:
      return "border-slate-200";
  }
}

export function formatDayCounter(value: number | null, mode: "elapsed" | "remaining" | "overdue") {
  if (value == null) return "-";
  if (mode === "elapsed") return `${Math.floor(value)} día(s)`;
  if (mode === "remaining") return `${Math.ceil(value)} día(s)`;
  return `${Math.ceil(value)} día(s)`;
}
