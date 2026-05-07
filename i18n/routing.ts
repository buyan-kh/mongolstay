import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["mn", "en"],
  defaultLocale: "mn",
  // "as-needed" keeps the default-locale URLs prefix-free (mongolstay.com/),
  // and English routes get prefixed (mongolstay.com/en/...).
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];
