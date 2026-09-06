import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Montserrat } from "next/font/google";
import { siteConfig } from "@openruleta/config";
import "./globals.css";

// To change the font, swap this import (see next/font/google) and update
// `--font-sans` in packages/ui/src/theme.css.
const brandFont = Montserrat({
  variable: "--font-brand",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: siteConfig.form.meta.title,
  description: siteConfig.form.meta.description,
  openGraph: {
    title: siteConfig.form.meta.ogTitle,
    description: siteConfig.form.meta.ogDescription,
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang={siteConfig.lang}
      className={`${brandFont.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col text-ink">{children}</body>
    </html>
  );
}
