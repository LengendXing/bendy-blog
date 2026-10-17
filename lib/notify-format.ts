/**
 * Pure formatting helpers for notification templates.
 *
 * Keeping these functions free of database / network dependencies makes the
 * escaping rules easy to unit test and prevents regressions such as the
 * historical "replace values directly into JSON/HTML" bug.
 */

export interface NotifyTemplatePayload {
  event: string
  title: string
  url: string
  views?: number
  message?: string
  severity?: string
  fingerprint?: string
  occurredAt?: string
  context?: Record<string, unknown>
}

export type TemplateValues = Record<string, string>

const TEMPLATE_PATTERN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export function stripCrlf(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim()
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value) ?? ""
  } catch {
    return ""
  }
}

export function toTemplateValues(payload: NotifyTemplatePayload): TemplateValues {
  return {
    event: payload.event,
    title: payload.title,
    url: payload.url,
    views: String(payload.views ?? 0),
    message: payload.message ?? "",
    severity: payload.severity ?? "",
    fingerprint: payload.fingerprint ?? "",
    occurredAt: payload.occurredAt ?? "",
    context: safeJson(payload.context ?? {}),
  }
}

export function renderTemplate(template: string, values: TemplateValues, transform: (value: string) => string): string {
  return template.replace(TEMPLATE_PATTERN, (match, key: string) => {
    if (!(key in values)) return match
    return transform(values[key])
  })
}

function replaceDeep(value: unknown, values: TemplateValues): unknown {
  if (typeof value === "string") return renderTemplate(value, values, item => item)
  if (Array.isArray(value)) return value.map(item => replaceDeep(item, values))
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, replaceDeep(item, values)]),
    )
  }
  return value
}

function escapeJsonFragment(value: string): string {
  return JSON.stringify(value).slice(1, -1)
}

/**
 * Render a webhook body. Object templates are serialized after replacement so
 * JSON.stringify performs the escaping. String templates that look like JSON
 * are escaped before replacement; plain text templates keep the old raw
 * substitution behavior.
 */
export function renderWebhookBody(bodyTemplate: unknown, payload: NotifyTemplatePayload): string {
  const values = toTemplateValues(payload)

  if (bodyTemplate === undefined || bodyTemplate === null) {
    return JSON.stringify({
      event: payload.event,
      title: payload.title,
      url: payload.url,
      views: payload.views ?? 0,
      ...(payload.message !== undefined ? { message: payload.message } : {}),
      ...(payload.severity !== undefined ? { severity: payload.severity } : {}),
      ...(payload.fingerprint !== undefined ? { fingerprint: payload.fingerprint } : {}),
      ...(payload.occurredAt !== undefined ? { occurredAt: payload.occurredAt } : {}),
      ...(payload.context !== undefined ? { context: payload.context } : {}),
    })
  }

  if (typeof bodyTemplate === "string") {
    const trimmed = bodyTemplate.trim()
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      const escaped = renderTemplate(bodyTemplate, values, escapeJsonFragment)
      try {
        JSON.parse(escaped)
        return escaped
      } catch {
        // Fall through to the raw rendering for non-JSON string bodies.
      }
    }
    return renderTemplate(bodyTemplate, values, item => item)
  }

  return JSON.stringify(replaceDeep(bodyTemplate, values))
}

export function renderEmailTemplate(template: string, payload: NotifyTemplatePayload): string {
  return renderTemplate(template, toTemplateValues(payload), escapeHtml)
}

export function buildEmailSubject(payload: NotifyTemplatePayload): string {
  return `Blog ${payload.event}: ${stripCrlf(payload.title)}`
}

export function buildAlertEmailSubject(payload: NotifyTemplatePayload): string {
  const severity = (payload.severity || "error").toUpperCase()
  return `[Bendy Blog][${severity}] ${payload.event}: ${stripCrlf(payload.title)}`
}

export function buildAlertEmailHtml(payload: NotifyTemplatePayload): string {
  const context = payload.context ? JSON.stringify(payload.context, null, 2) : "{}"
  return [
    `<h2>[${escapeHtml((payload.severity || "error").toUpperCase())}] ${escapeHtml(payload.event)}</h2>`,
    `<p><strong>Title:</strong> ${escapeHtml(payload.title)}</p>`,
    `<p><strong>Message:</strong> ${escapeHtml(payload.message || "")}</p>`,
    `<p><strong>Occurred:</strong> ${escapeHtml(payload.occurredAt || new Date().toISOString())}</p>`,
    `<p><strong>Fingerprint:</strong> ${escapeHtml(payload.fingerprint || "")}</p>`,
    `<pre style="white-space:pre-wrap">${escapeHtml(context)}</pre>`,
  ].join("")
}

export function buildAlertWebhookPayload(payload: NotifyTemplatePayload): Record<string, unknown> {
  return {
    event: "alert",
    severity: payload.severity || "error",
    fingerprint: payload.fingerprint || "",
    title: payload.title,
    message: payload.message || "",
    occurredAt: payload.occurredAt || new Date().toISOString(),
    context: payload.context || {},
  }
}

export function formatAlertSummary(payload: NotifyTemplatePayload): string {
  const details = payload.context ? ` ${safeJson(payload.context)}` : ""
  return `${payload.event}: ${payload.message || payload.title}${details}`
}
