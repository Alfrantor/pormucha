import { auth } from "@clerk/nextjs/server";
import { createClerkClient } from "@clerk/backend";
import { redirect } from "next/navigation";
import UserManagement from "@/components/admin/UserManagement";

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export default async function UsersPage() {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as any)?.role;

  if (role !== "admin") {
    redirect("/perfil");
  }

  const clerkUsersResponse = await clerk.users.getUserList();
  const users = clerkUsersResponse.data.map((u) => ({
    id: u.id,
    email: u.emailAddresses[0]?.emailAddress || "Sin email",
    firstName: u.firstName || "Usuario",
    lastName: u.lastName || "",
    role: (u.publicMetadata as any)?.role || "cliente",
    imageUrl: u.imageUrl,
  }));

  return (
    <div className="space-y-6">
      <section className="rounded-[1.8rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Equipo</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Usuarios</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Miembros del equipo interno, roles y visibilidad de acceso.
        </p>
      </section>

      <UserManagement data={users} />
    </div>
  );
}
