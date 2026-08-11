import SuscripcionesPageClient from "@/components/suscripciones/SuscripcionesPageClient";
import { db } from "@/lib/db";
import { getWebCmsConfig } from "@/lib/web-cms";

export default async function SuscripcionesPage() {
  const [config, plans] = await Promise.all([
    getWebCmsConfig(),
    db.plan.findMany({
      where: { isActive: true },
      include: { product: true },
      orderBy: { price: "asc" },
    }),
  ]);

  const page = config.pages.find((entry) => entry.key === "suscripciones") ?? config.pages[0];

  return <SuscripcionesPageClient page={page} plans={plans} />;
}
