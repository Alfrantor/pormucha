import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Roboto } from "next/font/google";
import { AdminShell } from "@/components/admin/AdminShell";

const roboto = Roboto({
  subsets: ["latin"],
  variable: "--font-admin",
  weight: ["400", "500", "700", "900"],
  display: "swap",
});

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
    <div className={`${roboto.variable} admin-roboto`}>
      <AdminShell>{children}</AdminShell>
    </div>
  );
}
