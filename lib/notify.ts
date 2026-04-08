import { prisma } from "./prisma"
import nodemailer from "nodemailer"

interface NotifyPayload {
  event: "view" | "share" | "comment"
  title: string
  url: string
  views?: number
}

export async function sendNotifications(payload: NotifyPayload) {
  const configs = await prisma.notifyConfig.findMany({ where: { enabled: true } })
  for (const cfg of configs) {
    try {
      const config = JSON.parse(cfg.config)
      if (cfg.type === "webhook") {
        await sendWebhook(config, payload)
      } else if (cfg.type === "email") {
        await sendEmail(config, payload)
      }
    } catch (e) {
      console.error("Notify error:", e)
    }
  }
}

async function sendWebhook(config: any, payload: NotifyPayload) {
  const { url, method, headers: hdrs, body: bodyTemplate } = config
  let bodyStr = JSON.stringify(bodyTemplate || payload)
  bodyStr = bodyStr.replace(/\{\{title\}\}/g, payload.title)
    .replace(/\{\{url\}\}/g, payload.url)
    .replace(/\{\{views\}\}/g, String(payload.views || 0))
    .replace(/\{\{event\}\}/g, payload.event)

  const reqHeaders: Record<string, string> = { "Content-Type": "application/json", ...hdrs }
  await fetch(url, {
    method: method || "POST",
    headers: reqHeaders,
    ...(method !== "GET" ? { body: bodyStr } : {}),
  })
}

async function sendEmail(config: any, payload: NotifyPayload) {
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  })
  let subject = `Blog ${payload.event}: ${payload.title}`
  let html = config.template || `<p>Event: ${payload.event}</p><p>Title: ${payload.title}</p><p>URL: ${payload.url}</p><p>Views: ${payload.views || 0}</p>`
  html = html.replace(/\{\{title\}\}/g, payload.title)
    .replace(/\{\{url\}\}/g, payload.url)
    .replace(/\{\{views\}\}/g, String(payload.views || 0))
    .replace(/\{\{event\}\}/g, payload.event)

  await transport.sendMail({
    from: process.env.SMTP_FROM,
    to: config.to,
    subject,
    html,
  })
}
