import PrelaunchLandingClient from "@/components/prelaunch/PrelaunchLandingClient";
import { getWebCmsConfig } from "@/lib/web-cms";

export default async function PreLanzamientoPage() {
  const config = await getWebCmsConfig();
  const page = config.pages.find((entry) => entry.key === "prelaunch") ?? config.pages[0];

  return <PrelaunchLandingClient page={page} />;
}
