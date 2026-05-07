import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { Icon, BrandMark } from "@/components/icons";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SignOutButton } from "@/components/auth-forms";
import { MarkPaidButton, RefundButton, ReplyForm } from "@/components/admin-actions";
import { requireAttorney } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase/server";
import type { IntakeMessageRow, IntakeRow } from "@/lib/supabase/types";

type IntakeWithDocs = IntakeRow & {
  intake_documents: {
    id: string;
    doc_id: string;
    original_filename: string | null;
    storage_path: string;
    created_at: string;
  }[];
};

export default async function Page({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  const user = await requireAttorney();
  const supabase = await getServerSupabase();
  const t = await getTranslations("admin");
  const tDash = await getTranslations("dashboard");
  const tPay = await getTranslations("flow.pay");
  const tInv = await getTranslations("flow.invoice");
  const tSched = await getTranslations("flow.schedule");
  const locale = await getLocale();

  const { data: intakeRaw } = await supabase
    .from("intakes")
    .select(`*, intake_documents (id, doc_id, original_filename, storage_path, created_at)`)
    .eq("reference", reference)
    .maybeSingle();

  if (!intakeRaw) notFound();
  const intake = intakeRaw as unknown as IntakeWithDocs;

  const { data: messagesRaw } = await supabase
    .from("intake_messages")
    .select("*")
    .eq("intake_id", intake.id)
    .order("created_at", { ascending: false });
  const messageList = (messagesRaw ?? []) as IntakeMessageRow[];

  const apptDate =
    intake.schedule_mode === "appointment" && intake.appointment_at
      ? new Date(intake.appointment_at)
      : null;

  return (
    <div className="dash">
      <header className="dash-bar">
        <Link className="brand" href="/admin">
          <BrandMark />
          <span>mongolstay<span style={{ color: "var(--muted)", fontWeight: 400 }}>.com</span></span>
        </Link>
        <span className="dash-card-lbl">{t("badge")}</span>
        <div style={{ flex: 1 }} />
        <LanguageSwitcher />
        <span style={{ color: "var(--muted)", fontSize: 13 }}>{user.email}</span>
        <SignOutButton />
      </header>

      <main className="dash-main dash-detail">
        <Link className="flow-back" href="/admin">
          <Icon.ArrowLeft style={{ width: 14, height: 14 }} /> {t("backToList")}
        </Link>

        <div className="dash-head">
          <h1 className="flow-title">{intake.client_name || "—"}</h1>
          <p className="flow-sub">
            {intake.client_email}{intake.client_phone ? ` · ${intake.client_phone}` : ""}
          </p>
          <p className="flow-sub mono">
            {intake.reference} · {intake.kind === "asylum" ? "I-589" : "I-539"} · {intake.kind}
          </p>
        </div>

        <section className="dash-section">
          <div className="dash-section-h">{t("statusH")}</div>
          <div className="dash-status-grid">
            <div>
              <div className="dash-card-lbl">{tInv("status")}</div>
              <div className={`dash-status dash-status-${intake.payment_status}`}>{intake.payment_status}</div>
            </div>
            <div>
              <div className="dash-card-lbl">{tInv("paymentMethod")}</div>
              <div>{intake.payment_method ? tPay(`methods.${intake.payment_method}.label`) : "—"}</div>
            </div>
            <div>
              <div className="dash-card-lbl">{tDash("amount")}</div>
              <div className="mono">${(((intake.amount_cents as number) ?? 0) / 100).toLocaleString()}.00</div>
            </div>
            <div>
              <div className="dash-card-lbl">{tDash("submitted")}</div>
              <div>{new Date(intake.created_at).toLocaleString(locale, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 18, flexWrap: "wrap" }}>
            <MarkPaidButton reference={intake.reference} currentStatus={intake.payment_status} />
            <RefundButton
              reference={intake.reference}
              currentStatus={intake.payment_status}
              paymentMethod={intake.payment_method}
            />
          </div>
        </section>

        <section className="dash-section">
          <div className="dash-section-h">{tDash("scheduleH")}</div>
          {intake.schedule_mode === "appointment" && apptDate ? (
            <div className="dash-status-grid">
              <div>
                <div className="dash-card-lbl">{tDash("date")}</div>
                <div>{apptDate.toLocaleDateString(locale, { weekday: "long", month: "short", day: "numeric" })}</div>
              </div>
              <div>
                <div className="dash-card-lbl">{tDash("time")}</div>
                <div>{apptDate.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" })}</div>
              </div>
              <div>
                <div className="dash-card-lbl">{tDash("channel")}</div>
                <div>{intake.appointment_channel === "video" ? tSched("channel.videoH") : tSched("channel.officeH")}</div>
              </div>
            </div>
          ) : intake.schedule_mode === "callback" ? (
            <div>
              <div className="dash-card-lbl">{tDash("callback")}</div>
              <div>{intake.callback_window ? tSched(`callback.windows.${intake.callback_window}`) : "—"}</div>
              {intake.callback_note && (
                <div className="dash-message-body" style={{ marginTop: 8 }}>{intake.callback_note}</div>
              )}
            </div>
          ) : (
            <p className="dash-empty-s">{tDash("noSchedule")}</p>
          )}
        </section>

        <section className="dash-section">
          <div className="dash-section-h">{tDash("messagesH")}</div>
          <ReplyForm reference={intake.reference} />
          {messageList.length > 0 && (
            <div className="dash-messages" style={{ marginTop: 18 }}>
              {messageList.map((m) => (
                <div key={m.id} className={`dash-message dash-message-${m.direction}`}>
                  <div className="dash-message-head">
                    <span className="dash-message-from">
                      {m.direction === "in" ? t("youSent") : t("fromClient")}
                    </span>
                    <span className="dash-message-date">
                      {new Date(m.created_at).toLocaleString(locale, {
                        month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {m.subject && <div className="dash-message-subject">{m.subject}</div>}
                  <div className="dash-message-body">{m.body}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="dash-section">
          <div className="dash-section-h">{tDash("documentsH")}</div>
          {(intake.intake_documents ?? []).length === 0 ? (
            <p className="dash-empty-s">{tDash("noDocuments")}</p>
          ) : (
            <ul className="dash-docs">
              {(intake.intake_documents ?? []).map((d) => (
                <li key={d.id} className="dash-doc">
                  <Icon.File style={{ width: 14, height: 14 }} />
                  <a href={`/api/download/${d.id}`} target="_blank" rel="noopener" style={{ color: "inherit" }}>
                    {d.original_filename || d.doc_id}
                  </a>
                  <span className="dash-card-lbl mono" style={{ marginLeft: "auto" }}>{d.doc_id}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="dash-section">
          <div className="dash-section-h">{t("answersH")}</div>
          <pre style={{ fontSize: 12, lineHeight: 1.5, color: "var(--ink-2)", overflow: "auto", margin: 0, fontFamily: "var(--mono)" }}>
            {JSON.stringify(intake.answers, null, 2)}
          </pre>
        </section>
      </main>
    </div>
  );
}
