import PrelaunchLandingClient from "@/components/prelaunch/PrelaunchLandingClient";
import { getWebCmsConfig } from "@/lib/web-cms";
import { redirect } from "next/navigation";

export default async function PreLanzamientoPage() {
  const config = await getWebCmsConfig();
  const page = config.pages.find((entry) => entry.key === "prelaunch") ?? config.pages[0];

  if (!page?.isPublished) {
    redirect("/home");
  }

  return <PrelaunchLandingClient page={page} />;
}
