"use client";

import { useLocale, useTranslations } from "next-intl";
import { Icon } from "@/components/icons";
import { useFlow } from "@/components/flow-provider";
import { Link } from "@/i18n/navigation";
import { PRICES } from "@/lib/flow-data";

const ZELLE_EMAIL = process.env.NEXT_PUBLIC_ZELLE_EMAIL || "pay@mongolstay.com";
const OFFICE_ADDRESS = process.env.NEXT_PUBLIC_OFFICE_ADDRESS || "350 5th Avenue, Suite 4810, New York, NY 10118";
const FIRM_NAME = "Mongolstay PLLC";

export function FiledStep() {
  const { kind, state, reset } = useFlow();
  const t = useTranslations("flow.filed");
  const tInv = useTranslations("flow.invoice");
  const tPay = useTranslations("flow.pay");
  const tBtn = useTranslations("flow.buttons");
  const tSched = useTranslations("flow.schedule");
  const locale = useLocale();

  const reference = state.payment.reference || `MS-${(Math.random() * 1e6 | 0).toString().padStart(6, "0")}`;
  const { fee, uscisFee } = PRICES[kind];
  const total = fee + uscisFee;
  const method = state.payment.method ?? "card";
  const status = state.payment.status;

  const apptIso = state.schedule.appointment?.iso;
  const apptDate = apptIso ? new Date(apptIso) : null;
  const callbackWindow = state.schedule.callback?.window;

  const heading = (() => {
    if (state.schedule.mode === "callback") return t("hCallback");
    if (apptDate) {
      const weekday = apptDate.toLocaleDateString(locale, { weekday: "long" });
      return t("h", { weekday });
    }
    return t("hSoon");
  })();

  const today = new Date().toLocaleDateString(locale, {
    year: "numeric", month: "long", day: "numeric",
  });

  const handlePrint = () => {
    if (typeof window !== "undefined") window.print();
  };

  return (
    <div>
      {/* ── Confirmation (hidden when printing) ─────────────────────── */}
      <div className="success no-print">
        <div className="success-mark">
          <Icon.CheckCircle style={{ width: 56, height: 56, color: "var(--good)" }} />
        </div>
        <div className="success-h">{heading}</div>
        <div className="success-s">
          {t(kind === "asylum" ? "s_asylum" : "s_j1f1")}
        </div>

        <div className="success-card">
          <div className="success-row"><span>{t("reference")}</span><span className="mono">{reference}</span></div>
          <div className="success-row"><span>{t("filing")}</span><span>{kind === "asylum" ? "I-589" : "I-539"}</span></div>
          {state.schedule.mode === "appointment" && apptDate && (
            <div className="success-row">
              <span>{t("appointment")}</span>
              <span>
                {apptDate.toLocaleDateString(locale, { weekday: "long", month: "short", day: "numeric" })}
                {" · "}
                {apptDate.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" })}
                {" · "}
                {state.schedule.appointment?.channel === "video"
                  ? tSched("channel.videoH")
                  : tSched("channel.officeH")}
              </span>
            </div>
          )}
          {state.schedule.mode === "callback" && callbackWindow && (
            <div className="success-row">
              <span>{t("callback")}</span>
              <span>{tSched(`callback.windows.${callbackWindow}`)}</span>
            </div>
          )}
          <div className="success-row">
            <span>{tInv("paymentMethod")}</span>
            <span>
              {tPay(`methods.${method}.label`)}
              {" · "}
              <span style={{ color: status === "paid" ? "var(--good)" : "var(--warn)" }}>
                {status === "paid" ? tInv("statusPaid") : tInv("statusAwaiting")}
              </span>
            </span>
          </div>
        </div>

        <div className="flow-foot" style={{ marginTop: 24, justifyContent: "center", gap: 12 }}>
          <button type="button" className="btn btn-ghost btn-lg" onClick={handlePrint}>
            <Icon.File style={{ width: 14, height: 14 }} /> {tInv("print")}
          </button>
          <Link className="btn btn-accent btn-lg" href="/" onClick={reset}>
            {tBtn("backHome")} <Icon.ArrowRight style={{ width: 14, height: 14 }} />
          </Link>
        </div>
      </div>

      {/* ── Invoice (always rendered; main view when printing) ──────── */}
      <div className="invoice print-only-block">
        <div className="invoice-head">
          <div>
            <div className="invoice-firm">{FIRM_NAME}</div>
            <div className="invoice-firm-meta">{OFFICE_ADDRESS}</div>
          </div>
          <div className="invoice-head-right">
            <div className="invoice-label">{tInv("title")}</div>
            <div className="invoice-no mono">{reference}</div>
            <div className="invoice-date">{today}</div>
          </div>
        </div>

        <div className="invoice-parties">
          <div>
            <div className="invoice-block-h">{tInv("billTo")}</div>
            <div>{state.contact.name || "—"}</div>
            <div>{state.contact.email || "—"}</div>
            <div>{state.contact.phone || "—"}</div>
          </div>
          <div>
            <div className="invoice-block-h">{tInv("matter")}</div>
            <div>{kind === "asylum" ? tPay("asylumLine") : tPay("j1f1Line")}</div>
            {state.schedule.mode === "appointment" && apptDate && (
              <div className="invoice-meta-row">
                {tInv("appointment")}: {apptDate.toLocaleDateString(locale, { month: "short", day: "numeric" })}{" "}
                {apptDate.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" })}
              </div>
            )}
            {state.schedule.mode === "callback" && callbackWindow && (
              <div className="invoice-meta-row">
                {tInv("callback")}: {tSched(`callback.windows.${callbackWindow}`)}
              </div>
            )}
          </div>
        </div>

        <table className="invoice-table">
          <thead>
            <tr>
              <th>{tInv("description")}</th>
              <th className="num">{tInv("amount")}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                {kind === "asylum" ? tPay("asylumLine") : tPay("j1f1Line")}
                <div className="invoice-sub">{tInv("attorneyIncl")}</div>
              </td>
              <td className="num mono">${fee.toLocaleString()}.00</td>
            </tr>
            {uscisFee > 0 && (
              <tr>
                <td>{tPay("uscisFee")}</td>
                <td className="num mono">${uscisFee}.00</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td>{tInv("total")}</td>
              <td className="num mono"><strong>${total.toLocaleString()}.00</strong></td>
            </tr>
          </tfoot>
        </table>

        <div className="invoice-payment">
          <div className="invoice-block-h">{tInv("paymentInstructions")}</div>
          <div className="invoice-payment-row">
            <span>{tInv("paymentMethod")}</span>
            <span><strong>{tPay(`methods.${method}.label`)}</strong></span>
          </div>
          <div className="invoice-payment-row">
            <span>{tInv("status")}</span>
            <span><strong>{status === "paid" ? tInv("statusPaid") : tInv("statusAwaiting")}</strong></span>
          </div>
          {method === "zelle" && status !== "paid" && (
            <div className="invoice-payment-note">
              {tInv("zelleNote", { email: ZELLE_EMAIL, memo: reference })}
            </div>
          )}
          {method === "cash" && status !== "paid" && (
            <div className="invoice-payment-note">
              {tInv("cashNote", { reference })}
            </div>
          )}
        </div>

        <div className="invoice-foot">
          {tInv("foot")}
        </div>
      </div>
    </div>
  );
}
