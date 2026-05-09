"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Icon } from "./icons";

const ALLOWED = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024;

export type ChatMessage = {
  id: string;
  created_at: string;
  direction: "in" | "out";
  subject: string | null;
  body: string;
  read_at: string | null;
  sender_name: string | null;
  attachments: {
    id: string;
    original_filename: string | null;
    mime_type: string | null;
    size_bytes: number | null;
  }[];
};

type Props = {
  reference: string;
  messages: ChatMessage[];
  /** Render messages from the perspective of: */
  viewer: "client" | "attorney";
};

type StagedFile = {
  file: File;
  storagePath?: string;
  uploading: boolean;
  error?: string;
};

export function Chat({ reference, messages, viewer }: Props) {
  const t = useTranslations("chat");
  const locale = useLocale();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [body, setBody] = useState("");
  const [staged, setStaged] = useState<StagedFile[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const onPickFiles = async (files: FileList | null) => {
    if (!files) return;
    const additions: StagedFile[] = [];
    for (const file of Array.from(files)) {
      if (!ALLOWED.includes(file.type)) {
        setError(t("errorType"));
        continue;
      }
      if (file.size > MAX_BYTES) {
        setError(t("errorSize"));
        continue;
      }
      additions.push({ file, uploading: true });
    }
    if (additions.length === 0) return;
    setStaged((prev) => [...prev, ...additions]);

    // Kick off uploads in parallel.
    additions.forEach((entry) => {
      void uploadOne(entry).then((path) => {
        setStaged((prev) =>
          prev.map((s) =>
            s.file === entry.file
              ? path
                ? { ...s, uploading: false, storagePath: path }
                : { ...s, uploading: false, error: t("errorUpload") }
              : s,
          ),
        );
      });
    });
  };

  const uploadOne = async (s: StagedFile): Promise<string | null> => {
    try {
      const signRes = await fetch("/api/upload/sign/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference,
          filename: s.file.name,
          contentType: s.file.type,
          sizeBytes: s.file.size,
        }),
      });
      if (!signRes.ok) return null;
      const { uploadUrl, path } = (await signRes.json()) as { uploadUrl: string; path: string };

      const put = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": s.file.type },
        body: s.file,
      });
      if (!put.ok) return null;
      return path;
    } catch {
      return null;
    }
  };

  const removeStaged = (file: File) => {
    setStaged((prev) => prev.filter((s) => s.file !== file));
  };

  const send = async () => {
    if (sending) return;
    if (body.trim().length === 0 && staged.length === 0) return;
    if (staged.some((s) => s.uploading)) {
      setError(t("errorWait"));
      return;
    }
    const ready = staged.filter((s) => s.storagePath);
    setSending(true);
    setError(null);

    const endpoint = viewer === "attorney" ? "/api/admin/messages" : "/api/messages";
    const payload = {
      reference,
      body: body.trim(),
      attachments: ready.map((s) => ({
        storagePath: s.storagePath,
        originalFilename: s.file.name,
        contentType: s.file.type,
        sizeBytes: s.file.size,
      })),
    };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSending(false);
    if (!res.ok) {
      setError(`${res.status}: ${await res.text()}`);
      return;
    }
    setBody("");
    setStaged([]);
    router.refresh();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Cmd/Ctrl + Enter sends; plain Enter inserts newline (legal copy is multi-line).
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void send();
    }
  };

  // Direction labels: 'in' = attorney→client, 'out' = client→attorney.
  // From each viewer's perspective:
  //   client: 'in' = "from <attorney name>" (or "from your attorney" fallback), 'out' = "you sent"
  //   attorney: 'in' = "<own name> (you)" or "you sent" if no name, 'out' = "from client"
  const labelFor = (m: ChatMessage) => {
    if (viewer === "client") {
      if (m.direction === "in") {
        return m.sender_name ? t("fromNamed", { name: m.sender_name }) : t("fromAttorney");
      }
      return t("youSent");
    }
    // Attorney view
    if (m.direction === "in") {
      return m.sender_name ? t("namedSent", { name: m.sender_name }) : t("youSent");
    }
    return t("fromClient");
  };
  const sideFor = (m: ChatMessage) => {
    // "us" sits on the right, "them" on the left. From each viewer:
    //   client: own messages are 'out', attorney's are 'in'
    //   attorney: own messages are 'in', client's are 'out'
    if (viewer === "client") return m.direction === "out" ? "right" : "left";
    return m.direction === "in" ? "right" : "left";
  };

  return (
    <div className="chat">
      <div className="chat-thread" role="log" aria-live="polite">
        {messages.length === 0 ? (
          <p className="dash-empty-s" style={{ textAlign: "center", padding: "32px 0" }}>
            {t("empty")}
          </p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`chat-row chat-row-${sideFor(m)}`}>
              <div className="chat-bubble">
                <div className="chat-meta">
                  <span>{labelFor(m)}</span>
                  <span className="chat-time">
                    {new Date(m.created_at).toLocaleString(locale, {
                      month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                    })}
                  </span>
                </div>
                {m.subject && <div className="chat-subject">{m.subject}</div>}
                {m.body && <div className="chat-body">{m.body}</div>}
                {m.attachments.length > 0 && (
                  <div className="chat-attachments">
                    {m.attachments.map((a) => (
                      <a
                        key={a.id}
                        href={`/api/download/attachment/${a.id}`}
                        target="_blank"
                        rel="noopener"
                        className="chat-attachment"
                      >
                        <Icon.File style={{ width: 14, height: 14 }} />
                        <span>{a.original_filename || "attachment"}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      <div className="chat-composer">
        {staged.length > 0 && (
          <div className="chat-staged">
            {staged.map((s) => (
              <div key={s.file.name + s.file.size} className="chat-staged-item">
                <Icon.File style={{ width: 12, height: 12 }} />
                <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {s.file.name}
                </span>
                {s.uploading ? <span className="dash-card-lbl">{t("uploading")}</span> : null}
                {s.error ? <span className="field-err">{s.error}</span> : null}
                <button type="button" className="chat-remove" onClick={() => removeStaged(s.file)} aria-label="Remove">
                  <Icon.X style={{ width: 12, height: 12 }} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="chat-row-fields">
          <textarea
            className="ipt chat-input"
            placeholder={t(viewer === "attorney" ? "phAttorney" : "phClient")}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED.join(",")}
            multiple
            style={{ display: "none" }}
            onChange={(e) => onPickFiles(e.target.files)}
          />
          <button
            type="button"
            className="btn btn-ghost btn-sm chat-attach"
            onClick={() => fileInputRef.current?.click()}
            aria-label={t("attach")}
          >
            <Icon.Upload style={{ width: 14, height: 14 }} />
          </button>
          <button
            type="button"
            className="btn btn-accent btn-sm"
            onClick={send}
            disabled={sending || (body.trim().length === 0 && staged.filter((s) => s.storagePath).length === 0)}
          >
            {sending ? t("sending") : t("send")}
          </button>
        </div>
        {error && <div className="field-err" role="alert" style={{ marginTop: 6 }}>{error}</div>}
        <div className="chat-hint">{t("hint")}</div>
      </div>
    </div>
  );
}
