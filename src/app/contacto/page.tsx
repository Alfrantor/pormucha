import ContactoPageClient from "@/components/contacto/ContactoPageClient";
import { getWebCmsConfig } from "@/lib/web-cms";

export default async function ContactoPage() {
  const config = await getWebCmsConfig();
  const page = config.pages.find((entry) => entry.key === "contacto") ?? config.pages[0];

  return <ContactoPageClient page={page} />;
}
