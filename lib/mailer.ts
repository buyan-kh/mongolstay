import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

// Send mail via Gmail SMTP using a Google App Password. The user owns
// contact@mongolstay.com through Google Workspace, so we send straight from
// that account — no third-party mail service, no DNS verification dance.
//
// Setup: https://myaccount.google.com/apppasswords (Workspace admin must
// allow app passwords). Set GMAIL_USER + GMAIL_APP_PASSWORD in env.
//
// When env is missing we log + no-op so dev keeps working.

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

let _transport: Transporter | null = null;

function getTransport(): Transporter | null {
  if (_transport) return _transport;
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) return null;
  _transport = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // TLS, not STARTTLS
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
  });
  return _transport;
}

export async function sendMail(input: {
  from: string;
  to: string;
  subject: string;
  text: string;
}) {
  const t = getTransport();
  if (!t) {
    console.log(`[mail:noop] would have sent to ${input.to}: ${input.subject}`);
    return { skipped: true } as const;
  }
  return t.sendMail(input);
}
