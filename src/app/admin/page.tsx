import { db } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import AdminDashboard from "@/components/admin/AdminDashboard";

// --- Types ---
type AnalyticsData = {
  totalRevenue: number;
  totalOrders: number;
  flavorStats: Record<string, { name: string; count: number }>;
  packStats: Record<string, { name: string; count: number }>;
};

interface AdminPageProps {
  searchParams: {
    from?: string;
    to?: string;
  };
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const user = await currentUser();
  const userEmail = user?.emailAddresses[0]?.emailAddress || "";

  if (!user) return <div className="p-10 text-center">Acceso Denegado</div>;

  // ==========================================
  // 0. DATOS DE LOGÍSTICA
  // ==========================================
  const allLocations = await db.location.findMany({ orderBy: { isDefault: 'desc' } });
  const activeLocations = allLocations.filter(l => !l.isArchived);

  // ==========================================
  // 1. FILTRADO POR FECHAS
  // ==========================================
  const { from, to } = searchParams;
  const dateFilter: any = { status: "PAID" };

  if (from || to) {
    dateFilter.createdAt = {};
    if (from) dateFilter.createdAt.gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      dateFilter.createdAt.lte = toDate;
    }
  }

  // ==========================================
  // 2. ANALYTICS
  // ==========================================
  const filteredOrders = await db.order.findMany({
    where: dateFilter,
    include: {
      orderItems: { include: { product: true, flavor: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  const stats: AnalyticsData = {
    totalRevenue: 0,
    totalOrders: filteredOrders.length,
    flavorStats: {},
    packStats: {}
  };

  let totalFlavorsSold = 0;
  let totalPacksSold = 0;

  filteredOrders.forEach(order => {
    stats.totalRevenue += Number(order.total);

    order.orderItems.forEach(item => {
      if (item.product) {
        const packName = item.product.name;
        if (!stats.packStats[packName]) stats.packStats[packName] = { name: packName, count: 0 };
        stats.packStats[packName].count += item.quantity;
        totalPacksSold += item.quantity;
      }
      if (item.flavor) {
        const slug = item.flavor.slug;
        if (!stats.flavorStats[slug]) stats.flavorStats[slug] = { name: item.flavor.name, count: 0 };
        stats.flavorStats[slug].count += item.quantity;
        totalFlavorsSold += item.quantity;
      }
    });
  });

  const topFlavors = Object.values(stats.flavorStats).sort((a, b) => b.count - a.count);
  const topPacks = Object.values(stats.packStats).sort((a, b) => b.count - a.count);

  // ==========================================
  // 3. INVENTARIO Y CATÁLOGO
  // ==========================================
  const rawFlavors = await db.flavor.findMany({
    include: {
      movements: { orderBy: { createdAt: 'desc' }, take: 100 },
      locationStocks: { include: { location: true } }
    },
    orderBy: { name: 'asc' }
  });

  const allFlavors = rawFlavors.map(f => ({
    ...f,
    price: f.price.toNumber(),
    locationStocks: f.locationStocks.map(s => ({ ...s }))
  }));
  const activeFlavors = allFlavors.filter(f => !f.isArchived);

  const rawProducts = await db.product.findMany({ orderBy: { price: 'asc' } });
  const allProducts = rawProducts.map(p => ({
    ...p,
    price: Number(p.price),
    weight: Number(p.weight),
    height: Number(p.height),
    width: Number(p.width),
    length: Number(p.length)
  }));

  const allPlans = await db.plan.findMany({
    orderBy: { createdAt: 'desc' },
    include: { product: true }
  });
  const serializedPlans = allPlans.map(p => ({
    ...p,
    price: Number(p.price),
    product: p.product ? {
      ...p.product,
      price: Number(p.product.price),
      weight: Number(p.product.weight),
      height: Number(p.product.height),
      width: Number(p.product.width),
      length: Number(p.product.length)
    } : null
  }));

  // ==========================================
  // 4. HISTORIAL DE PRECIOS (merge de ambas tablas)
  // ==========================================
  const flavorPH = await db.flavorPriceHistory.findMany({
    take: 10, orderBy: { createdAt: 'desc' }, include: { flavor: true }
  });
  const productPH = await db.productPriceHistory.findMany({
    take: 10, orderBy: { createdAt: 'desc' }, include: { product: true }
  });
  const priceHistory = [
    ...flavorPH.map(h => ({ id: h.id, createdAt: h.createdAt.toISOString(), oldPrice: Number(h.oldPrice), newPrice: Number(h.newPrice), userId: h.userId, product: null, flavor: { name: h.flavor.name } })),
    ...productPH.map(h => ({ id: h.id, createdAt: h.createdAt.toISOString(), oldPrice: Number(h.oldPrice), newPrice: Number(h.newPrice), userId: h.userId, product: { name: h.product.name }, flavor: null })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10);

  // ==========================================
  // 5. LEADS
  // ==========================================
  const rawLeads = await db.lead.findMany({ orderBy: { createdAt: 'desc' } });
  const leads = rawLeads.map(l => ({
    ...l,
    createdAt: l.createdAt.toISOString()
  }));

  // ==========================================
  // 6. ENVIOS / TRASPASOS EN TRÁNSITO
  // ==========================================
  const rawTransfers = await db.transfer.findMany({
    include: { flavor: true, fromLocation: true, toLocation: true },
    orderBy: { createdAt: 'desc' }
  });
  const transfers = rawTransfers.map(t => ({
    ...t,
    flavor: {
      ...t.flavor,
      price: Number(t.flavor.price)
    },
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }));

  // ==========================================
  // 7. SUSCRIPCIONES (MIEMBROS DEL CLUB)
  // ==========================================
  const rawSubscriptions = await db.subscription.findMany({
    include: { client: true, plan: true },
    orderBy: { createdAt: 'desc' }
  });
  const allSubscriptions = rawSubscriptions.map(s => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    currentPeriodEnd: s.currentPeriodEnd.toISOString(),
  }));

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-20 [&_h1]:font-sans [&_h2]:font-sans [&_h3]:font-sans [&_h4]:font-sans">
      {/* HEADER */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
            <span className="bg-black text-white px-2 py-1 rounded text-sm">ADMIN</span> DASHBOARD
          </h1>
          <UserButton showName />
        </div>
      </header>

      <AdminDashboard data={{
        stats,
        topFlavors,
        topPacks,
        totalFlavorsSold,
        totalPacksSold,
        from: from || null,
        to: to || null,
        allFlavors,
        activeFlavors,
        allProducts,
        allPlans: serializedPlans,
        priceHistory,
        allLocations,
        activeLocations: allLocations.filter(loc => !loc.isArchived),
        leads,
        userEmail,
        transfers,
        allSubscriptions
      }} />
    </div>
  );
}