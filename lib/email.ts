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
    return `${date} at ${time} · ${s.channel === "video" ? "Video call" : "In-person · San Francisco office"}`;
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

// Notification email to a client when an attorney posts a new message.
// The body is included so the client can read it without logging in, but
// the dashboard link is the authoritative source.
export async function sendClientMessage(input: {
  to: string;
  clientName: string;
  reference: string;
  subject: string | null;
  body: string;
}) {
  const resend = getResend();
  const subjectLine = input.subject
    ? `Mongolstay · ${input.subject} · ${input.reference}`
    : `Mongolstay · New message · ${input.reference}`;
  const text = [
    `Hi ${input.clientName || "there"},`,
    "",
    `Your attorney sent you a message about ${input.reference}:`,
    "",
    input.subject ? `Subject: ${input.subject}` : null,
    input.body,
    "",
    `Reply at: https://mongolstay.com/dashboard/${input.reference}`,
    "",
    "— Mongolstay",
  ].filter(Boolean).join("\n");
  return resend.emails.send({ from: FROM, to: input.to, subject: subjectLine, text });
}

// Notification email to the attorney inbox when a client sends a message
// from their dashboard. Mirrors sendClientMessage but the other direction.
export async function sendAttorneyMessageAlert(input: {
  reference: string;
  clientName: string;
  clientEmail: string;
  subject: string | null;
  body: string;
  attachmentCount: number;
}) {
  const resend = getResend();
  const subjectLine = input.subject
    ? `[Client] ${input.subject} · ${input.reference}`
    : `[Client] New message · ${input.reference}`;
  const text = [
    `New message from ${input.clientName} <${input.clientEmail}> on ${input.reference}:`,
    "",
    input.subject ? `Subject: ${input.subject}` : null,
    input.body,
    input.attachmentCount > 0 ? `\nAttachments: ${input.attachmentCount}` : null,
    "",
    `Reply at: https://mongolstay.com/admin/${input.reference}`,
  ].filter(Boolean).join("\n");
  return resend.emails.send({ from: FROM, to: ATTORNEY_INBOX, subject: subjectLine, text });
}

// Notification email when an attorney refunds the case.
export async function sendRefundConfirmation(input: {
  to: string;
  clientName: string;
  reference: string;
  amountUsd: number;
  method: PaymentMethod;
  reason?: string;
}) {
  const resend = getResend();
  const subject = `Mongolstay · Refund issued · ${input.reference}`;
  const text = [
    `Hi ${input.clientName || "there"},`,
    "",
    input.method === "card"
      ? `We've issued a refund of $${input.amountUsd.toLocaleString()} to the card you used. It usually arrives within 5–10 business days.`
      : `We've recorded a refund of $${input.amountUsd.toLocaleString()}. Since you paid via ${METHOD_LABEL[input.method]}, our office will reach out separately to send the funds back.`,
    "",
    input.reason ? `Reason: ${input.reason}` : null,
    "",
    `Reference: ${input.reference}`,
    "",
    "— Mongolstay",
  ].filter(Boolean).join("\n");
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
