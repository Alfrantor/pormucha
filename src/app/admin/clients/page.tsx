import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ClientsTable } from "@/components/admin/ClientsTable";

interface ClientsPageProps {
  searchParams: {
    search?: string;
    classification?: string;
    offset?: string;
  };
}

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as any)?.role;

  if (role !== "admin") {
    redirect("/perfil");
  }

  const resolvedParams = await searchParams;
  const search = resolvedParams?.search;
  const classification = resolvedParams?.classification;
  const offset = resolvedParams?.offset ? parseInt(resolvedParams.offset) : 0;

  const where: any = {};

  if (search) {
    where.OR = [
      { fullName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { rfc: { contains: search, mode: "insensitive" } },
      { businessName: { contains: search, mode: "insensitive" } },
    ];
  }

  if (classification && classification !== "TODOS") {
    where.classification = classification;
  }

  const [clients, total, giros] = await Promise.all([
    db.client.findMany({
      where,
      include: {
        addresses: { where: { isDefault: true }, take: 1 },
        orders: { select: { id: true }, take: 1 },
        credits: { where: { status: "PENDING" }, select: { id: true } },
        giro: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      skip: offset,
    }),
    db.client.count({ where }),
    db.giro.findMany({ orderBy: { name: "asc" } }),
  ]);

  const serializedClients = clients.map((c) => ({
    ...c,
    creditLimit: Number(c.creditLimit),
    creditUsed: Number(c.creditUsed),
    globalDiscount: Number(c.globalDiscount),
  }));

  return (
    <div className="space-y-6">
      <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">CRM</p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Clientes</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Administra identidad, datos fiscales, crédito e historial de compra en un solo lugar.
            </p>
          </div>
          <div className="rounded-2xl bg-slate-950 px-4 py-3 text-white">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Coincidencias</p>
            <p className="text-2xl font-black">{total}</p>
          </div>
        </div>
      </section>

      <ClientsTable clients={serializedClients} total={total} giros={giros} />
    </div>
  );
}
