import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Icon } from "@/components/icons";
import { getServerSupabase } from "@/lib/supabase/server";

type ConversationRow = {
  id: string;
  reference: string;
  kind: "j1f1" | "b1b2f1" | "asylum";
  intake_messages: {
    id: string;
    created_at: string;
    direction: "in" | "out";
    body: string;
    subject: string | null;
    read_at: string | null;
  }[];
};

export default async function Page() {
  const supabase = await getServerSupabase();
  const t = await getTranslations("messagesPage");
  const tPay = await getTranslations("flow.pay");
  const locale = await getLocale();

  // Fetch each intake the user owns, with their messages — RLS scopes naturally.
  const { data } = await supabase
    .from("intakes")
    .select(`
      id, reference, kind,
      intake_messages (id, created_at, direction, body, subject, read_at)
    `)
    .order("created_at", { ascending: false });

  const conversations = ((data ?? []) as unknown as ConversationRow[])
    .map((c) => {
      const sorted = [...(c.intake_messages ?? [])].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      const last = sorted[0];
      const unread = (c.intake_messages ?? []).filter((m) => m.direction === "in" && !m.read_at).length;
      return { ...c, last, unread };
    })
    // Surface conversations with messages first, then ones with none.
    .sort((a, b) => {
      const aT = a.last ? new Date(a.last.created_at).getTime() : 0;
      const bT = b.last ? new Date(b.last.created_at).getTime() : 0;
      return bT - aT;
    });

  return (
    <>
      <div className="dash-head">
        <h1 className="flow-title">{t("title")}</h1>
        <p className="flow-sub">{t("sub")}</p>
      </div>

      {conversations.length === 0 ? (
        <div className="dash-empty">
          <p className="dash-empty-h">{t("emptyH")}</p>
          <p className="dash-empty-s">{t("emptyS")}</p>
        </div>
      ) : (
        <div className="dash-list">
          {conversations.map((c) => {
            const filing = c.kind === "asylum" ? "I-589" : "I-539";
            const filingLabel = tPay(`${c.kind}Line`);
            const preview =
              c.last?.subject || c.last?.body?.slice(0, 120) || t("noMessages");
            return (
              <Link
                key={c.id}
                className="dash-card"
                href={`/dashboard/messages/${c.reference}`}
              >
                <div className="dash-card-head">
                  <div className="dash-card-tag">
                    <span
                      className="sq"
                      style={{
                        background:
                          c.kind === "asylum" ? "var(--accent)" :
                          c.kind === "b1b2f1" ? "var(--ink-2)" :
                          "var(--ink)",
                      }}
                    />
                    {filing}
                  </div>
                  {c.unread > 0 && <span className="dash-badge">{c.unread}</span>}
                </div>
                <div className="dash-card-h" style={{ fontSize: 18 }}>{filingLabel}</div>
                <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.5, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {preview}
                </p>
                <div className="dash-card-meta" style={{ gridTemplateColumns: "1fr auto" }}>
                  <span className="dash-card-lbl mono">{c.reference}</span>
                  {c.last && (
                    <span className="dash-card-lbl">
                      {new Date(c.last.created_at).toLocaleDateString(locale, { month: "short", day: "numeric" })}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
