"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BrandMark, Icon } from "@/components/icons";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errorPage");

  useEffect(() => {
    // Surfaces in dev console; in prod, hook this up to an error tracker.
    console.error(error);
  }, [error]);

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: "center" }}>
        <div className="auth-head" style={{ alignItems: "center" }}>
          <BrandMark size={32} />
          <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--warn)", letterSpacing: ".06em", textTransform: "uppercase" }}>
            {error.digest ? `Error · ${error.digest.slice(0, 8)}` : "Error"}
          </div>
          <h1 className="auth-title">{t("title")}</h1>
          <p className="auth-sub" style={{ maxWidth: "36ch", marginInline: "auto" }}>{t("body")}</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexDirection: "column" }}>
          <button type="button" className="btn btn-accent btn-lg" onClick={reset}>
            {t("tryAgain")}
          </button>
          <Link className="btn btn-ghost btn-lg" href="/">
            <Icon.ArrowLeft style={{ width: 14, height: 14 }} /> {t("home")}
          </Link>
        </div>
      </div>
    </div>
  );
}
