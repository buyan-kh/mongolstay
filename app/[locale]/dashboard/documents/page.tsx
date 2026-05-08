import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Icon } from "@/components/icons";
import { getServerSupabase } from "@/lib/supabase/server";

type DocsRow = {
  id: string;
  reference: string;
  kind: "j1f1" | "b1b2f1" | "asylum";
  intake_documents: {
    id: string;
    doc_id: string;
    original_filename: string | null;
    mime_type: string | null;
    size_bytes: number | null;
    created_at: string;
  }[];
};

function fmtBytes(n: number | null) {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function Page() {
  const supabase = await getServerSupabase();
  const t = await getTranslations("documentsPage");
  const tPay = await getTranslations("flow.pay");
  const locale = await getLocale();

  const { data: rows } = await supabase
    .from("intakes")
    .select(`
      id, reference, kind,
      intake_documents (id, doc_id, original_filename, mime_type, size_bytes, created_at)
    `)
    .order("created_at", { ascending: false });

  const list = ((rows ?? []) as unknown as DocsRow[])
    .filter((r) => (r.intake_documents ?? []).length > 0);

  const total = list.reduce((n, r) => n + (r.intake_documents?.length ?? 0), 0);

  return (
    <>
      <div className="dash-head">
        <h1 className="flow-title">{t("title")}</h1>
        <p className="flow-sub">{t("sub", { count: total })}</p>
      </div>

      {list.length === 0 ? (
        <div className="dash-empty">
          <p className="dash-empty-h">{t("emptyH")}</p>
          <p className="dash-empty-s">{t("emptyS")}</p>
        </div>
      ) : (
        list.map((intake) => {
          const filing = intake.kind === "asylum" ? "I-589" : "I-539";
          const filingLabel = tPay(`${intake.kind}Line`);
          const docs = [...(intake.intake_documents ?? [])].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
          );
          return (
            <section key={intake.id} className="dash-section" style={{ background: "var(--bg)" }}>
              <div className="dash-section-h" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>
                  {filing} ·{" "}
                  <Link href={`/dashboard/${intake.reference}`} style={{ color: "var(--ink)" }}>
                    {intake.reference}
                  </Link>
                </span>
                <span style={{ textTransform: "none", letterSpacing: 0, fontFamily: "var(--sans)" }}>
                  {filingLabel}
                </span>
              </div>
              <ul className="dash-docs">
                {docs.map((d) => (
                  <li key={d.id} className="dash-doc">
                    <Icon.File style={{ width: 14, height: 14 }} />
                    <a href={`/api/download/${d.id}`} target="_blank" rel="noopener" style={{ color: "inherit", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {d.original_filename || d.doc_id}
                    </a>
                    <span className="dash-card-lbl">
                      {fmtBytes(d.size_bytes)} ·{" "}
                      {new Date(d.created_at).toLocaleDateString(locale, { month: "short", day: "numeric" })}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </>
  );
}
