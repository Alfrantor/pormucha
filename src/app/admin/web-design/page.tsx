import { WebCmsManager } from "@/components/admin/WebCmsManager";
import { getWebCmsConfig } from "@/lib/web-cms";

export default async function WebDesignPage() {
  const config = await getWebCmsConfig();

  return <WebCmsManager initialConfig={config} />;
}
