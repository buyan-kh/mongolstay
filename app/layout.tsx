import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "./uscis.css";

const serif = Instrument_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: {
    default: "Mongolstay — Submit in 4 minutes. Pay. Done.",
    template: "%s · Mongolstay",
  },
  description:
    "Three immigration filings, one click each. J-1 → F-1 and B-1/B-2 → F-1 from $2,000. Asylum from $4,000. Licensed immigration attorneys included.",
  openGraph: {
    title: "Mongolstay — Submit in 4 minutes. Pay. Done.",
    description: "Three immigration filings, one click each. Licensed attorneys included.",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${serif.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
