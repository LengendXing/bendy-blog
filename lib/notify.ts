import { prisma } from "./prisma"
import { getMailTransport } from "./mailer"
import {
  buildEmailHtml,
  buildEmailSubject,
  sendWebhook,
  type NotifyPayload,
} from "./notify-template"

export type { NotifyPayload }

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
      console.error(`Notify error (${cfg.type}#${cfg.id}):`, e)
    }
  }
}

async function sendEmail(config: any, payload: NotifyPayload) {
  await getMailTransport().sendMail({
    from: process.env.SMTP_FROM,
    to: config.to,
    subject: buildEmailSubject(payload),
    html: buildEmailHtml(config.template, payload),
  })
}
