import { prisma } from "./prisma"
import nodemailer from "nodemailer"
import { logStructured } from "./observability"
import {
  buildAlertEmailHtml,
  buildAlertEmailSubject,
  buildAlertWebhookPayload,
  buildEmailSubject,
  escapeHtml,
  formatAlertSummary,
  renderEmailTemplate,
  renderWebhookBody,
  type NotifyTemplatePayload,
} from "./notify-format"

const WEBHOOK_TIMEOUT_MS = 10_000

const EMAIL_TIMEOUT_MS = 10_000

export interface NotifyPayload extends NotifyTemplatePayload {
  event: "view" | "share" | "comment" | "alert"
}

export interface OperationalAlert {
  fingerprint: string
  event: string
  severity: "warning" | "error" | "critical"
  title: string
  message: string
  occurredAt?: string
  context?: Record<string, unknown>
}

interface NotifyConfigRecord {
  id: string
  type: string
  config: string
}

interface AlertDispatchOptions {
  excludeConfigIds?: string[]
}

/**
 * Deliver a normal blog event to every enabled notification configuration.
 * One broken configuration must never prevent the remaining ones from being
 * attempted, and every failure is logged plus forwarded to the alert channel.
 */
export async function sendNotifications(payload: NotifyPayload): Promise<void> {
  const configs = await loadEnabledConfigs()
  if (!configs) return

  for (const cfg of configs) {
    try {
      await deliverConfig(cfg, payload)
    } catch (error) {
      logStructured("error", {
        event: "notify.delivery_failed",
        component: "notify",
        action: cfg.type,
        outcome: "failure",
        context: { configId: cfg.id, configType: cfg.type, notifyEvent: payload.event },
        error,
      })
      if (payload.event !== "alert") {
        await sendOperationalAlert({
          fingerprint: `notify.delivery_failed:${cfg.id}`,
          event: "notify.delivery_failed",
          severity: "warning",
          title: `Notification delivery failed (${cfg.type})`,
          message: error instanceof Error ? error.message : String(error),
          context: { configId: cfg.id, configType: cfg.type, notifyEvent: payload.event },
        }, { excludeConfigIds: [cfg.id] })
      }
    }
  }
}

async function loadEnabledConfigs(): Promise<NotifyConfigRecord[] | null> {
  try {
    return await prisma.notifyConfig.findMany({ where: { enabled: true } })
  } catch (error) {
    logStructured("error", {
      event: "notify.config_load_failed",
      component: "notify",
      outcome: "failure",
      error,
    })
    return null
  }
}

function buildOperationalPayload(alert: OperationalAlert): NotifyPayload {
  return {
    event: "alert",
    title: alert.title,
    url: `${process.env.NEXTAUTH_URL || ""}/admin/settings`,
    message: alert.message,
    severity: alert.severity,
    fingerprint: alert.fingerprint,
    occurredAt: alert.occurredAt || new Date().toISOString(),
    context: alert.context,
  }
}

function logAlertResults(
  results: PromiseSettledResult<void>[],
  targets: NotifyConfigRecord[],
  alert: OperationalAlert,
): { sent: number; failed: number } {
  let sent = 0
  let failed = 0

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      sent += 1
      return
    }
    failed += 1
    logStructured("error", {
      event: "ops.alert_delivery_failed",
      component: "notify",
      action: targets[index].type,
      outcome: "failure",
      context: { configId: targets[index].id, configType: targets[index].type, fingerprint: alert.fingerprint },
      error: result.reason,
    })
  })

  logStructured(sent > 0 ? "info" : "error", {
    event: "ops.alert_dispatched",
    component: "notify",
    outcome: sent > 0 ? "success" : "failure",
    context: {
      fingerprint: alert.fingerprint,
      alertEvent: alert.event,
      severity: alert.severity,
      sent,
      failed,
    },
  })

  return { sent, failed }
}

/**
 * Send an operational alert through the same notification center used for
 * blog events. Alerts never recurse: delivery failures are only logged.
 */
export async function sendOperationalAlert(
  alert: OperationalAlert,
  options: AlertDispatchOptions = {},
): Promise<{ sent: number; failed: number }> {
  const configs = await loadEnabledConfigs()
  if (!configs) return { sent: 0, failed: 0 }

  const excluded = new Set(options.excludeConfigIds || [])
  const targets = configs.filter(config => !excluded.has(config.id))
  if (targets.length === 0) {
    logStructured("warn", {
      event: "ops.alert_no_channels",
      component: "notify",
      outcome: "skipped",
      context: { fingerprint: alert.fingerprint, alertEvent: alert.event, configured: configs.length },
    })
    return { sent: 0, failed: 0 }
  }

  const payload = buildOperationalPayload(alert)
  const results = await Promise.allSettled(targets.map(config => deliverConfig(config, payload)))
  return logAlertResults(results, targets, alert)
}

async function deliverConfig(config: NotifyConfigRecord, payload: NotifyPayload): Promise<void> {
  const parsed = JSON.parse(config.config)
  if (config.type === "webhook") {
    await sendWebhook(parsed, payload)
    return
  }
  if (config.type === "email") {
    await sendEmail(parsed, payload)
    return
  }
  throw new Error(`Unsupported notification type: ${config.type}`)
}

async function sendWebhook(config: any, payload: NotifyPayload): Promise<void> {
  const { url, method, headers: extraHeaders, body: bodyTemplate } = config || {}
  if (typeof url !== "string" || !/^https?:\/\//i.test(url)) {
    throw new Error("Webhook URL is missing or invalid")
  }

  const verb = String(method || "POST").toUpperCase()
  const body = payload.event === "alert" && !bodyTemplate
    ? JSON.stringify(buildAlertWebhookPayload(payload))
    : renderWebhookBody(bodyTemplate, payload)

  const response = await fetch(url, {
    method: verb,
    headers: { "Content-Type": "application/json", ...(extraHeaders || {}) },
    ...(verb !== "GET" ? { body } : {}),
    signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    throw new Error(`Webhook responded ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`)
  }
}

async function sendEmail(config: any, payload: NotifyPayload): Promise<void> {
  if (!config?.to) throw new Error("Email recipient is missing")

  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: EMAIL_TIMEOUT_MS,
    greetingTimeout: EMAIL_TIMEOUT_MS,
    socketTimeout: EMAIL_TIMEOUT_MS,
  })

  const subject = payload.event === "alert" ? buildAlertEmailSubject(payload) : buildEmailSubject(payload)
  const html = config.template
    ? renderEmailTemplate(String(config.template), payload)
    : payload.event === "alert"
      ? buildAlertEmailHtml(payload)
      : [
        `<p>Event: ${escapeHtml(payload.event)}</p>`,
        `<p>Title: ${escapeHtml(payload.title)}</p>`,
        `<p>URL: ${escapeHtml(payload.url)}</p>`,
        `<p>Views: ${payload.views || 0}</p>`,
      ].join("")
  const text = payload.event === "alert"
    ? formatAlertSummary(payload)
    : `${payload.event}: ${payload.title} - ${payload.url}`

  try {
    await transport.sendMail({
      from: process.env.SMTP_FROM,
      to: config.to,
      subject,
      html,
      text,
    })
  } finally {
    transport.close()
  }
}
