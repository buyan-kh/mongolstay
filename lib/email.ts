import "server-only";
import { getResend } from "./resend";
import type { FlowKind, PaymentMethod } from "./flow-data";

const FROM = process.env.RESEND_FROM || "Mongolstay <contact@mongolstay.com>";
const ATTORNEY_INBOX = process.env.INTAKE_TO || "contact@mongolstay.com";
// Permanent Google Meet room URL (one-time setup at meet.google.com → "Create
// new meeting"). When set, video-appointment confirmations include the link.
const MEET_LINK = process.env.MEET_LINK || "";

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

// Method-specific "what to do next" copy when payment is still awaiting.
function awaitingPaymentInstructions(input: ConfirmInput): string[] {
  const amt = `$${input.amountUsd.toLocaleString()}`;
  if (input.method === "zelle") {
    return [
      `We'll text the Zelle handle to your phone shortly. Send ${amt} with memo "${input.reference}" — we'll mark your filing paid as soon as it lands (usually within minutes).`,
    ];
  }
  if (input.method === "cash") {
    return [
      `Bring ${amt} in cash or a cashier's check to your appointment. We'll print your receipt and start the filing the moment you walk in.`,
    ];
  }
  // Card with awaiting status means Stripe redirect was abandoned — they
  // can return to the payment page anytime to finish.
  return [
    `Your card payment didn't complete. You can finish at https://mongolstay.com/file/${input.kind}/payment using reference ${input.reference}.`,
  ];
}

export async function sendClientConfirmation(input: ConfirmInput) {
  const resend = getResend();
  const scheduleLine = formatScheduleLine(input.schedule);
  const subject = input.paid
    ? `Mongolstay · ${FILING_LABEL[input.kind]} · ${input.reference}`
    : `Mongolstay · Awaiting payment · ${input.reference}`;

  // Surface the Meet link only for video appointments (in-person doesn't need
  // it; callbacks don't have one yet).
  const meetLine =
    MEET_LINK && input.schedule.mode === "appointment" && input.schedule.channel === "video"
      ? [`Video call: ${MEET_LINK}`]
      : [];

  const lines = [
    `Hi ${input.clientName || "there"},`,
    "",
    input.paid
      ? `Thanks — we've received your payment of $${input.amountUsd.toLocaleString()} for ${FILING_LABEL[input.kind]}.`
      : `We've recorded your filing for ${FILING_LABEL[input.kind]} ($${input.amountUsd.toLocaleString()} via ${METHOD_LABEL[input.method]}).`,
  ];

  if (!input.paid) {
    lines.push("", ...awaitingPaymentInstructions(input));
  }

  lines.push(
    "",
    `Reference: ${input.reference}`,
    `Schedule:  ${scheduleLine}`,
    ...meetLine,
    "",
    "An attorney will review your case before any USCIS filing. We'll be in touch with anything we still need.",
    "",
    `Track your filing anytime: https://mongolstay.com/dashboard`,
    "",
    "— Mongolstay",
  );

  return resend.emails.send({ from: FROM, to: input.to, subject, text: lines.join("\n") });
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
