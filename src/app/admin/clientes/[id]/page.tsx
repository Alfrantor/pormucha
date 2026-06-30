import { redirect } from "next/navigation";

export default async function ClienteLegacyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/admin/clients/${id}`);
}
