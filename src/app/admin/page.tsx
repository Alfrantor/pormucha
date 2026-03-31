import { db } from "@/lib/db";
import { auth, currentUser } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import AdminDashboard from "@/components/admin/AdminDashboard";
import { redirect } from "next/navigation";
import { createClerkClient } from "@clerk/backend";

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

// Inicializamos Clerk Backend
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export default async function AdminPage({ searchParams }: AdminPageProps) {
  try {
    // ==========================================
    // SEGURIDAD: VERIFICACIÓN DE ROL
    // ==========================================
    const { sessionClaims } = await auth();
    const user = await currentUser();
    const userRole = (sessionClaims?.metadata as any)?.role;

    if (userRole !== "admin") {
      redirect("/perfil");
    }

    const userEmail = user?.emailAddresses[0]?.emailAddress || "";

    // ==========================================
    // 0. DATOS DE LOGÍSTICA
    // ==========================================
    let allLocations: any[] = [];
    let activeLocations: any[] = [];

    try {
      allLocations = await db.location.findMany({ orderBy: { isDefault: 'desc' } });
      activeLocations = allLocations.filter(l => !l.isArchived);
    } catch (err) {
      console.error("Error fetching locations:", err);
    }

    // ==========================================
    // 1. FILTRADO POR FECHAS
    // ==========================================
    const { from, to } = searchParams;

    // Iniciamos el filtro solo con el estatus
    const dateFilter: any = {};

    // SOLO añadimos el rango de fechas si el usuario realmente las seleccionó
    if (from || to) {
      dateFilter.createdAt = {};
      if (from) {
        dateFilter.createdAt.gte = new Date(from);
      }
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        dateFilter.createdAt.lte = toDate;
      }
    }

    // ==========================================
    // 2. ANALYTICS (CORREGIDO)
    // ==========================================
    let filteredOrders = [];
    let stats: AnalyticsData = {
      totalRevenue: 0,
      totalOrders: 0,
      flavorStats: {},
      packStats: {}
    };
    let totalFlavorsSold = 0;
    let totalPacksSold = 0;

    // Declaramos estas variables aquí afuera para que dataObject las vea
    let topFlavors: any[] = [];
    let topPacks: any[] = [];

    try {
      filteredOrders = await db.order.findMany({
        where: dateFilter,
        include: {
          orderItems: { include: { product: true, flavor: true } }
        },
        orderBy: { createdAt: 'desc' }
      });

      // --- DEPURACIÓN ---
      console.log("📦 PEDIDOS EN DB:", filteredOrders.length);
      // ------------------

      stats = {
        totalRevenue: 0,
        totalOrders: filteredOrders.length,
        flavorStats: {},
        packStats: {}
      };

      filteredOrders.forEach(order => {
        stats.totalRevenue += Number(order.total || 0);
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

      // Asignamos los valores a las variables de afuera
      topFlavors = Object.values(stats.flavorStats).sort((a, b) => b.count - a.count);
      topPacks = Object.values(stats.packStats).sort((a, b) => b.count - a.count);

    } catch (err) {
      console.error("❌ Error en Analytics:", err);
    }

    // ==========================================
    // 3. INVENTARIO Y CATÁLOGO
    // ==========================================
    let allFlavors = [];
    let allProducts = [];
    let allPlans = [];

    try {
      const rawFlavors = await db.flavor.findMany({
        include: {
          movements: { orderBy: { createdAt: 'desc' }, take: 100 },
          locationStocks: { include: { location: true } }
        },
        orderBy: { name: 'asc' }
      });

      allFlavors = rawFlavors.map(f => ({
        ...f,
        price: f.price ? Number(f.price) : 0,
        createdAt: f.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: f.updatedAt?.toISOString() || new Date().toISOString(),
        locationStocks: f.locationStocks.map(s => ({
          ...s,
          createdAt: s.createdAt?.toISOString() || new Date().toISOString(),
          updatedAt: s.updatedAt?.toISOString() || new Date().toISOString(),
        }))
      }));
    } catch (err) {
      console.error("Error fetching flavors:", err);
      allFlavors = [];
    }

    try {
      const rawProducts = await db.product.findMany({ orderBy: { price: 'asc' } });
      allProducts = rawProducts.map(p => ({
        ...p,
        price: Number(p.price || 0),
        weight: Number(p.weight || 0),
        height: Number(p.height || 0),
        width: Number(p.width || 0),
        length: Number(p.length || 0),
        createdAt: p.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: p.updatedAt?.toISOString() || new Date().toISOString(),
      }));
    } catch (err) {
      console.error("Error fetching products:", err);
      allProducts = [];
    }

    try {
      const rawPlans = await db.plan.findMany({
        orderBy: { createdAt: 'desc' },
        include: { product: true }
      });

      allPlans = rawPlans.map(p => ({
        ...p,
        price: Number(p.price || 0),
        createdAt: p.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: p.updatedAt?.toISOString() || new Date().toISOString(),
        product: p.product ? {
          ...p.product,
          price: Number(p.product.price || 0),
          weight: Number(p.product.weight || 0),
          height: Number(p.product.height || 0),
          width: Number(p.product.width || 0),
          length: Number(p.product.length || 0),
          createdAt: p.product.createdAt?.toISOString() || new Date().toISOString(),
          updatedAt: p.product.updatedAt?.toISOString() || new Date().toISOString(),
        } : null
      }));
    } catch (err) {
      console.error("Error fetching plans:", err);
      allPlans = [];
    }

    // ==========================================
    // 4. HISTORIAL DE PRECIOS
    // ==========================================
    let priceHistory = [];

    try {
      const flavorPH = await db.flavorPriceHistory.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { flavor: true }
      });
      const productPH = await db.productPriceHistory.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { product: true }
      });

      priceHistory = [
        ...flavorPH.map(h => ({
          id: h.id,
          createdAt: h.createdAt.toISOString(),
          oldPrice: Number(h.oldPrice || 0),
          newPrice: Number(h.newPrice || 0),
          flavor: { name: h.flavor.name },
          product: null,
          userId: h.userId
        })),
        ...productPH.map(h => ({
          id: h.id,
          createdAt: h.createdAt.toISOString(),
          oldPrice: Number(h.oldPrice || 0),
          newPrice: Number(h.newPrice || 0),
          product: { name: h.product.name },
          flavor: null,
          userId: h.userId
        })),
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (err) {
      console.error("Error fetching price history:", err);
      priceHistory = [];
    }

    // ==========================================
    // 5. LEADS, TRANSFERS, SUBSCRIPTIONS Y USUARIOS
    // ==========================================
    let leads = [];
    let transfers = [];
    let allSubscriptions = [];
    let clients = [];
    let usersList = [];

    try {
      leads = (await db.lead.findMany({ orderBy: { createdAt: 'desc' } }))
        .map(l => ({ ...l, createdAt: l.createdAt.toISOString() }));
    } catch (err) {
      console.error("Error fetching leads:", err);
      leads = [];
    }

    try {
      transfers = (await db.transfer.findMany({
        include: { flavor: true, fromLocation: true, toLocation: true },
        orderBy: { createdAt: 'desc' }
      })).map(t => ({
        ...t,
        flavor: t.flavor ? { ...t.flavor, price: Number(t.flavor.price || 0) } : null,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      }));
    } catch (err) {
      console.error("Error fetching transfers:", err);
      transfers = [];
    }

    try {
      allSubscriptions = (await db.subscription.findMany({
        include: { client: true, plan: true },
        orderBy: { createdAt: 'desc' }
      })).map(s => ({
        ...s,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
        currentPeriodEnd: s.currentPeriodEnd.toISOString(),
        plan: s.plan ? {
          ...s.plan,
          price: Number(s.plan.price || 0),
          createdAt: s.plan.createdAt.toISOString(),
          updatedAt: s.plan.updatedAt.toISOString(),
        } : null,
        client: s.client ? { ...s.client } : null
      }));
    } catch (err) {
      console.error("Error fetching subscriptions:", err);
      allSubscriptions = [];
    }

    try {
      clients = (await db.client.findMany({ orderBy: { createdAt: 'desc' } }))
        .map(c => ({
          ...c,
          createdAt: c.createdAt?.toISOString() || new Date().toISOString(),
          updatedAt: c.updatedAt?.toISOString() || new Date().toISOString(),
        }));
    } catch (err) {
      console.error("Error fetching clients:", err);
      clients = [];
    }

    // ==========================================
    // 6. LISTA DE USUARIOS DESDE CLERK
    // ==========================================
    try {
      const clerkUsersResponse = await clerk.users.getUserList();
      usersList = clerkUsersResponse.data.map(u => ({
        id: u.id,
        email: u.emailAddresses[0]?.emailAddress || "Sin email",
        firstName: u.firstName || "Usuario",
        lastName: u.lastName || "",
        role: (u.publicMetadata as any)?.role || "cliente",
        imageUrl: u.imageUrl
      }));
    } catch (err) {
      console.error("Error fetching Clerk users:", err);
      usersList = [];
    }

    // ==========================================
    // LIMPIEZA PROFUNDA DE ÓRDENES (Adiós Decimals)
    // ==========================================
    const serializedOrders = filteredOrders.map(order => ({
      ...order,
      // 1. Campos de la Orden
      total: Number(order.total || 0),
      subtotal: Number(order.subtotal || 0),
      shippingCost: Number(order.shippingCost || 0),
      createdAt: order.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: order.updatedAt?.toISOString() || new Date().toISOString(),

      // 2. Campos de los Items dentro de la orden
      orderItems: order.orderItems?.map((item: any) => ({
        ...item,
        unitPrice: Number(item.unitPrice || 0),
        subtotal: Number(item.subtotal || 0),

        // 3. Si el item trae el producto/sabor incluido, también lo limpiamos
        product: item.product ? {
          ...item.product,
          price: Number(item.product.price || 0),
          weight: Number(item.product.weight || 0),
          height: Number(item.product.height || 0),
          width: Number(item.product.width || 0),
          length: Number(item.product.length || 0),
        } : null,

        flavor: item.flavor ? {
          ...item.flavor,
          price: Number(item.flavor.price || 0),
        } : null
      })) || []
    }));

    // ==========================================
    // DATA OBJECT FINAL
    // ==========================================
    const dataObject = {
      stats,
      topFlavors,
      topPacks,
      totalFlavorsSold,
      totalPacksSold,
      from: from || null,
      to: to || null,
      allFlavors,
      activeFlavors: allFlavors.filter(f => !f.isArchived),
      allProducts,
      allPlans,
      priceHistory,
      allLocations,
      activeLocations,
      leads,
      userEmail,
      transfers,
      allSubscriptions,
      users: usersList,
      clients,
      orders: serializedOrders // Pasamos la versión limpia
    };

    // Verificar que stats existe y tiene las propiedades requeridas
    if (!dataObject.stats || typeof dataObject.stats !== 'object') {
      throw new Error("Stats object is invalid");
    }

    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-20">
        <header className="bg-white border-b sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
            <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
              <span className="bg-black text-white px-2 py-1 rounded text-sm">ADMIN</span> DASHBOARD
            </h1>
            <UserButton showName />
          </div>
        </header>

        <AdminDashboard data={dataObject} />
      </div>
    );

  } catch (error) {
    console.error("Critical error in AdminPage:", error);

    // Render de error seguro
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-20">
        <header className="bg-white border-b sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
            <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
              <span className="bg-red-600 text-white px-2 py-1 rounded text-sm">ERROR</span> ADMIN
            </h1>
            <UserButton showName />
          </div>
        </header>

        <main className="max-w-7xl mx-auto p-6">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8">
            <h2 className="text-2xl font-black text-red-800 mb-4">⚠️ Error al cargar el panel</h2>
            <p className="text-red-700 mb-4">
              Ocurrió un error inesperado al cargar los datos del administrador.
            </p>
            <details className="bg-white p-4 rounded border border-red-200">
              <summary className="font-bold cursor-pointer text-red-700">Ver detalles del error</summary>
              <pre className="mt-2 text-xs text-gray-600 overflow-auto">
                {error instanceof Error ? error.message : String(error)}
              </pre>
            </details>
            <button

              className="mt-6 bg-red-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-red-700"
            >
              🔄 Recargar página
            </button>
          </div>
        </main>
      </div>
    );
  }
}