import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sessionClaims } = await auth();
  const metadata = sessionClaims?.metadata as { role?: string } | undefined;
  const role = metadata?.role;

  if (role !== "admin" && role !== "vendedor") {
    redirect("/perfil");
  }

  return (
    <div className="admin-roboto">
      <AdminShell>{children}</AdminShell>
    </div>
  );
}
