"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

export function ReplyForm({ reference }: { reference: string }) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference, subject: subject || null, body }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(`${res.status}: ${await res.text()}`);
      return;
    }
    setSubject("");
    setBody("");
    router.refresh();
  };

  return (
    <form className="auth-form" onSubmit={submit} style={{ marginTop: 14 }}>
      <input
        className="ipt"
        type="text"
        placeholder={t("reply.subjectPh")}
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
      />
      <textarea
        className="ipt"
        style={{ height: "auto", minHeight: 100, padding: "10px 14px", resize: "vertical" }}
        placeholder={t("reply.bodyPh")}
        required
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      {error && <div className="field-err" role="alert">{error}</div>}
      <button type="submit" className="btn btn-accent" disabled={busy || body.trim().length === 0}>
        {busy ? t("reply.sending") : t("reply.send")}
      </button>
    </form>
  );
}

export function MarkPaidButton({ reference, currentStatus }: {
  reference: string;
  currentStatus: string;
}) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (currentStatus === "paid") {
    return <span className="dash-status dash-status-paid">{t("statusPaid")}</span>;
  }

  const onClick = async () => {
    if (!confirm(t("markPaidConfirm"))) return;
    setBusy(true);
    const res = await fetch("/api/admin/intake/mark-paid", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference }),
    });
    setBusy(false);
    if (!res.ok) {
      alert(`Failed: ${res.status}`);
      return;
    }
    router.refresh();
  };

  return (
    <button type="button" className="btn btn-sm btn-primary" onClick={onClick} disabled={busy}>
      {busy ? "…" : t("markPaid")}
    </button>
  );
}

export function RefundButton({ reference, currentStatus, paymentMethod }: {
  reference: string;
  currentStatus: string;
  paymentMethod: string | null;
}) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (currentStatus === "refunded") {
    return <span className="dash-status dash-status-refunded">{t("statusRefunded")}</span>;
  }

  const onClick = async () => {
    const auto = paymentMethod === "card";
    const msg = auto ? t("refundCardConfirm") : t("refundManualConfirm");
    if (!confirm(msg)) return;
    setBusy(true);
    const res = await fetch("/api/admin/intake/refund", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference }),
    });
    setBusy(false);
    if (!res.ok) {
      alert(`Failed: ${res.status} ${await res.text()}`);
      return;
    }
    router.refresh();
  };

  return (
    <button type="button" className="btn btn-sm btn-ghost" onClick={onClick} disabled={busy}>
      {busy ? "…" : t("refund")}
    </button>
  );
}
