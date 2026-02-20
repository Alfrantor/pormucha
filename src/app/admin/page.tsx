import { db } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import { revalidatePath } from "next/cache";
import { DateRangeFilter } from "@/components/admin/date-range-filter";
import { InventoryTransferForm } from "@/components/admin/inventory-transfer-form";
import { toggleStatus } from "@/actions/toggle-status";

// --- TYPES ---
type AnalyticsData = {
  totalRevenue: number;
  totalOrders: number;
  flavorStats: Record<string, { name: string; count: number }>;
  packStats: Record<string, { name: string; count: number }>;
};

// --- INTERFACE PARA LOS PARÁMETROS DE URL ---
interface AdminPageProps {
  searchParams: {
    from?: string;
    to?: string;
  };
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const user = await currentUser();
  const userEmail = user?.emailAddresses[0]?.emailAddress;
  
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
  // 2. OBTENCIÓN DE DATOS ANALYTICS
  // ==========================================
  const filteredOrders = await db.order.findMany({
    where: dateFilter,
    include: { orderItems: { include: { product: true } } },
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
      const packName = item.product.name;
      if (!stats.packStats[packName]) stats.packStats[packName] = { name: packName, count: 0 };
      stats.packStats[packName].count += 1;
      totalPacksSold += 1;

      const selection = item.flavorSelection as Record<string, number>;
      if (selection) {
        Object.entries(selection).forEach(([slug, qty]) => {
          if (qty > 0) {
            if (!stats.flavorStats[slug]) stats.flavorStats[slug] = { name: slug, count: 0 };
            stats.flavorStats[slug].count += qty;
            totalFlavorsSold += qty;
          }
        });
      }
    });
  });

  const topFlavors = Object.values(stats.flavorStats).sort((a, b) => b.count - a.count);
  const topPacks = Object.values(stats.packStats).sort((a, b) => b.count - a.count);

  // ==========================================
  // 3. INVENTARIO Y PRODUCTOS
  // ==========================================
  const rawFlavors = await db.flavor.findMany({ 
    include: { 
        movements: { orderBy: { createdAt: 'desc' }, take: 5 },
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
  
  const allProducts = await db.product.findMany({ orderBy: { price: 'asc' } });
  
  const priceHistory = await db.priceHistory.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: { product: true, flavor: true }
  });

  // ==========================================
  // SERVER ACTIONS
  // ==========================================

  async function createLocation(formData: FormData) {
    "use server";
    const name = formData.get("name") as string;
    const address = formData.get("address") as string;
    await db.location.create({ data: { name, address, isDefault: false } });
    revalidatePath("/admin");
    revalidatePath("/pos");
  }

  async function registerMovement(formData: FormData) {
    "use server";
    const flavorId = formData.get("flavorId") as string;
    const type = formData.get("type") as "IN" | "OUT";
    const quantity = parseInt(formData.get("quantity") as string);
    const reason = formData.get("reason") as string;
    const adminEmail = formData.get("adminEmail") as string;
    const locationId = formData.get("locationId") as string;

    if (quantity <= 0) return;

    await db.inventoryMovement.create({
      data: { flavorId, locationId, type, quantity, reason, userId: adminEmail }
    });

    const operation = type === "IN" ? { increment: quantity } : { decrement: quantity };
    
    await db.stock.upsert({
      where: { flavorId_locationId: { flavorId, locationId } },
      create: { flavorId, locationId, quantity: type === "IN" ? quantity : 0 },
      update: { quantity: operation }
    });

    revalidatePath("/admin");
  }

  async function updatePackPrice(formData: FormData) {
    "use server";
    const productId = formData.get("productId") as string;
    const newPrice = parseFloat(formData.get("newPrice") as string);
    const adminEmail = formData.get("adminEmail") as string;
    const currentProduct = await db.product.findUnique({ where: { id: productId } });
    if (!currentProduct || Number(currentProduct.price) === newPrice) return;
    await db.priceHistory.create({ data: { productId, oldPrice: currentProduct.price, newPrice: newPrice, userId: adminEmail } });
    await db.product.update({ where: { id: productId }, data: { price: newPrice } });
    revalidatePath("/admin");
  }

  async function updateFlavorPrice(formData: FormData) {
    "use server";
    const flavorId = formData.get("flavorId") as string;
    const newPrice = parseFloat(formData.get("newPrice") as string);
    const adminEmail = formData.get("adminEmail") as string;
    const currentFlavor = await db.flavor.findUnique({ where: { id: flavorId } });
    if (!currentFlavor || Number(currentFlavor.price) === newPrice) return;
    await db.priceHistory.create({ data: { flavorId, oldPrice: currentFlavor.price, newPrice: newPrice, userId: adminEmail } });
    await db.flavor.update({ where: { id: flavorId }, data: { price: newPrice } });
    revalidatePath("/admin");
  }

  async function createProduct(formData: FormData) {
    "use server";
    const name = formData.get("name") as string;
    const price = parseFloat(formData.get("price") as string);
    const quantity = parseInt(formData.get("quantity") as string);
    await db.product.create({ data: { name, price, quantity, stock: 0 } });
    revalidatePath("/admin");
  }

  async function createFlavor(formData: FormData) {
    "use server";
    const name = formData.get("name") as string;
    const slug = formData.get("slug") as string;
    const price = parseFloat(formData.get("price") as string);
    const stock = parseInt(formData.get("stock") as string);
    await db.flavor.create({ data: { name, slug, price, stock } });
    revalidatePath("/admin");
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-20">
      
      {/* HEADER */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
              <span className="bg-black text-white px-2 py-1 rounded text-sm">ADMIN</span> DASHBOARD
            </h1>
          </div>
          <UserButton showName/>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-12">

        {/* SECCIÓN 1: ANALÍTICA */}
        <section>
          <div className="flex flex-col md:flex-row justify-between items-end mb-6">
            <h2 className="text-2xl font-black">1. Reporte de Ventas</h2>
            <p className="text-sm text-gray-500">
                {from && to ? `Mostrando del ${from} al ${to}` : "Mostrando histórico completo"}
            </p>
          </div>
          <DateRangeFilter />
          
           <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-black text-white p-6 rounded-2xl shadow-lg">
              <p className="text-xs font-bold opacity-70 uppercase">Ingresos (Filtrado)</p>
              <p className="text-3xl font-black text-green-400">${stats.totalRevenue.toLocaleString()}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border shadow-sm">
              <p className="text-xs font-bold text-gray-400 uppercase">Pedidos</p>
              <p className="text-3xl font-black">{stats.totalOrders}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border shadow-sm">
                <p className="text-xs font-bold text-gray-400 uppercase">Sabor #1</p>
                <p className="text-xl font-black truncate">{topFlavors[0]?.name || "-"}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border shadow-sm">
                <p className="text-xs font-bold text-gray-400 uppercase">Pack #1</p>
                <p className="text-xl font-black truncate">{topPacks[0]?.name || "-"}</p>
            </div>
          </div>

          {/* GRÁFICAS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
                <h3 className="text-lg font-black mb-6 flex items-center gap-2">🍍 Top Sabores (% Ventas)</h3>
                <div className="space-y-5">
                    {topFlavors.map((f, idx) => {
                        const percentage = totalFlavorsSold > 0 ? ((f.count / totalFlavorsSold) * 100).toFixed(1) : 0;
                        return (
                            <div key={idx} className="group">
                                <div className="flex justify-between text-sm font-bold mb-1">
                                    <span className="capitalize text-gray-800">{idx + 1}. {f.name}</span>
                                    <span className="text-gray-500">{percentage}% ({f.count})</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                                    <div className="h-full bg-blue-500 rounded-full transition-all duration-500 group-hover:bg-blue-600" style={{ width: `${percentage}%` }}></div>
                                </div>
                            </div>
                        )
                    })}
                    {topFlavors.length === 0 && <p className="text-gray-400 text-center italic">Sin datos.</p>}
                </div>
            </div>

            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
                <h3 className="text-lg font-black mb-6 flex items-center gap-2">📦 Top Packs (% Ventas)</h3>
                <div className="space-y-5">
                    {topPacks.map((p, idx) => {
                        const percentage = totalPacksSold > 0 ? ((p.count / totalPacksSold) * 100).toFixed(1) : 0;
                        return (
                            <div key={idx} className="group">
                                <div className="flex justify-between text-sm font-bold mb-1">
                                    <span className="text-gray-800">{idx + 1}. {p.name}</span>
                                    <span className="text-gray-500">{percentage}% ({p.count})</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                                    <div className="h-full bg-black rounded-full transition-all duration-500" style={{ width: `${percentage}%` }}></div>
                                </div>
                            </div>
                        )
                    })}
                    {topPacks.length === 0 && <p className="text-gray-400 text-center italic">Sin datos.</p>}
                </div>
            </div>
          </div>
        </section>

        {/* SECCIÓN 2: GESTIÓN DE PRECIOS */}
        <section className="bg-white rounded-[2rem] shadow-sm border p-8">
            <h2 className="text-2xl font-black text-blue-700 mb-6">2. Precios & Gestión de Catálogo</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* PACKS */}
                <div>
                    <h3 className="font-bold text-gray-900 mb-4 border-b pb-2">📦 Packs (Venta)</h3>
                    <div className="space-y-3">
                        {allProducts.map(p => (
                            <div key={p.id} className={`flex justify-between items-center bg-gray-50 p-3 rounded-xl ${p.isArchived ? 'opacity-50 grayscale bg-gray-100' : ''}`}>
                                <div>
                                    <p className="font-bold text-sm">{p.name} {p.isArchived && '(Inactivo)'}</p>
                                    <p className="text-xs text-gray-400">{p.quantity} pzs</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <form action={updatePackPrice} className="flex items-center gap-1">
                                        <input type="hidden" name="productId" value={p.id} />
                                        <input type="hidden" name="adminEmail" value={userEmail || ""} />
                                        <input name="newPrice" type="number" step="0.01" defaultValue={Number(p.price)} className="w-16 p-1 text-center font-bold bg-white border rounded text-xs" disabled={p.isArchived} />
                                        <button title="Guardar" disabled={p.isArchived} className="bg-blue-600 text-white p-1 rounded hover:bg-blue-700 disabled:bg-gray-400">💾</button>
                                    </form>
                                    <form action={toggleStatus}>
                                        <input type="hidden" name="id" value={p.id} />
                                        <input type="hidden" name="model" value="product" />
                                        <input type="hidden" name="currentStatus" value={String(p.isArchived)} />
                                        <button className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-white ${p.isArchived ? 'bg-green-500 hover:bg-green-600' : 'bg-red-400 hover:bg-red-500'}`} title={p.isArchived ? "Reactivar" : "Archivar"}>
                                            {p.isArchived ? '↺' : '✕'}
                                        </button>
                                    </form>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* BOTELLAS */}
                <div>
                    <h3 className="font-bold text-gray-900 mb-4 border-b pb-2">🍾 Botellas (Unitario)</h3>
                    <div className="space-y-3">
                        {allFlavors.map(f => (
                            <div key={f.id} className={`flex justify-between items-center bg-gray-50 p-3 rounded-xl ${f.isArchived ? 'opacity-50 grayscale bg-gray-100' : ''}`}>
                                <div>
                                    <p className="font-bold text-sm">{f.name} {f.isArchived && '(Inactivo)'}</p>
                                    <p className="text-xs text-gray-400 font-mono">{f.slug}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <form action={updateFlavorPrice} className="flex items-center gap-1">
                                        <input type="hidden" name="flavorId" value={f.id} />
                                        <input type="hidden" name="adminEmail" value={userEmail || ""} />
                                        <input name="newPrice" type="number" step="0.01" defaultValue={Number(f.price)} className="w-16 p-1 text-center font-bold bg-white border rounded text-xs" disabled={f.isArchived} />
                                        <button title="Guardar" disabled={f.isArchived} className="bg-blue-600 text-white p-1 rounded hover:bg-blue-700 disabled:bg-gray-400">💾</button>
                                    </form>
                                    <form action={toggleStatus}>
                                        <input type="hidden" name="id" value={f.id} />
                                        <input type="hidden" name="model" value="flavor" />
                                        <input type="hidden" name="currentStatus" value={String(f.isArchived)} />
                                        <button className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-white ${f.isArchived ? 'bg-green-500 hover:bg-green-600' : 'bg-red-400 hover:bg-red-500'}`} title={f.isArchived ? "Reactivar" : "Archivar"}>
                                            {f.isArchived ? '↺' : '✕'}
                                        </button>
                                    </form>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            
            {/* LOG HISTORIAL (ERROR ARREGLADO AQUÍ: SE USÓ &rarr;) */}
            <div className="mt-10 bg-gray-50 rounded-xl p-6 border border-gray-200">
                <h3 className="text-sm font-black text-gray-500 uppercase mb-4">📈 Log de Cambios</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-400 uppercase bg-gray-100">
                            <tr>
                                <th className="px-4 py-2">Fecha</th>
                                <th className="px-4 py-2">Producto</th>
                                <th className="px-4 py-2">Usuario</th>
                                <th className="px-4 py-2">Cambio</th>
                                <th className="px-4 py-2">Var.</th>
                            </tr>
                        </thead>
                        <tbody>
                            {priceHistory.map(h => {
                                const isRise = Number(h.newPrice) > Number(h.oldPrice);
                                return (
                                    <tr key={h.id} className="border-b border-gray-200 hover:bg-white">
                                        <td className="px-4 py-3 font-mono text-xs">{new Date(h.createdAt).toLocaleDateString()}</td>
                                        <td className="px-4 py-3 font-bold">{h.product?.name || h.flavor?.name}</td>
                                        <td className="px-4 py-3 text-xs text-gray-500">{h.userId}</td>
                                        <td className="px-4 py-3">
                                            {/* CORRECCIÓN DE PARSEO: Usamos &rarr; */}
                                            <span className="line-through text-gray-400 mr-2">${Number(h.oldPrice)}</span>
                                            &rarr; <span className="font-bold ml-2">${Number(h.newPrice)}</span>
                                        </td>
                                        <td className={`px-4 py-3 font-bold ${isRise ? 'text-green-600' : 'text-red-500'}`}>{isRise ? '↑' : '↓'}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>

        {/* SECCIÓN 3: LOGÍSTICA E INVENTARIOS */}
        <section className="space-y-8">
            <h2 className="text-2xl font-black text-gray-900">3. Logística Multialmacén</h2>

            {/* A. TRASPASOS (SOLO ACTIVOS) */}
            <InventoryTransferForm 
                locations={activeLocations} 
                flavors={activeFlavors} 
                userEmail={userEmail || ""} 
            />

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                {/* B. INVENTARIO DIARIO (SOLO ACTIVOS) */}
                <div className="space-y-4">
                    <h3 className="font-bold text-gray-500 uppercase text-xs">Existencias (Activas)</h3>
                    {activeFlavors.map(flavor => (
                        <div key={flavor.id} className="border rounded-2xl p-5 bg-white shadow-sm">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h4 className="font-black text-gray-900 text-lg">{flavor.name}</h4>
                                    <div className="flex gap-2 mt-2 flex-wrap">
                                        {activeLocations.map(loc => {
                                            const qty = flavor.locationStocks.find(s => s.locationId === loc.id)?.quantity || 0;
                                            return (
                                                <div key={loc.id} className={`px-2 py-1 rounded text-xs font-bold border ${qty > 0 ? 'bg-gray-50 border-gray-300' : 'bg-red-50 text-red-400 border-red-100'}`}>
                                                    {loc.name.split(' ')[0]}: {qty}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                            
                            <form action={registerMovement} className="grid grid-cols-12 gap-2 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                <input type="hidden" name="flavorId" value={flavor.id} />
                                <input type="hidden" name="adminEmail" value={userEmail || ""} />
                                
                                <div className="col-span-12 md:col-span-4">
                                    <select name="locationId" className="w-full p-2 bg-white rounded-lg text-xs font-bold border outline-none">
                                        {activeLocations.map(loc => (
                                            <option key={loc.id} value={loc.id}>{loc.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-span-6 md:col-span-3">
                                    <select name="type" className="w-full p-2 bg-white rounded-lg text-xs font-bold border outline-none"><option value="IN">📥 Entrada</option><option value="OUT">📤 Salida</option></select>
                                </div>
                                <div className="col-span-6 md:col-span-2">
                                    <input name="quantity" type="number" min="1" placeholder="#" className="w-full p-2 bg-white rounded-lg text-xs font-bold border text-center outline-none" required />
                                </div>
                                <div className="col-span-12 md:col-span-3 flex gap-2">
                                    <input name="reason" type="text" placeholder="Motivo" className="flex-1 min-w-0 p-2 bg-white rounded-lg text-xs border outline-none" required />
                                    <button type="submit" className="bg-black text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-gray-800 shrink-0">OK</button>
                                </div>
                            </form>
                        </div>
                    ))}
                </div>

                {/* COLUMNA DERECHA: CREACIÓN Y GESTIÓN DE SUCURSALES */}
                <div className="space-y-6">
                    {/* GESTIÓN DE SUCURSALES */}
                    <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100">
                        <h4 className="font-bold text-purple-800 mb-3 text-sm uppercase">Nueva Sucursal / Evento</h4>
                        <form action={createLocation} className="grid grid-cols-1 gap-3">
                            <input name="name" placeholder="Nombre (Ej: Stand Boda)" className="p-2 rounded bg-white border text-sm" required />
                            <input name="address" placeholder="Dirección (Opcional)" className="p-2 rounded bg-white border text-sm" />
                            <button className="bg-purple-600 text-white p-2 rounded font-bold text-sm hover:bg-purple-700">+ Crear Sucursal</button>
                        </form>
                        
                        <div className="mt-4 border-t pt-4">
                            <p className="text-xs font-bold text-purple-400 uppercase mb-2">Gestión de Sucursales:</p>
                            <div className="flex flex-col gap-2">
                                {allLocations.map(loc => (
                                    <div key={loc.id} className={`flex justify-between items-center bg-white p-2 rounded border ${loc.isArchived ? 'opacity-60 bg-gray-50' : ''}`}>
                                        <span className={`text-xs font-bold ${loc.isDefault ? 'text-yellow-600' : 'text-purple-700'}`}>
                                            {loc.name} {loc.isDefault && '★'} {loc.isArchived && '(Inactivo)'}
                                        </span>
                                        {!loc.isDefault && (
                                            <form action={toggleStatus}>
                                                <input type="hidden" name="id" value={loc.id} />
                                                <input type="hidden" name="model" value="location" />
                                                <input type="hidden" name="currentStatus" value={String(loc.isArchived)} />
                                                <button className={`w-6 h-6 flex items-center justify-center rounded text-xs text-white font-bold ${loc.isArchived ? 'bg-green-500 hover:bg-green-600' : 'bg-red-400 hover:bg-red-500'}`} title={loc.isArchived ? "Reactivar" : "Archivar"}>
                                                    {loc.isArchived ? '↺' : '✕'}
                                                </button>
                                            </form>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* CREAR BOTELLA */}
                    <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                         <h4 className="font-bold text-blue-800 mb-3 text-sm uppercase">Nuevo Sabor</h4>
                         <form action={createFlavor} className="grid grid-cols-2 gap-3">
                            <input name="name" placeholder="Nombre" className="col-span-2 p-2 rounded bg-white border text-sm" required />
                            <input name="slug" placeholder="Slug (ej: pina)" className="p-2 rounded bg-white border text-sm" required />
                            <input name="stock" type="number" placeholder="Stock Inicial" className="p-2 rounded bg-white border text-sm" required />
                            <input name="price" type="number" step="0.01" placeholder="Precio ($)" className="col-span-2 p-2 rounded bg-white border text-sm" required />
                            <button className="col-span-2 bg-blue-600 text-white p-2 rounded font-bold text-sm hover:bg-blue-700">Crear Botella</button>
                        </form>
                    </div>

                    {/* CREAR PACK */}
                    <div className="bg-gray-100 p-6 rounded-2xl border border-gray-200">
                        <h4 className="font-bold text-gray-800 mb-3 text-sm uppercase">Nuevo Pack</h4>
                        <form action={createProduct} className="grid grid-cols-2 gap-3">
                            <input name="name" placeholder="Nombre Pack" className="col-span-2 p-2 rounded bg-white border text-sm" required />
                            <input name="price" type="number" step="0.01" placeholder="Precio ($)" className="p-2 rounded bg-white border text-sm" required />
                            <input name="quantity" type="number" placeholder="Cant. Bebidas" className="p-2 rounded bg-white border text-sm" required />
                            <button className="col-span-2 bg-black text-white p-2 rounded font-bold text-sm hover:bg-gray-800">Crear Pack</button>
                        </form>
                    </div>
                </div>
            </div>
        </section>

      </main>
    </div>
  );
}