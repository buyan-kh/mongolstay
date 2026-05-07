import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { Icon, BrandMark } from "@/components/icons";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SignOutButton } from "@/components/auth-forms";
import { requireUser } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase/server";
import { MarkMessagesRead } from "@/components/mark-messages-read";
import type { IntakeMessageRow, IntakeRow } from "@/lib/supabase/types";

type IntakeWithDocs = IntakeRow & {
  intake_documents: {
    id: string;
    doc_id: string;
    original_filename: string | null;
    created_at: string;
  }[];
};

export default async function Page({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  const user = await requireUser(`/login?next=/dashboard/${reference}`);
  const supabase = await getServerSupabase();
  const locale = await getLocale();
  const t = await getTranslations("dashboard");
  const tPay = await getTranslations("flow.pay");
  const tInv = await getTranslations("flow.invoice");
  const tSched = await getTranslations("flow.schedule");

  // RLS prevents reading anyone else's intake; .maybeSingle() so we can 404 cleanly.
  const { data: intakeRaw } = await supabase
    .from("intakes")
    .select(`*, intake_documents (id, doc_id, original_filename, created_at)`)
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
  const unreadIds = messageList.filter((m) => m.direction === "in" && !m.read_at).map((m) => m.id);

  const filing = intake.kind === "asylum" ? "I-589" : "I-539";
  const filingLabel = tPay(`${intake.kind}Line`);
  const statusLabel =
    intake.payment_status === "paid"
      ? tInv("statusPaid")
      : intake.payment_status === "awaiting"
      ? tInv("statusAwaiting")
      : intake.payment_status;

  const apptDate =
    intake.schedule_mode === "appointment" && intake.appointment_at
      ? new Date(intake.appointment_at)
      : null;

  return (
    <div className="dash">
      <header className="dash-bar">
        <Link className="brand" href="/">
          <BrandMark />
          <span>mongolstay<span style={{ color: "var(--muted)", fontWeight: 400 }}>.com</span></span>
        </Link>
        <div style={{ flex: 1 }} />
        <LanguageSwitcher />
        <span style={{ color: "var(--muted)", fontSize: 13 }}>{user.email}</span>
        <SignOutButton />
      </header>

      <main className="dash-main dash-detail">
        {unreadIds.length > 0 && <MarkMessagesRead ids={unreadIds} />}

        <Link className="flow-back" href="/dashboard">
          <Icon.ArrowLeft style={{ width: 14, height: 14 }} /> {t("backToList")}
        </Link>

        <div className="dash-head">
          <div className="flow-tag" style={{ marginBottom: 8 }}>
            <span
              className="sq"
              style={{
                background:
                  intake.kind === "asylum" ? "var(--accent)" :
                  intake.kind === "b1b2f1" ? "var(--ink-2)" :
                  "var(--ink)",
              }}
            />
            {filing}
          </div>
          <h1 className="flow-title">{filingLabel}</h1>
          <p className="flow-sub">
            {t("reference")}: <span className="mono">{intake.reference}</span>
          </p>
        </div>

        <section className="dash-section">
          <div className="dash-section-h">{t("statusH")}</div>
          <div className="dash-status-grid">
            <div>
              <div className="dash-card-lbl">{t("status")}</div>
              <div className={`dash-status dash-status-${intake.payment_status}`}>{statusLabel}</div>
            </div>
            <div>
              <div className="dash-card-lbl">{tInv("paymentMethod")}</div>
              <div>{intake.payment_method ? tPay(`methods.${intake.payment_method}.label`) : "—"}</div>
            </div>
            <div>
              <div className="dash-card-lbl">{t("amount")}</div>
              <div className="mono">${(((intake.amount_cents as number) ?? 0) / 100).toLocaleString()}.00</div>
            </div>
            <div>
              <div className="dash-card-lbl">{t("submitted")}</div>
              <div>{new Date(intake.created_at).toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" })}</div>
            </div>
          </div>
        </section>

        <section className="dash-section">
          <div className="dash-section-h">{t("messagesH")}</div>
          {messageList.length === 0 ? (
            <p className="dash-empty-s">{t("noMessages")}</p>
          ) : (
            <div className="dash-messages">
              {messageList.map((m) => (
                <div
                  key={m.id}
                  className={`dash-message dash-message-${m.direction} ${
                    m.direction === "in" && !m.read_at ? "unread" : ""
                  }`}
                >
                  <div className="dash-message-head">
                    <span className="dash-message-from">
                      {m.direction === "in" ? t("fromAttorney") : t("fromYou")}
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
          <div className="dash-section-h">{t("scheduleH")}</div>
          {intake.schedule_mode === "appointment" && apptDate ? (
            <div className="dash-status-grid">
              <div>
                <div className="dash-card-lbl">{t("date")}</div>
                <div>{apptDate.toLocaleDateString(locale, { weekday: "long", month: "short", day: "numeric" })}</div>
              </div>
              <div>
                <div className="dash-card-lbl">{t("time")}</div>
                <div>{apptDate.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" })}</div>
              </div>
              <div>
                <div className="dash-card-lbl">{t("channel")}</div>
                <div>
                  {intake.appointment_channel === "video"
                    ? tSched("channel.videoH")
                    : tSched("channel.officeH")}
                </div>
              </div>
            </div>
          ) : intake.schedule_mode === "callback" ? (
            <div>
              <div className="dash-card-lbl">{t("callback")}</div>
              <div>{intake.callback_window ? tSched(`callback.windows.${intake.callback_window}`) : "—"}</div>
              {intake.callback_note && (
                <div className="dash-message-body" style={{ marginTop: 8 }}>{intake.callback_note}</div>
              )}
            </div>
          ) : (
            <p className="dash-empty-s">{t("noSchedule")}</p>
          )}
        </section>

        <section className="dash-section">
          <div className="dash-section-h">{t("documentsH")}</div>
          {(intake.intake_documents ?? []).length === 0 ? (
            <p className="dash-empty-s">{t("noDocuments")}</p>
          ) : (
            <ul className="dash-docs">
              {(intake.intake_documents ?? []).map((d) => (
                <li key={d.id} className="dash-doc">
                  <Icon.File style={{ width: 14, height: 14 }} />
                  <span>{d.original_filename || d.doc_id}</span>
                  <span className="dash-card-lbl mono" style={{ marginLeft: "auto" }}>{d.doc_id}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
