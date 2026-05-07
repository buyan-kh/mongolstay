import "server-only";
import { getResend } from "./resend";
import type { FlowKind, PaymentMethod } from "./flow-data";

const FROM = process.env.RESEND_FROM || "Mongolstay <intake@mongolstay.com>";
const ATTORNEY_INBOX = process.env.INTAKE_TO || "intake@mongolstay.com";

const FILING_LABEL: Record<FlowKind, string> = {
  j1f1: "J-1 → F-1 change of status (I-539)",
  b1b2f1: "B-1/B-2 → F-1 change of status (I-539)",
  asylum: "Asylum application (I-589)",
};

const METHOD_LABEL: Record<PaymentMethod, string> = {
  card: "Card",
  zelle: "Zelle",
  cash: "Cash at appointment",
};

type ConfirmInput = {
  to: string;
  clientName: string;
  reference: string;
  kind: FlowKind;
  amountUsd: number;
  method: PaymentMethod;
  paid: boolean;
  schedule:
    | { mode: "appointment"; iso: string; channel: "office" | "video" }
    | { mode: "callback"; window: string }
    | { mode: null };
};

function formatScheduleLine(s: ConfirmInput["schedule"]) {
  if (s.mode === "appointment") {
    const d = new Date(s.iso);
    const date = d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
    const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    return `${date} at ${time} · ${s.channel === "video" ? "Video call" : "In-person, Manhattan office"}`;
  }
  if (s.mode === "callback") return `Callback requested · ${s.window}`;
  return "Schedule pending";
}

export async function sendClientConfirmation(input: ConfirmInput) {
  const resend = getResend();
  const scheduleLine = formatScheduleLine(input.schedule);
  const subject = input.paid
    ? `Mongolstay · ${FILING_LABEL[input.kind]} · ${input.reference}`
    : `Mongolstay · Awaiting payment · ${input.reference}`;

  const text = [
    `Hi ${input.clientName || "there"},`,
    "",
    input.paid
      ? `Thanks — we've received your payment of $${input.amountUsd.toLocaleString()} for ${FILING_LABEL[input.kind]}.`
      : `We've recorded your filing for ${FILING_LABEL[input.kind]} ($${input.amountUsd.toLocaleString()} via ${METHOD_LABEL[input.method]}). We'll mark it paid once payment is received.`,
    "",
    `Reference: ${input.reference}`,
    `Schedule:  ${scheduleLine}`,
    "",
    "An attorney will review your case before any USCIS filing. We'll be in touch with anything we still need.",
    "",
    "— Mongolstay",
  ].join("\n");

  return resend.emails.send({ from: FROM, to: input.to, subject, text });
}

export async function sendAttorneyAlert(input: ConfirmInput) {
  const resend = getResend();
  const scheduleLine = formatScheduleLine(input.schedule);
  const subject = `[Intake] ${FILING_LABEL[input.kind]} · ${input.clientName || "—"} · ${input.reference}`;
  const text = [
    `New intake submitted.`,
    ``,
    `Reference:   ${input.reference}`,
    `Filing:      ${FILING_LABEL[input.kind]}`,
    `Client:      ${input.clientName || "—"}`,
    `Email:       ${input.to}`,
    `Schedule:    ${scheduleLine}`,
    `Payment:     $${input.amountUsd.toLocaleString()} · ${METHOD_LABEL[input.method]} · ${input.paid ? "PAID" : "AWAITING"}`,
  ].join("\n");

  return resend.emails.send({ from: FROM, to: ATTORNEY_INBOX, subject, text });
}
