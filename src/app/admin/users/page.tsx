import { auth } from "@clerk/nextjs/server";
import { createClerkClient } from "@clerk/backend";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import ProductionPinCard from "@/components/admin/ProductionPinCard";
import StaffUserManagement from "@/components/admin/StaffUserManagement";

type AdminSessionClaims = {
  metadata?: {
    role?: string;
  };
};

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

type ClerkUserSummary = {
  id: string;
  fullName: string;
  email: string | null;
  role: string;
};

async function fetchAllClerkUsers() {
  const users: Awaited<ReturnType<typeof clerk.users.getUserList>>["data"] = [];
  const limit = 100;
  let offset = 0;

  while (true) {
    const response = await clerk.users.getUserList({ limit, offset });
    users.push(...response.data);

    if (response.data.length < limit) break;
    offset += limit;
  }

  return users;
}

export default async function UsersPage() {
  const { sessionClaims } = await auth();
  const role = (sessionClaims as AdminSessionClaims | null)?.metadata?.role;

  if (role !== "admin") {
    redirect("/perfil");
  }

  const [clerkUsers, clients] = await Promise.all([
    fetchAllClerkUsers(),
    db.client.findMany({
      select: {
        email: true,
        clerkUserId: true,
      },
    }),
  ]);

  const clientEmails = new Set(
    clients.map((client) => client.email?.toLowerCase()).filter(Boolean) as string[],
  );
  const clientClerkIds = new Set(
    clients.map((client) => client.clerkUserId).filter(Boolean) as string[],
  );

  const clerkAdmins = clerkUsers.filter((user) => {
    const userRole = String((user.publicMetadata as { role?: string } | null)?.role || "").toLowerCase();
    const email = user.emailAddresses[0]?.emailAddress?.toLowerCase() ?? null;
    return userRole === "admin" && !clientClerkIds.has(user.id) && (!email || !clientEmails.has(email));
  });

  const clerkSeedUsers: ClerkUserSummary[] = clerkAdmins.map((user) => ({
    id: user.id,
    fullName: `${user.firstName || "Usuario"} ${user.lastName || ""}`.trim(),
    email: user.emailAddresses[0]?.emailAddress || null,
    role: "admin",
  }));

  for (const user of clerkSeedUsers) {
    if (!user.email) continue;

    await db.staffUser.upsert({
      where: { email: user.email },
      update: {
        clerkUserId: user.id,
        fullName: user.fullName,
        role: user.role,
      },
      create: {
        clerkUserId: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
  }

  const staffUsersFresh = await db.staffUser.findMany({
    orderBy: [{ createdAt: "desc" }],
  });

  const visibleStaffUsers = staffUsersFresh.filter((user) => {
    if (!user.clerkUserId) return true;
    return clerkAdmins.some((clerkUser) => clerkUser.id === user.clerkUserId);
  });

  return (
    <div className="space-y-6">
      <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Equipo</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Usuarios</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Aquí se muestran los usuarios con rol administrador de Clerk y los usuarios dados de alta manualmente en el ERP.
        </p>
      </section>

      <ProductionPinCard />

      <StaffUserManagement users={visibleStaffUsers} />
    </div>
  );
}
