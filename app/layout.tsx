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
  title: "Mongolstay",
  description: "Immigration filings, one click each.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${serif.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
