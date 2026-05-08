import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Icon } from "@/components/icons";
import { getServerSupabase } from "@/lib/supabase/server";

type IntakeListRow = {
  id: string;
  reference: string;
  kind: "j1f1" | "b1b2f1" | "asylum";
  payment_status: string;
  payment_method: string | null;
  paid_at: string | null;
  amount_cents: number | null;
  schedule_mode: "appointment" | "callback" | null;
  appointment_at: string | null;
  callback_window: string | null;
  created_at: string;
  intake_messages: { id: string; read_at: string | null; direction: "in" | "out" }[];
};

export default async function Page() {
  const supabase = await getServerSupabase();
  const t = await getTranslations("dashboard");
  const tPay = await getTranslations("flow.pay");
  const tInv = await getTranslations("flow.invoice");

  const { data: intakes } = await supabase
    .from("intakes")
    .select(`
      id, reference, kind, payment_status, payment_method, paid_at, amount_cents,
      schedule_mode, appointment_at, callback_window, created_at,
      intake_messages (id, read_at, direction)
    `)
    .order("created_at", { ascending: false });

  const list = (intakes ?? []) as unknown as IntakeListRow[];

  return (
    <>
      <div className="dash-head">
        <h1 className="flow-title">{t("title")}</h1>
        <p className="flow-sub">{t("sub")}</p>
      </div>

      {list.length === 0 ? (
        <div className="dash-empty">
          <p className="dash-empty-h">{t("emptyH")}</p>
          <p className="dash-empty-s">{t("emptyS")}</p>
          <div className="dash-empty-cta">
            <Link className="btn btn-lg btn-accent" href="/file/j1f1/eligibility">
              {t("startJ1F1")} <Icon.ArrowRight style={{ width: 14, height: 14 }} />
            </Link>
            <Link className="btn btn-lg btn-ghost" href="/file/asylum/eligibility">
              {t("startAsylum")} <Icon.ArrowRight style={{ width: 14, height: 14 }} />
            </Link>
          </div>
        </div>
      ) : (
        <div className="dash-list">
          {list.map((it) => {
            const incoming = (it.intake_messages ?? []).filter((m) => m.direction === "in");
            const unread = incoming.filter((m) => !m.read_at).length;
            const filing = it.kind === "asylum" ? "I-589" : "I-539";
            const filingLabel = tPay(`${it.kind}Line`);
            const statusLabel =
              it.payment_status === "paid"
                ? tInv("statusPaid")
                : it.payment_status === "awaiting"
                ? tInv("statusAwaiting")
                : it.payment_status;

            return (
              <Link key={it.id} className="dash-card" href={`/dashboard/${it.reference}`}>
                <div className="dash-card-head">
                  <div className="dash-card-tag">
                    <span
                      className="sq"
                      style={{
                        background:
                          it.kind === "asylum" ? "var(--accent)" :
                          it.kind === "b1b2f1" ? "var(--ink-2)" :
                          "var(--ink)",
                      }}
                    />
                    {filing}
                  </div>
                  {unread > 0 && (
                    <span className="dash-badge">
                      {t("unread", { count: unread })}
                    </span>
                  )}
                </div>
                <div className="dash-card-h">{filingLabel}</div>
                <div className="dash-card-meta">
                  <div>
                    <span className="dash-card-lbl">{t("reference")}</span>
                    <span className="mono">{it.reference}</span>
                  </div>
                  <div>
                    <span className="dash-card-lbl">{t("status")}</span>
                    <span className={`dash-status dash-status-${it.payment_status}`}>{statusLabel}</span>
                  </div>
                  <div>
                    <span className="dash-card-lbl">{t("amount")}</span>
                    <span className="mono">${(((it.amount_cents as number) ?? 0) / 100).toLocaleString()}.00</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
