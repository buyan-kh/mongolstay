"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Icon } from "./icons";

const ALLOWED = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024;

type Phase = "idle" | "uploading" | "done";

export function UploadExtra({ reference }: { reference: string }) {
  const t = useTranslations("dashboard.uploadExtra");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setFile(null);
    setLabel("");
    setError(null);
    setPhase("idle");
    if (inputRef.current) inputRef.current.value = "";
  };

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const f = e.target.files?.[0] ?? null;
    if (!f) {
      setFile(null);
      return;
    }
    if (!ALLOWED.includes(f.type)) {
      setError(t("errorType"));
      return;
    }
    if (f.size > MAX_BYTES) {
      setError(t("errorSize"));
      return;
    }
    setFile(f);
  };

  const upload = async () => {
    if (!file) return;
    setPhase("uploading");
    setError(null);
    try {
      // 1. Get a signed upload URL.
      const signRes = await fetch("/api/dashboard/upload/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference,
          filename: file.name,
          contentType: file.type,
          sizeBytes: file.size,
        }),
      });
      if (!signRes.ok) throw new Error(`sign ${signRes.status}: ${await signRes.text()}`);
      const sign = (await signRes.json()) as {
        uploadUrl: string;
        token: string;
        path: string;
      };

      // 2. PUT the bytes directly to Supabase Storage.
      const putRes = await fetch(sign.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) throw new Error(`upload ${putRes.status}`);

      // 3. Tell the API to verify + record it on the intake.
      const attachRes = await fetch("/api/dashboard/upload/attach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference,
          path: sign.path,
          filename: file.name,
          contentType: file.type,
          sizeBytes: file.size,
          label: label.trim() || null,
        }),
      });
      if (!attachRes.ok) throw new Error(`attach ${attachRes.status}: ${await attachRes.text()}`);

      setPhase("done");
      reset();
      router.refresh();
    } catch (e) {
      setError((e as Error).message || t("errorGeneric"));
      setPhase("idle");
    }
  };

  return (
    <div className="upload-extra">
      <div className="upload-extra-row">
        <label className="upload-extra-pick">
          <Icon.Upload style={{ width: 14, height: 14 }} />
          <span>{file ? file.name : t("pickFile")}</span>
          <input
            ref={inputRef}
            type="file"
            accept={ALLOWED.join(",")}
            onChange={onPickFile}
            style={{ display: "none" }}
            disabled={phase === "uploading"}
          />
        </label>
        <input
          className="ipt upload-extra-label"
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={t("labelPh")}
          maxLength={120}
          disabled={phase === "uploading"}
        />
        <button
          type="button"
          className="btn btn-sm btn-accent"
          onClick={upload}
          disabled={!file || phase === "uploading"}
        >
          {phase === "uploading" ? t("uploading") : t("upload")}
        </button>
      </div>
      <div className="upload-extra-hint">{t("hint")}</div>
      {error && <div className="field-err" role="alert" style={{ marginTop: 6 }}>{error}</div>}
    </div>
  );
}
