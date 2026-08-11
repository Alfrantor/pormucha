import NosotrosPageClient from "@/components/nosotros/NosotrosPageClient";
import { getWebCmsConfig } from "@/lib/web-cms";

export const metadata = {
  title: "Nosotros | Pormucha Kombucha",
  description: "Conoce nuestra historia y por qué cuidamos tu centro mediante fermentación real y procesos naturales.",
};

export default async function NosotrosPage() {
  const config = await getWebCmsConfig();
  const page = config.pages.find((entry) => entry.key === "nosotros") ?? config.pages[0];

  return <NosotrosPageClient page={page} />;
}
