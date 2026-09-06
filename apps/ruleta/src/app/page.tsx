import type { Metadata } from "next";
import { siteConfig } from "@openruleta/config";

import { RuletaClient } from "@/components/RuletaClient";

export const metadata: Metadata = {
  title: siteConfig.ruleta.meta.title,
};

export default function Page() {
  return <RuletaClient />;
}
