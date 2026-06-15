import { db } from "@/lib/db";
import { auth, currentUser } from "@clerk/nextjs/server";
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
  // ==========================================
  // 1. SEGURIDAD AFUERA DEL TRY-CATCH
  // ==========================================
  const { sessionClaims } = await auth();
  const user = await currentUser();
  const userRole = (sessionClaims?.metadata as any)?.role;

  if (userRole !== "admin" && userRole !== "vendedor") {
    redirect("/perfil");
  }

  const userEmail = user?.emailAddresses[0]?.emailAddress || "";

  try {
    // 👇 ESTAS 3 LÍNEAS SON LAS QUE FALTAN 👇
    const resolvedParams = await searchParams;
    const from = resolvedParams?.from;
    const to = resolvedParams?.to;

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
    let filteredOrders: any[] = [];
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
          orderItems: { include: { product: true, flavor: true, composition: true } },
          replacements: { select: { id: true, status: true } },
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

      filteredOrders.forEach((order: any) => {
        stats.totalRevenue += Number(order.total || 0);
        order.orderItems.forEach((item: any) => {
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

      // Asignamos los valores a las variables de afuera y cambios en any
      topFlavors = Object.values(stats.flavorStats).sort((a, b) => b.count - a.count);
      topPacks = Object.values(stats.packStats).sort((a, b) => b.count - a.count);

    } catch (err) {
      console.error("❌ Error en Analytics:", err);
    }

    // ==========================================
    // 3. INVENTARIO Y CATÁLOGO
    // ==========================================
    let allFlavors: any[] = [];
    let allProducts: any[] = [];
    let allPlans: any[] = [];

    try {
      // 👇 AGREGA "as any[]" AQUÍ AL FINAL 👇
      const rawFlavors = await db.flavor.findMany({
        include: {
          movements: { orderBy: { createdAt: 'desc' }, take: 100 },
          locationStocks: { include: { location: true } }
        },
        orderBy: { name: 'asc' }
      }) as any[];

      allFlavors = rawFlavors.map((f: any) => ({
        ...f,
        price: f.price ? Number(f.price) : 0,
        basePrice: f.basePrice ? Number(f.basePrice) : 0,
        wholesalePrice: f.wholesalePrice ? Number(f.wholesalePrice) : null,
        createdAt: f.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: f.updatedAt?.toISOString() || new Date().toISOString(),
        locationStocks: f.locationStocks.map((s: any) => ({
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
      allProducts = rawProducts.map((p: any) => ({
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

      allPlans = rawPlans.map((p: any) => ({
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
    let priceHistory: any[] = [];

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
        ...flavorPH.map((h: any) => ({
          id: h.id,
          createdAt: h.createdAt.toISOString(),
          oldPrice: Number(h.oldPrice || 0),
          newPrice: Number(h.newPrice || 0),
          flavor: { name: h.flavor.name },
          product: null,
          userId: h.userId
        })),
        ...productPH.map((h: any) => ({
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

    // =============================================
    // 5. LEADS, TRANSFERS, SUBSCRIPTIONS Y USUARIOS
    // =============================================
    let leads: any[] = [];
    let transfers: any[] = [];
    let allSubscriptions: any[] = [];
    let clients: any[] = [];
    let usersList: any[] = [];
    let giros: any[] = [];

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
        flavor: t.flavor ? {
          ...t.flavor,
          price: Number(t.flavor.price || 0),
          basePrice: Number(t.flavor.basePrice || 0),
          wholesalePrice: t.flavor.wholesalePrice ? Number(t.flavor.wholesalePrice) : null,
        } : null,
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
      clients = (await db.client.findMany({
          orderBy: { createdAt: 'desc' },
          include: { credits: true, giro: { select: { id: true, name: true } } }
        }))
        .map(c => ({
          ...c,
          creditLimit: Number(c.creditLimit || 0),
          creditUsed: Number(c.creditUsed || 0),
          globalDiscount: c.globalDiscount ? Number(c.globalDiscount) : null,
          createdAt: c.createdAt?.toISOString() || new Date().toISOString(),
          updatedAt: c.updatedAt?.toISOString() || new Date().toISOString(),
          credits: c.credits.map((cr: any) => ({
            ...cr,
            amount: Number(cr.amount || 0),
            dueDate: cr.dueDate?.toISOString() || null,
            createdAt: cr.createdAt?.toISOString() || new Date().toISOString(),
            updatedAt: cr.updatedAt?.toISOString() || new Date().toISOString(),
          })),
        }));
    } catch (err) {
      console.error("Error fetching clients:", err);
      clients = [];
    }

    try {
      if ((db as any).giro) {
        giros = await (db as any).giro.findMany({ orderBy: { name: 'asc' } });
      }
    } catch (err) {
      console.error("Error fetching giros:", err);
      giros = [];
    }

    // ==========================================
    // 7. SOLICITUDES DE AJUSTE DE INVENTARIO
    // ==========================================
    let adjustmentRequests: any[] = [];
    try {
      if ((db as any).adjustmentRequest) {
        adjustmentRequests = await (db as any).adjustmentRequest.findMany({
          where: { status: "PENDING" },
          include: {
            location: { select: { name: true } },
            flavor: { select: { name: true } },
          },
          orderBy: { createdAt: "asc" },
        }).then((reqs: any[]) =>
          reqs.map((r: any) => ({ ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() }))
        );
      }
    } catch (err) {
      console.error("Error fetching adjustment requests:", err);
      adjustmentRequests = [];
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
    const serializedOrders = filteredOrders.map((order: any) => ({
      ...order,
      // 1. Campos de la Orden
      total: Number(order.total || 0),
      subtotal: Number(order.subtotal || 0),
      shippingCost: Number(order.shippingCost || 0),
      createdAt: order.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: order.updatedAt?.toISOString() || new Date().toISOString(),
      cancelledAt: order.cancelledAt?.toISOString() || null,
      cancellationNote: order.cancellationNote || null,
      replacesOrderId: order.replacesOrderId || null,
      replacements: order.replacements || [],

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
          basePrice: Number(item.flavor.basePrice || 0),
          wholesalePrice: item.flavor.wholesalePrice ? Number(item.flavor.wholesalePrice) : null,
        } : null
      })) || []
    }));

    // ==========================================
    // FLAVORS CON PRECIOS (para tab de precios)
    // ==========================================
    let flavorsWithPricing: any[] = [];
    try {
      flavorsWithPricing = await db.flavor.findMany({
        where: { isArchived: false },
        include: {
          priceScales: { orderBy: { minQuantity: 'asc' } },
          discounts: { orderBy: { createdAt: 'desc' } },
          priceHistory: { take: 5, orderBy: { createdAt: 'desc' } }
        },
        orderBy: { name: 'asc' }
      }).then(flavors =>
        flavors.map(f => ({
          ...f,
          price: Number(f.price || 0),
          basePrice: Number(f.basePrice || 0),
          wholesalePrice: f.wholesalePrice ? Number(f.wholesalePrice) : null,
          priceScales: f.priceScales.map(ps => ({
            ...ps,
            price: Number(ps.price || 0)
          })),
          discounts: f.discounts.map(d => ({
            ...d,
            discountPercent: d.discountPercent || 0,
            fixedPrice: d.fixedPrice ? Number(d.fixedPrice) : null,
            validUntil: d.validUntil?.toISOString() || null
          })),
          priceHistory: f.priceHistory.map(ph => ({
            ...ph,
            oldBasePrice: Number(ph.oldBasePrice || 0),
            newBasePrice: Number(ph.newBasePrice || 0),
            oldWholesale: ph.oldWholesale ? Number(ph.oldWholesale) : null,
            newWholesale: ph.newWholesale ? Number(ph.newWholesale) : null,
            createdAt: ph.createdAt.toISOString()
          }))
        }))
      );
    } catch (err) {
      console.error("Error fetching flavors with pricing:", err);
      flavorsWithPricing = [];
    }

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
      userRole,
      transfers,
      allSubscriptions,
      users: usersList,
      clients,
      orders: serializedOrders,
      flavorsWithPricing,
      giros,
      adjustmentRequests,
    };

    // Verificar que stats existe y tiene las propiedades requeridas y más
    if (!dataObject.stats || typeof dataObject.stats !== 'object') {
      throw new Error("Stats object is invalid");
    }

    return <AdminDashboard data={dataObject} />;

  } catch (error) {
    console.error("Critical error in AdminPage:", error);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 max-w-lg w-full">
          <h2 className="text-2xl font-black text-red-800 mb-4">Error al cargar el panel</h2>
          <p className="text-red-700 mb-4">Ocurrió un error inesperado al cargar los datos.</p>
          <details className="bg-white p-4 rounded border border-red-200">
            <summary className="font-bold cursor-pointer text-red-700">Ver detalles</summary>
            <pre className="mt-2 text-xs text-gray-600 overflow-auto">
              {error instanceof Error ? error.message : String(error)}
            </pre>
          </details>
        </div>
      </div>
    );
  }
}