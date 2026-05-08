import "server-only";
import type { FlowKind } from "./flow-data";

// Thin Twilio REST wrapper. We don't pull in the twilio SDK — the API is one
// POST. When any required env var is missing we silently no-op so dev + early
// production keep working before SMS is wired up.

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const FROM_NUMBER = process.env.TWILIO_FROM_NUMBER;
const MEET_LINK = process.env.MEET_LINK || "";

const FILING_LABEL: Record<FlowKind, string> = {
  j1f1: "J-1 → F-1 (I-539)",
  b1b2f1: "B-1/B-2 → F-1 (I-539)",
  asylum: "Asylum (I-589)",
};

export type SmsConfirmInput = {
  to: string;
  reference: string;
  kind: FlowKind;
  schedule:
    | { mode: "appointment"; iso: string; channel: "office" | "video" }
    | { mode: "callback"; window: string }
    | { mode: null };
};

// Coerce a free-form phone number to E.164 (best effort). Strips everything
// non-digit, prepends + if absent, defaults to +1 if the user typed a 10-digit
// US number with no country code.
function toE164(raw: string): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (raw.trim().startsWith("+")) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;     // assume US
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}

function configured() {
  return !!(ACCOUNT_SID && AUTH_TOKEN && FROM_NUMBER);
}

async function send(to: string, body: string) {
  if (!configured()) {
    console.log(`[sms:noop] would have sent to ${to}: ${body}`);
    return { skipped: true } as const;
  }
  const url = `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`;
  const auth = Buffer.from(`${ACCOUNT_SID}:${AUTH_TOKEN}`).toString("base64");
  const form = new URLSearchParams({ From: FROM_NUMBER!, To: to, Body: body });
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`twilio ${res.status}: ${text}`);
  }
  return { skipped: false, body: await res.json() } as const;
}

function formatScheduleLine(s: SmsConfirmInput["schedule"]): string {
  if (s.mode === "appointment") {
    const d = new Date(s.iso);
    const date = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    return `${date} ${time} (${s.channel === "video" ? "Zoom" : "in-person"})`;
  }
  if (s.mode === "callback") return `Callback: ${s.window}`;
  return "Schedule pending";
}

export async function sendClientSmsConfirmation(input: SmsConfirmInput) {
  const to = toE164(input.to);
  if (!to) return { skipped: true, reason: "no phone" } as const;
  const isVideo = input.schedule.mode === "appointment" && input.schedule.channel === "video";
  const meetTail = MEET_LINK && isVideo ? ` Meet: ${MEET_LINK}` : "";
  const body =
    `Mongolstay: ${FILING_LABEL[input.kind]} confirmed. ` +
    `Ref ${input.reference}. ` +
    `${formatScheduleLine(input.schedule)}.${meetTail} ` +
    `Track: https://mongolstay.com/dashboard`;
  return send(to, body);
}
