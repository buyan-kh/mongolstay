"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Icon } from "./icons";

type Item = { href: string; key: "filings" | "messages" | "documents" | "profile"; icon: keyof typeof Icon };

const ITEMS: Item[] = [
  { href: "/dashboard",            key: "filings",   icon: "File" },
  { href: "/dashboard/messages",   key: "messages",  icon: "ArrowRight" },
  { href: "/dashboard/documents",  key: "documents", icon: "Shield" },
  { href: "/dashboard/profile",    key: "profile",   icon: "Lock" },
];

export function DashboardNav({ unreadCount = 0 }: { unreadCount?: number }) {
  const t = useTranslations("dashboardNav");
  const pathname = usePathname() ?? "";

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      // Highlight 'Filings' for /dashboard and /dashboard/[reference] (filing detail)
      return pathname === "/dashboard" || /^\/dashboard\/[A-Za-z0-9-]+$/.test(pathname);
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="dnav" aria-label={t("aria")}>
      {ITEMS.map((item) => {
        const I = Icon[item.icon];
        const active = isActive(item.href);
        return (
          <Link
            key={item.key}
            href={item.href}
            className={`dnav-item ${active ? "sel" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <I style={{ width: 16, height: 16 }} />
            <span>{t(item.key)}</span>
            {item.key === "messages" && unreadCount > 0 && (
              <span className="dnav-badge">{unreadCount}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
