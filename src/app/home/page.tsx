import HomeLandingClient from "@/components/home/HomeLandingClient";
import { getWebCmsConfig } from "@/lib/web-cms";

export default async function LandingPage() {
  const config = await getWebCmsConfig();
  const page = config.pages.find((entry) => entry.key === "home") ?? config.pages[0];

  return <HomeLandingClient page={page} />;
}
