import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BrandMark, Icon } from "@/components/icons";
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

type Filter = "all" | "awaiting" | "paid" | "refunded";
type Sort = "newest" | "oldest";

const VALID_FILTERS: Filter[] = ["all", "awaiting", "paid", "refunded"];
const VALID_SORTS: Sort[] = ["newest", "oldest"];

function initialsFor(name: string | null, email: string | null): string {
  const src = (name?.trim() || email?.trim() || "?").replace(/[^\p{L}\p{N}\s@._-]/gu, "");
  if (src.includes("@")) return src[0]!.toUpperCase();
  const parts = src.split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return "?";
  return parts.map((p) => p[0]!.toUpperCase()).join("");
}

function relTime(date: Date, locale: string): string {
  const diffSec = (date.getTime() - Date.now()) / 1000;
  const abs = Math.abs(diffSec);
  let rtf: Intl.RelativeTimeFormat;
  try {
    rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  } catch {
    rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  }
  if (abs < 60) return rtf.format(Math.round(diffSec), "second");
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  if (abs < 604800) return rtf.format(Math.round(diffSec / 86400), "day");
  return rtf.format(Math.round(diffSec / 604800), "week");
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string; sort?: string }>;
}) {
  const user = await requireAttorney();
  const supabase = await getServerSupabase();
  const t = await getTranslations("admin");
  const locale = await getLocale();
  const sp = await searchParams;

  const filter: Filter = VALID_FILTERS.includes(sp.filter as Filter)
    ? (sp.filter as Filter)
    : "all";
  const sort: Sort = VALID_SORTS.includes(sp.sort as Sort) ? (sp.sort as Sort) : "newest";
  // Strip characters that have special meaning in PostgREST ilike/.or() so the
  // query can't be syntactically broken by user input.
  const q = (sp.q ?? "").trim().slice(0, 80).replace(/[%,()*]/g, "");

  let query = supabase
    .from("intakes")
    .select(`
      id, reference, kind, client_name, client_email, client_phone,
      payment_status, payment_method, amount_cents, schedule_mode,
      appointment_at, callback_window, created_at,
      intake_messages (id, read_at, direction)
    `)
    .order("created_at", { ascending: sort === "oldest" })
    .limit(200);

  if (filter === "awaiting") query = query.eq("payment_status", "awaiting");
  if (filter === "paid") query = query.eq("payment_status", "paid");
  if (filter === "refunded") query = query.eq("payment_status", "refunded");
  if (q) {
    query = query.or(
      `client_name.ilike.%${q}%,client_email.ilike.%${q}%,reference.ilike.%${q}%`,
    );
  }

  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    { data: rows },
    { count: kpiTotal },
    { count: kpiAwaiting },
    { count: kpiUnread },
    { count: kpiUpcoming },
  ] = await Promise.all([
    query,
    supabase.from("intakes").select("*", { count: "exact", head: true }),
    supabase
      .from("intakes")
      .select("*", { count: "exact", head: true })
      .eq("payment_status", "awaiting"),
    supabase
      .from("intake_messages")
      .select("*", { count: "exact", head: true })
      .eq("direction", "in")
      .is("read_at", null),
    supabase
      .from("intakes")
      .select("*", { count: "exact", head: true })
      .gte("appointment_at", now.toISOString())
      .lte("appointment_at", weekFromNow.toISOString()),
  ]);

  const list = (rows ?? []) as unknown as AdminListRow[];
  const buildHref = (overrides: Partial<{ filter: Filter; q: string; sort: Sort }>) => {
    const next: { filter: Filter; q: string; sort: Sort } = {
      filter: overrides.filter ?? filter,
      q: overrides.q ?? q,
      sort: overrides.sort ?? sort,
    };
    const params = new URLSearchParams();
    if (next.filter !== "all") params.set("filter", next.filter);
    if (next.q) params.set("q", next.q);
    if (next.sort !== "newest") params.set("sort", next.sort);
    const qs = params.toString();
    return qs ? `/admin?${qs}` : "/admin";
  };

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

        <div className="admin-kpis">
          <div className="admin-kpi">
            <div className="admin-kpi-lbl"><span className="admin-kpi-dot" />{t("kpi.total")}</div>
            <div className="admin-kpi-val">{(kpiTotal ?? 0).toLocaleString(locale)}</div>
            <div className="admin-kpi-sub">{t("kpi.totalSub")}</div>
          </div>
          <Link className="admin-kpi admin-kpi-warn" href={buildHref({ filter: "awaiting", q: "" })}>
            <div className="admin-kpi-lbl"><span className="admin-kpi-dot" />{t("kpi.awaiting")}</div>
            <div className="admin-kpi-val">{(kpiAwaiting ?? 0).toLocaleString(locale)}</div>
            <div className="admin-kpi-sub">{t("kpi.awaitingSub")}</div>
          </Link>
          <div className="admin-kpi admin-kpi-accent">
            <div className="admin-kpi-lbl"><span className="admin-kpi-dot" />{t("kpi.unread")}</div>
            <div className="admin-kpi-val">{(kpiUnread ?? 0).toLocaleString(locale)}</div>
            <div className="admin-kpi-sub">{t("kpi.unreadSub")}</div>
          </div>
          <div className="admin-kpi admin-kpi-good">
            <div className="admin-kpi-lbl"><span className="admin-kpi-dot" />{t("kpi.upcoming")}</div>
            <div className="admin-kpi-val">{(kpiUpcoming ?? 0).toLocaleString(locale)}</div>
            <div className="admin-kpi-sub">{t("kpi.upcomingSub")}</div>
          </div>
        </div>

        <form className="admin-toolbar" method="GET" action="/admin">
          <div className="admin-filters" role="tablist">
            {VALID_FILTERS.map((f) => (
              <Link
                key={f}
                className={`admin-filter ${filter === f ? "sel" : ""}`}
                href={buildHref({ filter: f })}
                role="tab"
                aria-selected={filter === f}
              >
                {t(`filters.${f}`)}
              </Link>
            ))}
          </div>
          <label className="admin-search">
            <Icon.Search style={{ width: 14, height: 14 }} aria-hidden />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder={t("search.placeholder")}
              autoComplete="off"
              aria-label={t("search.placeholder")}
            />
            {q && (
              <Link
                href={buildHref({ q: "" })}
                className="admin-search-clear"
                aria-label={t("search.clear")}
              >
                <Icon.X style={{ width: 12, height: 12 }} />
              </Link>
            )}
          </label>
          {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
          {sort !== "newest" && <input type="hidden" name="sort" value={sort} />}
        </form>

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
                  <th>
                    <Link
                      href={buildHref({ sort: sort === "newest" ? "oldest" : "newest" })}
                      className="sort is-active"
                      style={{ color: "inherit" }}
                      aria-label={t(`sort.${sort === "newest" ? "oldest" : "newest"}`)}
                    >
                      {t("col.received")}
                      <span className="sort-arr">{sort === "newest" ? "↓" : "↑"}</span>
                    </Link>
                  </th>
                  <th aria-hidden></th>
                </tr>
              </thead>
              <tbody>
                {list.map((r) => {
                  const filing = r.kind === "asylum" ? "I-589" : "I-539";
                  const apptDate = r.appointment_at ? new Date(r.appointment_at) : null;
                  const incoming = (r.intake_messages ?? []).filter((m) => m.direction === "in");
                  const unread = incoming.filter((m) => !m.read_at).length;
                  const created = new Date(r.created_at);
                  const initials = initialsFor(r.client_name, r.client_email);
                  const status = r.payment_status as
                    | "paid"
                    | "awaiting"
                    | "pending"
                    | "failed"
                    | "refunded";
                  return (
                    <tr key={r.id} className={unread > 0 ? "has-unread" : ""}>
                      <td>
                        <div className="admin-row-client">
                          <div className="admin-avatar" aria-hidden>{initials}</div>
                          <div className="admin-row-client-name">
                            <span className="nm">{r.client_name || "—"}</span>
                            <span className="em">{r.client_email}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="ref-mono">{r.reference}</div>
                        <div style={{ marginTop: 4 }}>
                          <span className="admin-pill-filing">{filing}</span>
                        </div>
                      </td>
                      <td>
                        <div className="admin-row-pay">
                          <span className={`admin-pill-status admin-pill-${status}`}>
                            {r.payment_status}
                          </span>
                          <span className="admin-row-pay-meta">
                            {r.payment_method ?? "—"} · ${(((r.amount_cents as number) ?? 0) / 100).toLocaleString()}
                          </span>
                        </div>
                      </td>
                      <td>
                        {r.schedule_mode === "appointment" && apptDate
                          ? apptDate.toLocaleString(locale, {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })
                          : r.schedule_mode === "callback"
                          ? `${t("col.callback")} · ${r.callback_window}`
                          : <span style={{ color: "var(--muted-2)" }}>{t("noSchedule")}</span>}
                      </td>
                      <td>
                        <div className="admin-row-time">
                          <span className="admin-row-time-rel">{relTime(created, locale)}</span>
                          <span className="admin-row-time-abs">
                            {created.toLocaleDateString(locale, { month: "short", day: "numeric" })}
                          </span>
                        </div>
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
