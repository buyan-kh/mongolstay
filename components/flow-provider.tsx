"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type {
  AppointmentChannel,
  FlowKind,
  PaymentMethod,
  ScheduleMode,
} from "@/lib/flow-data";

export type UploadedDoc = {
  docId: string;
  path: string;
  originalFilename?: string;
  contentType?: string;
  sizeBytes?: number;
};

export type FlowState = {
  reference: string;          // generated client-side once, used for storage paths + invoice
  contact: { name: string; email: string; phone: string };
  answers: Record<string, string | string[]>;
  uploadedDocs: string[];     // doc IDs (slugs) that completed
  documents: UploadedDoc[];   // full upload records — sent to /api/intake/submit
  schedule: {
    mode: ScheduleMode | null;
    appointment?: { iso: string; channel: AppointmentChannel };
    callback?: { window: string; note?: string };
  };
  payment: {
    status: "pending" | "paid" | "awaiting" | "failed";
    method?: PaymentMethod;
    reference?: string;       // legacy alias of `reference`; kept for filed page
    sessionId?: string;
  };
};

function generateReference() {
  return `MS-${(Math.random() * 1e6 | 0).toString().padStart(6, "0")}`;
}

const EMPTY: FlowState = {
  reference: "",
  contact: { name: "", email: "", phone: "" },
  answers: {},
  uploadedDocs: [],
  documents: [],
  schedule: { mode: null },
  payment: { status: "pending" },
};

type Ctx = {
  kind: FlowKind;
  state: FlowState;
  setState: (next: Partial<FlowState> | ((s: FlowState) => FlowState)) => void;
  reset: () => void;
};

const FlowCtx = createContext<Ctx | null>(null);

const storageKey = (kind: FlowKind) => `mongolstay:flow:${kind}`;

export function FlowProvider({ kind, children }: { kind: FlowKind; children: React.ReactNode }) {
  const [state, _setState] = useState<FlowState>(EMPTY);
  const hydrated = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(kind));
      const parsed = raw ? JSON.parse(raw) : null;
      const next = { ...EMPTY, ...(parsed ?? {}) };
      if (!next.reference) next.reference = generateReference();
      _setState(next);
    } catch {
      _setState({ ...EMPTY, reference: generateReference() });
    }
    hydrated.current = true;
  }, [kind]);

  useEffect(() => {
    if (!hydrated.current) return;
    try { localStorage.setItem(storageKey(kind), JSON.stringify(state)); } catch {}
  }, [kind, state]);

  const setState: Ctx["setState"] = useCallback((next) => {
    _setState((prev) => {
      const merged = typeof next === "function" ? next(prev) : { ...prev, ...next };
      return merged;
    });
  }, []);

  const reset = useCallback(() => {
    _setState(EMPTY);
    try { localStorage.removeItem(storageKey(kind)); } catch {}
  }, [kind]);

  return <FlowCtx.Provider value={{ kind, state, setState, reset }}>{children}</FlowCtx.Provider>;
}

export function useFlow() {
  const ctx = useContext(FlowCtx);
  if (!ctx) throw new Error("useFlow must be used inside <FlowProvider>");
  return ctx;
}
