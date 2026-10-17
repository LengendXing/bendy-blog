import nodemailer, { type Transporter } from "nodemailer"

export const SMTP_TIMEOUTS = {
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 30_000,
  dnsTimeout: 10_000,
} as const

let transport: Transporter | null = null

/** Reuse one pooled SMTP transport instead of opening a connection per email. */
export function getMailTransport(): Transporter {
  if (!transport) {
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      pool: true,
      maxConnections: 2,
      maxMessages: 100,
      ...SMTP_TIMEOUTS,
    })
  }
  return transport
}

/** Close and forget the shared transport (used by tests and shutdown paths). */
export function resetMailTransport(): void {
  transport?.close()
  transport = null
}
