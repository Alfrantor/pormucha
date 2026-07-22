import type { Flavor, Plan, Subscription } from "@prisma/client";
import { db } from "@/lib/db";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const FLAVOR_LOCK_DAYS = 5;
const SUBSCRIPTION_ORDER_NOTE_PREFIX = "[SUBSCRIPTION_CYCLE]";

type SubscriptionWithPlan = Subscription & {
  plan: Plan;
};

let scheduleSchemaReady: Promise<void> | null = null;

export async function ensureSubscriptionScheduleSchema() {
  if (!scheduleSchemaReady) {
    scheduleSchemaReady = (async () => {
      await db.$executeRawUnsafe(`
        ALTER TABLE "Subscription"
        ADD COLUMN IF NOT EXISTS "nextShipmentDate" TIMESTAMP(3)
      `).catch(() => undefined);

      await db.$executeRawUnsafe(`
        ALTER TABLE "Address"
        ADD COLUMN IF NOT EXISTS "neighborhood" TEXT
      `).catch(() => undefined);

      await db.$executeRawUnsafe(`
        UPDATE "Subscription"
        SET "nextShipmentDate" = "currentPeriodEnd"
        WHERE "nextShipmentDate" IS NULL
      `).catch(() => undefined);
    })();
  }

  await scheduleSchemaReady;
}

export function getSubscriptionShipmentDate(
  subscription: Pick<Subscription, "currentPeriodEnd" | "nextShipmentDate">,
) {
  return new Date(subscription.nextShipmentDate ?? subscription.currentPeriodEnd);
}

export function getSubscriptionFlavorLockDate(
  subscription: Pick<Subscription, "currentPeriodEnd" | "nextShipmentDate">,
) {
  return new Date(getSubscriptionShipmentDate(subscription).getTime() - FLAVOR_LOCK_DAYS * MS_PER_DAY);
}

export function canEditSubscriptionFlavors(
  subscription: Pick<Subscription, "currentPeriodEnd" | "nextShipmentDate">,
  now = new Date(),
) {
  return now.getTime() < getSubscriptionFlavorLockDate(subscription).getTime();
}

export function getSubscriptionDaysUntilShipment(
  subscription: Pick<Subscription, "currentPeriodEnd" | "nextShipmentDate">,
  now = new Date(),
) {
  const diff = getStartOfDay(getSubscriptionShipmentDate(subscription)).getTime() - getStartOfDay(now).getTime();
  return Math.ceil(diff / MS_PER_DAY);
}

export function getSubscriptionCycleKey(
  subscription: Pick<Subscription, "currentPeriodEnd" | "nextShipmentDate"> | Date,
) {
  const date = subscription instanceof Date ? subscription : getSubscriptionShipmentDate(subscription);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getSubscriptionOrderCycleNote(
  subscription: Pick<Subscription, "currentPeriodEnd" | "nextShipmentDate"> | Date,
) {
  return `${SUBSCRIPTION_ORDER_NOTE_PREFIX}:${getSubscriptionCycleKey(subscription)}`;
}

export function isSubscriptionCycleNote(note?: string | null) {
  return typeof note === "string" && note.includes(SUBSCRIPTION_ORDER_NOTE_PREFIX);
}

export function addPlanInterval(baseDate: Date, plan: Pick<Plan, "interval" | "intervalCount">) {
  const next = new Date(baseDate);
  const count = Math.max(1, Number(plan.intervalCount || 1));

  if (plan.interval === "week") {
    next.setDate(next.getDate() + count * 7);
    return next;
  }

  if (plan.interval === "year") {
    next.setFullYear(next.getFullYear() + count);
    return next;
  }

  next.setMonth(next.getMonth() + count);
  return next;
}

export function normalizeStoredFlavorSelection(
  rawSelection: unknown,
  flavors: Pick<Flavor, "id" | "name">[],
) {
  const byId = new Map(flavors.map((flavor) => [flavor.id, flavor]));
  const byName = new Map(flavors.map((flavor) => [flavor.name.trim().toLowerCase(), flavor]));

  if (!rawSelection || typeof rawSelection !== "object" || Array.isArray(rawSelection)) {
    return {} as Record<string, number>;
  }

  const normalized: Record<string, number> = {};

  for (const [rawKey, rawValue] of Object.entries(rawSelection as Record<string, unknown>)) {
    const numericValue = Number(rawValue);
    if (!Number.isFinite(numericValue) || numericValue <= 0) continue;

    const flavor = byId.get(rawKey) || byName.get(rawKey.trim().toLowerCase());
    if (!flavor) continue;

    normalized[flavor.id] = (normalized[flavor.id] || 0) + numericValue;
  }

  return normalized;
}

export function buildSubscriptionComposition(
  selection: unknown,
  flavors: Pick<Flavor, "id" | "name">[],
  expectedUnits: number,
) {
  const normalized = normalizeStoredFlavorSelection(selection, flavors);
  const totalUnits = Object.values(normalized).reduce((sum, value) => sum + value, 0);

  if (totalUnits !== expectedUnits) {
    throw new Error(`La suscripción debe tener exactamente ${expectedUnits} bebidas configuradas para poder surtirse.`);
  }

  return Object.entries(normalized).map(([flavorId, quantity]) => ({
    flavorId,
    quantity,
  }));
}

export function getSubscriptionStatusSummary(
  subscription: Pick<Subscription, "currentPeriodEnd" | "nextShipmentDate">,
  now = new Date(),
) {
  const shipmentDate = getSubscriptionShipmentDate(subscription);
  const lockDate = getSubscriptionFlavorLockDate(subscription);
  const daysUntilShipment = getSubscriptionDaysUntilShipment(subscription, now);
  const editable = canEditSubscriptionFlavors(subscription, now);

  return {
    shipmentDate,
    lockDate,
    daysUntilShipment,
    editable,
  };
}

export function getNextCycleDateFromSubscription(subscription: SubscriptionWithPlan) {
  return addPlanInterval(getSubscriptionShipmentDate(subscription), subscription.plan);
}

export function isSubscriptionShipmentDue(
  subscription: Pick<Subscription, "currentPeriodEnd" | "nextShipmentDate">,
  now = new Date(),
) {
  return getSubscriptionShipmentDate(subscription).getTime() <= now.getTime();
}

function getStartOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
