import type { Metadata } from "next";
import { siteConfig } from "@openruleta/config";

import { RuletaApp } from "@/components/RuletaApp";

export const metadata: Metadata = {
  title: siteConfig.ruleta.meta.title,
};

export default function Page() {
  return <RuletaApp />;
}
