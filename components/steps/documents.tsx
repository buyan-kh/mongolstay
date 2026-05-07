"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/icons";
import { FlowFooter } from "@/components/flow-shell";
import { useFlow, type UploadedDoc } from "@/components/flow-provider";
import { DOC_IDS } from "@/lib/flow-data";

type RowStatus = "idle" | "uploading" | "done";

const ALLOWED = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024;

async function uploadOne(opts: {
  kind: string;
  reference: string;
  docId: string;
  file: File;
  onProgress: (pct: number) => void;
}): Promise<UploadedDoc> {
  const { kind, reference, docId, file, onProgress } = opts;
  if (!ALLOWED.includes(file.type)) throw new Error("unsupported type");
  if (file.size > MAX_BYTES) throw new Error("file too large");

  // 1. Mint a signed upload URL.
  const signRes = await fetch("/api/upload/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind,
      reference,
      docId,
      filename: file.name,
      contentType: file.type,
      sizeBytes: file.size,
    }),
  });
  if (!signRes.ok) throw new Error(`sign failed (${signRes.status})`);
  const { uploadUrl, path } = (await signRes.json()) as { uploadUrl: string; path: string };

  // 2. PUT directly to Supabase Storage with progress reporting.
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress((e.loaded / e.total) * 100);
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`upload ${xhr.status}`)));
    xhr.onerror = () => reject(new Error("network error"));
    xhr.send(file);
  });

  return { docId, path, originalFilename: file.name, contentType: file.type, sizeBytes: file.size };
}

function DocRow({
  id,
  name,
  hint,
  done,
  onUpload,
  idleHint,
  uploadingTpl,
  uploadedFallback,
}: {
  id: string;
  name: string;
  hint: string;
  done: boolean;
  onUpload: (file: File, onProgress: (pct: number) => void) => Promise<void>;
  idleHint: string;
  uploadingTpl: (pct: number) => string;
  uploadedFallback: string;
}) {
  const [status, setStatus] = useState<RowStatus>(done ? "done" : "idle");
  const [pct, setPct] = useState(0);
  const [filename, setFilename] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const start = async (file: File) => {
    setFilename(file.name);
    setStatus("uploading");
    setPct(0);
    setError(null);
    try {
      await onUpload(file, setPct);
      setPct(100);
      setStatus("done");
    } catch (e) {
      setError((e as Error).message);
      setStatus("idle");
      setPct(0);
    }
  };

  const trigger = () => {
    if (status !== "idle") return;
    inputRef.current?.click();
  };

  return (
    <div className={`doc doc-${status}`} onClick={trigger} role="button" tabIndex={0} data-doc-id={id}>
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED.join(",")}
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) start(f);
        }}
      />
      <div className="doc-icon">
        {status === "done" ? <Icon.Check style={{ width: 18, height: 18 }} /> : <Icon.File style={{ width: 18, height: 18 }} />}
      </div>
      <div className="doc-meta">
        <div className="doc-name">{name}</div>
        <div className="doc-hint">
          {error && <span style={{ color: "var(--warn)" }}>{error}</span>}
          {!error && status === "idle" && (hint || idleHint)}
          {!error && status === "uploading" && uploadingTpl(Math.round(pct))}
          {!error && status === "done" && (
            <span style={{ color: "var(--good)" }}>{filename || uploadedFallback}</span>
          )}
        </div>
        {status === "uploading" && (
          <div className="doc-bar"><div className="doc-bar-fill" style={{ width: `${pct}%` }} /></div>
        )}
      </div>
      <div className="doc-action">
        {status === "idle" && <Icon.Upload style={{ width: 16, height: 16 }} />}
        {status === "done" && <Icon.Check style={{ width: 16, height: 16 }} />}
      </div>
    </div>
  );
}

export function DocumentsStep() {
  const { kind, state, setState } = useFlow();
  const t = useTranslations("flow.docs");
  const tBtn = useTranslations("flow.buttons");
  const docIds = DOC_IDS[kind];
  const uploadedCount = docIds.filter((id) => state.uploadedDocs.includes(id)).length;
  const canNext = uploadedCount >= Math.ceil(docIds.length / 2);

  const handleUpload = async (
    docId: string,
    file: File,
    onProgress: (pct: number) => void,
  ) => {
    if (!state.reference) throw new Error("flow not initialized");
    const uploaded = await uploadOne({ kind, reference: state.reference, docId, file, onProgress });
    setState((s) => ({
      ...s,
      uploadedDocs: Array.from(new Set([...s.uploadedDocs, docId])),
      // Replace any prior upload for the same doc; otherwise append.
      documents: [...s.documents.filter((d) => d.docId !== docId), uploaded],
    }));
  };

  // Skip: marks doc IDs as "done" without an actual upload — attorney collects
  // the missing docs at the appointment. We intentionally do NOT add anything
  // to state.documents here, so storage stays empty for skipped items.
  const skipAll = () => {
    setState((s) => ({ ...s, uploadedDocs: docIds }));
  };

  return (
    <>
      <div className="docs">
        <div className="docs-banner">
          <Icon.Shield style={{ width: 16, height: 16, color: "var(--accent)" }} />
          <div>
            <div className="docs-banner-h">{t("bannerH")}</div>
            <div className="docs-banner-s">{t("bannerS")}</div>
          </div>
        </div>
        <div className="docs-list">
          {docIds.map((id) => (
            <DocRow
              key={id}
              id={id}
              name={t(`${kind}.${id}.name`)}
              hint={t(`${kind}.${id}.hint`)}
              idleHint={t("idleHint")}
              uploadingTpl={(pct) => t("uploading", { pct })}
              uploadedFallback={t("uploadedFallback")}
              done={state.uploadedDocs.includes(id)}
              onUpload={(file, onProgress) => handleUpload(id, file, onProgress)}
            />
          ))}
        </div>
        <div className="docs-skip">
          {t("skipPre")}
          <a onClick={skipAll}>{t("skipLink")}</a>
        </div>
        <div className="docs-progress">
          <div className="docs-progress-bar">
            <div className="docs-progress-fill" style={{ width: `${(uploadedCount / docIds.length) * 100}%` }} />
          </div>
          <div className="docs-progress-lbl">
            {t("progress", { count: uploadedCount, total: docIds.length })}
          </div>
        </div>
      </div>

      <FlowFooter
        prevHref={`/file/${kind}/eligibility`}
        nextHref={`/file/${kind}/schedule`}
        nextLabel={tBtn("continueSchedule")}
        nextDisabled={!canNext}
      />
    </>
  );
}
