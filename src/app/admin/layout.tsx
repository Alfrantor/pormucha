import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as any)?.role;

  if (role !== "admin" && role !== "vendedor") {
    redirect("/perfil");
  }

  return <AdminShell>{children}</AdminShell>;
}
