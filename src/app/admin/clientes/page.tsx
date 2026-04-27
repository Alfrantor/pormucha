import { db } from "@/lib/db";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ClientsTable } from "@/components/admin/ClientsTable";

interface ClientsPageProps {
  searchParams: {
    search?: string;
    classification?: string;
    offset?: string;
  };
}

export default async function ClientesPage({ searchParams }: ClientsPageProps) {
  // Verificar acceso
  const { sessionClaims } = await auth();
  const user = await currentUser();
  const userRole = (sessionClaims?.metadata as any)?.role;

  if (userRole !== "admin") {
    redirect("/perfil");
  }

  const resolvedParams = await searchParams;
  const search = resolvedParams?.search;
  const classification = resolvedParams?.classification;
  const offset = resolvedParams?.offset ? parseInt(resolvedParams.offset) : 0;

  try {
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

    const [clients, total] = await Promise.all([
      db.client.findMany({
        where,
        include: {
          addresses: { where: { isDefault: true }, take: 1 },
          orders: { select: { id: true }, take: 1 },
          credits: { where: { status: "PENDING" }, select: { id: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
        skip: offset,
      }),
      db.client.count({ where }),
    ]);

    // Serializar campos Decimal → number plain para Client Components
    const serializedClients = clients.map((c) => ({
      ...c,
      creditLimit: Number(c.creditLimit),
      creditUsed: Number(c.creditUsed),
      globalDiscount: Number(c.globalDiscount),
    }));

    return (
      <div className="p-8 max-w-7xl mx-auto">
        <ClientsTable clients={serializedClients} total={total} />
      </div>
    );
  } catch (error) {
    console.error("Error loading clients:", error);
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          Error al cargar los clientes. Por favor, intenta nuevamente.
        </div>
      </div>
    );
  }
}
