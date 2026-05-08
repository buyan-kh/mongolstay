import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { Icon } from "@/components/icons";
import { Chat, type ChatMessage } from "@/components/chat";
import { MarkMessagesRead } from "@/components/mark-messages-read";
import { getServerSupabase } from "@/lib/supabase/server";

type MessageWithAttachments = {
  id: string;
  created_at: string;
  direction: "in" | "out";
  subject: string | null;
  body: string;
  read_at: string | null;
  intake_message_attachments: {
    id: string;
    original_filename: string | null;
    mime_type: string | null;
    size_bytes: number | null;
  }[];
};

export default async function Page({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  const supabase = await getServerSupabase();
  const t = await getTranslations("messagesPage");
  const tPay = await getTranslations("flow.pay");

  // RLS gates this: only the owning client can see their intake.
  const { data: intake } = await supabase
    .from("intakes")
    .select("id, reference, kind")
    .eq("reference", reference)
    .maybeSingle();
  if (!intake) notFound();

  const { data: rows } = await supabase
    .from("intake_messages")
    .select(`
      id, created_at, direction, subject, body, read_at,
      intake_message_attachments (id, original_filename, mime_type, size_bytes)
    `)
    .eq("intake_id", intake.id)
    .order("created_at", { ascending: true });

  const messages: ChatMessage[] = ((rows ?? []) as unknown as MessageWithAttachments[]).map((m) => ({
    id: m.id,
    created_at: m.created_at,
    direction: m.direction,
    subject: m.subject,
    body: m.body,
    read_at: m.read_at,
    attachments: m.intake_message_attachments ?? [],
  }));

  const unreadIds = messages.filter((m) => m.direction === "in" && !m.read_at).map((m) => m.id);
  const filing = intake.kind === "asylum" ? "I-589" : "I-539";
  const filingLabel = tPay(`${intake.kind}Line`);

  return (
    <>
      {unreadIds.length > 0 && <MarkMessagesRead ids={unreadIds} />}

      <Link className="flow-back" href="/dashboard/messages">
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
          {t("threadSub")} <Link href={`/dashboard/${reference}`} style={{ color: "var(--ink)", textDecoration: "underline" }}>{reference}</Link>
        </p>
      </div>

      <Chat reference={reference} messages={messages} viewer="client" />
    </>
  );
}
