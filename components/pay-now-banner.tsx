"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "./icons";

type Props = {
  reference: string;
  amountCents: number;
  daysWaiting: number;
  zelleEmail: string;
  zelleName: string;
};

export function PayNowBanner({
  reference,
  amountCents,
  daysWaiting,
  zelleEmail,
  zelleName,
}: Props) {
  const t = useTranslations("dashboard.pay");
  const [busy, setBusy] = useState(false);
  const [zelleOpen, setZelleOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountUsd = (amountCents / 100).toLocaleString();

  const payCard = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/pay/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference }),
      });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      const data = (await res.json()) as { url?: string };
      if (!data.url) throw new Error("no checkout url");
      window.location.href = data.url;
    } catch (e) {
      setError((e as Error).message || t("errorGeneric"));
      setBusy(false);
    }
  };

  return (
    <section className="pay-banner" aria-label={t("banner.h")}>
      <div className="pay-banner-h-row">
        <div className="pay-banner-tag">
          <span className="pay-banner-dot" />
          {t("banner.eyebrow")}
        </div>
        {daysWaiting >= 1 && (
          <div className="pay-banner-urgency">
            {t("daysWaiting", { count: daysWaiting })}
          </div>
        )}
      </div>
      <h2 className="pay-banner-h">{t("banner.h")}</h2>
      <p className="pay-banner-sub">
        {t("banner.sub", { amount: `$${amountUsd}` })}
      </p>
      <ul className="pay-banner-list">
        <li>
          <Icon.Check style={{ width: 14, height: 14 }} /> {t("banner.v1")}
        </li>
        <li>
          <Icon.Check style={{ width: 14, height: 14 }} /> {t("banner.v2")}
        </li>
        <li>
          <Icon.Check style={{ width: 14, height: 14 }} /> {t("banner.v3")}
        </li>
      </ul>
      <div className="pay-banner-cta">
        <button
          type="button"
          className="btn btn-accent btn-lg"
          onClick={payCard}
          disabled={busy}
        >
          {busy ? t("redirecting") : t("payCard", { amount: `$${amountUsd}` })}
          <Icon.ArrowRight style={{ width: 14, height: 14 }} />
        </button>
        <button
          type="button"
          className="btn btn-lg btn-ghost"
          onClick={() => setZelleOpen((v) => !v)}
        >
          {zelleOpen ? t("zelleHide") : t("payZelle")}
        </button>
      </div>
      {error && (
        <div className="field-err" role="alert" style={{ marginTop: 8 }}>
          {error}
        </div>
      )}
      {zelleOpen && (
        <div className="pay-banner-zelle">
          <p style={{ margin: 0, fontSize: 13.5, color: "var(--ink-2)" }}>
            {t("zelleInstructions", {
              amount: `$${amountUsd}`,
              email: zelleEmail,
              name: zelleName,
            })}
          </p>
          <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--muted)" }}>
            {t("zelleMemo")}{" "}
            <span className="mono" style={{ color: "var(--ink)" }}>
              {reference}
            </span>
          </p>
        </div>
      )}
    </section>
  );
}
