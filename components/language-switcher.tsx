"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { useTransition } from "react";

export function LanguageSwitcher() {
  const t = useTranslations("language");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  const switchTo = (next: string) => {
    if (next === locale) return;
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  };

  return (
    <div className="lang-switcher" role="group" aria-label={t("label")}>
      {routing.locales.map((l) => (
        <button
          key={l}
          type="button"
          className={`lang-opt ${l === locale ? "sel" : ""}`}
          aria-pressed={l === locale}
          disabled={pending}
          onClick={() => switchTo(l)}
        >
          {t(l as "mn" | "en")}
        </button>
      ))}
    </div>
  );
}
