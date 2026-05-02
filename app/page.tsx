import type { Metadata } from "next";

import { LandingPageClient } from "@/components/LandingPageClient";
import { hasPaidAccess } from "@/lib/paywall";

export const metadata: Metadata = {
  title: "Visual SQL Builder for PMs and Analysts",
  description:
    "Build complex SQL with drag-drop, get instant query previews, and remove SQL bottlenecks for product and analytics teams."
};

export default async function HomePage() {
  const paid = await hasPaidAccess();

  return <LandingPageClient hasAccess={paid} />;
}
