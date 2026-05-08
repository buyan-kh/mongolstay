import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BrandMark } from "@/components/icons";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SignOutButton } from "@/components/auth-forms";
import { requireAttorney } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase/server";

type AdminListRow = {
  id: string;
  reference: string;
  kind: "j1f1" | "b1b2f1" | "asylum";
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  payment_status: string;
  payment_method: string | null;
  amount_cents: number | null;
  schedule_mode: "appointment" | "callback" | null;
  appointment_at: string | null;
  callback_window: string | null;
  created_at: string;
  intake_messages: { id: string; read_at: string | null; direction: "in" | "out" }[];
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const user = await requireAttorney();
  const supabase = await getServerSupabase();
  const t = await getTranslations("admin");
  const locale = await getLocale();
  const { filter } = await searchParams;

  let query = supabase
    .from("intakes")
    .select(`
      id, reference, kind, client_name, client_email, client_phone,
      payment_status, payment_method, amount_cents, schedule_mode,
      appointment_at, callback_window, created_at,
      intake_messages (id, read_at, direction)
    `)
    .order("created_at", { ascending: false })
    .limit(100);

  if (filter === "awaiting") query = query.eq("payment_status", "awaiting");
  if (filter === "paid") query = query.eq("payment_status", "paid");
  if (filter === "refunded") query = query.eq("payment_status", "refunded");

  const { data: rows } = await query;
  const list = (rows ?? []) as unknown as AdminListRow[];

  return (
    <div className="dash">
      <header className="dash-bar">
        <Link className="brand" href="/" aria-label="mongolstay.com">
          <BrandMark />
        </Link>
        <span className="dash-card-lbl" style={{ marginLeft: 8 }}>{t("badge")}</span>
        <div style={{ flex: 1 }} />
        <LanguageSwitcher />
        <span style={{ color: "var(--muted)", fontSize: 13 }}>{user.email}</span>
        <SignOutButton />
      </header>

      <main className="dash-main">
        <div className="dash-head">
          <h1 className="flow-title">{t("title")}</h1>
          <p className="flow-sub">{t("sub")}</p>
        </div>

        <div className="admin-filters">
          {(["all", "awaiting", "paid", "refunded"] as const).map((f) => (
            <Link
              key={f}
              className={`admin-filter ${(filter ?? "all") === f ? "sel" : ""}`}
              href={f === "all" ? "/admin" : `/admin?filter=${f}`}
            >
              {t(`filters.${f}`)}
            </Link>
          ))}
        </div>

        {list.length === 0 ? (
          <div className="dash-empty">
            <p className="dash-empty-h">{t("emptyH")}</p>
            <p className="dash-empty-s">{t("emptyS")}</p>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t("col.client")}</th>
                  <th>{t("col.filing")}</th>
                  <th>{t("col.payment")}</th>
                  <th>{t("col.schedule")}</th>
                  <th>{t("col.received")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {list.map((r) => {
                  const filing = r.kind === "asylum" ? "I-589" : "I-539";
                  const apptDate = r.appointment_at ? new Date(r.appointment_at) : null;
                  const incoming = (r.intake_messages ?? []).filter((m) => m.direction === "in");
                  const unread = incoming.filter((m) => !m.read_at).length;
                  return (
                    <tr key={r.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{r.client_name || "—"}</div>
                        <div className="dash-card-lbl">{r.client_email}</div>
                      </td>
                      <td>
                        <div className="mono">{r.reference}</div>
                        <div className="dash-card-lbl">{filing} · {r.kind}</div>
                      </td>
                      <td>
                        <div className={`dash-status dash-status-${r.payment_status}`}>
                          {r.payment_status}
                        </div>
                        <div className="dash-card-lbl">
                          {r.payment_method ?? "—"} · ${(((r.amount_cents as number) ?? 0) / 100).toLocaleString()}
                        </div>
                      </td>
                      <td>
                        {r.schedule_mode === "appointment" && apptDate
                          ? apptDate.toLocaleString(locale, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
                          : r.schedule_mode === "callback"
                          ? `${t("col.callback")} · ${r.callback_window}`
                          : "—"}
                      </td>
                      <td className="dash-card-lbl">
                        {new Date(r.created_at).toLocaleString(locale, { month: "short", day: "numeric" })}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <Link className="btn btn-sm btn-ghost" href={`/admin/${r.reference}`}>
                          {unread > 0 && <span className="dash-badge" style={{ marginRight: 6 }}>{unread}</span>}
                          {t("open")}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
