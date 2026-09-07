import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { ensureSubscriptionScheduleSchema } from "@/lib/subscriptions";
import { WebInsightsDashboard } from "@/components/admin/WebInsightsDashboard";

const MONTH_LABELS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function recentMonths(count: number) {
  const now = new Date();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (count - 1 - index), 1);
    return {
      key: monthKey(date),
      label: `${MONTH_LABELS[date.getMonth()]} ${String(date.getFullYear()).slice(2)}`,
    };
  });
}

export default async function WebInsightsPage() {
  await ensureSubscriptionScheduleSchema();

  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as any)?.role;

  if (role !== "admin") {
    redirect("/perfil");
  }

  const months = recentMonths(6);
  const [orders, subscriptions] = await Promise.all([
    db.order.findMany({
      where: {
        status: { not: "CANCELLED" },
        channel: "WEB",
      },
      select: {
        id: true,
        createdAt: true,
        total: true,
        state: true,
        subscriptionId: true,
        orderItems: {
          select: {
            quantity: true,
            flavorId: true,
            flavor: { select: { id: true, name: true } },
            composition: {
              select: {
                quantity: true,
                flavor: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.subscription.findMany({
      select: {
        id: true,
        planId: true,
        status: true,
        plan: { select: { id: true, name: true, price: true, unitCount: true } },
      },
    }),
  ]);

  const webOrders = orders.filter((order) => Number(order.total || 0) > 0);
  const totalRevenue = webOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const subscriptionOrders = webOrders.filter((order) => order.subscriptionId);
  const subscriptionRevenue = subscriptionOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const oneTimeRevenue = totalRevenue - subscriptionRevenue;
  const activeSubscriptions = subscriptions.filter((subscription) => subscription.status === "ACTIVE").length;
  const flavorSalesMap = new Map<string, { id: string; name: string; units: number; orders: Set<string> }>();
  const stateSalesMap = new Map<string, { state: string; revenue: number; orders: number }>();
  const planSalesMap = new Map<string, { id: string; name: string; revenue: number; subscriptions: number; unitCount: number }>();

  for (const order of webOrders) {
    const state = (order.state || "Sin estado").trim() || "Sin estado";
    const currentState = stateSalesMap.get(state) || { state, revenue: 0, orders: 0 };
    currentState.revenue += Number(order.total || 0);
    currentState.orders += 1;
    stateSalesMap.set(state, currentState);

    for (const item of order.orderItems) {
      if (item.composition.length > 0) {
        for (const component of item.composition) {
          const flavor = component.flavor;
          const current = flavorSalesMap.get(flavor.id) || { id: flavor.id, name: flavor.name, units: 0, orders: new Set<string>() };
          current.units += Number(item.quantity || 0) * Number(component.quantity || 0);
          current.orders.add(order.id);
          flavorSalesMap.set(flavor.id, current);
        }
        continue;
      }

      if (item.flavorId && item.flavor) {
        const current = flavorSalesMap.get(item.flavorId) || { id: item.flavorId, name: item.flavor.name, units: 0, orders: new Set<string>() };
        current.units += Number(item.quantity || 0);
        current.orders.add(order.id);
        flavorSalesMap.set(item.flavorId, current);
      }
    }
  }

  for (const subscription of subscriptions) {
    const plan = subscription.plan;
    const current = planSalesMap.get(subscription.planId) || {
      id: subscription.planId,
      name: plan?.name || "Plan sin nombre",
      revenue: 0,
      subscriptions: 0,
      unitCount: Number(plan?.unitCount || 0),
    };
    current.subscriptions += 1;
    current.revenue += Number(plan?.price || 0);
    planSalesMap.set(subscription.planId, current);
  }

  const topFlavor = Array.from(flavorSalesMap.values())
    .map((entry) => ({ name: entry.name, units: entry.units, ordersCount: entry.orders.size }))
    .sort((a, b) => b.units - a.units)[0] || null;
  const topSubscriptionPlan = Array.from(planSalesMap.values()).sort((a, b) => b.subscriptions - a.subscriptions)[0] || null;
  const stateSales = Array.from(stateSalesMap.values()).sort((a, b) => b.revenue - a.revenue);
  const stateKeys = stateSales.slice(0, 5).map((entry) => entry.state);
  const stateTrend = months.map((month) => {
    const point: { key: string; label: string; [state: string]: string | number } = { ...month };
    for (const state of stateKeys) {
      const monthStateOrders = webOrders.filter((order) => {
        const orderState = (order.state || "Sin estado").trim() || "Sin estado";
        return monthKey(order.createdAt) === month.key && orderState === state;
      });
      point[state] = monthStateOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    }
    return point;
  });

  return (
    <WebInsightsDashboard
      data={{
        totalRevenue,
        oneTimeRevenue,
        subscriptionRevenue,
        orderCount: webOrders.length,
        subscriptionOrderCount: subscriptionOrders.length,
        activeSubscriptions,
        topSubscriptionPlan,
        topFlavor,
        stateSales,
        stateTrend,
        stateKeys,
      }}
    />
  );
}
