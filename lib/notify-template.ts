export interface NotifyPayload {
  event: "view" | "share" | "comment"
  title: string
  url: string
  views?: number
}

export const WEBHOOK_TIMEOUT_MS = 10_000

const TEMPLATE_VARIABLE_PATTERN = /\{\{(event|title|url|views)\}\}/g

/** Escape a value so it can be embedded inside a JSON string literal. */
export function escapeJsonValue(value: string): string {
  return JSON.stringify(value).slice(1, -1)
}

/** Escape a value so it can be embedded in HTML text or attribute values. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export function renderTemplate(
  template: string,
  payload: NotifyPayload,
  escapeValue: (value: string) => string,
): string {
  const values: Record<string, string> = {
    event: payload.event,
    title: payload.title,
    url: payload.url,
    views: String(payload.views ?? 0),
  }
  return template.replace(TEMPLATE_VARIABLE_PATTERN, (_match, key: string) => escapeValue(values[key]))
}

export function buildWebhookBody(bodyTemplate: unknown, payload: NotifyPayload): string {
  return renderTemplate(JSON.stringify(bodyTemplate || payload), payload, escapeJsonValue)
}

export function buildEmailSubject(payload: NotifyPayload): string {
  const title = payload.title.replace(/[\r\n]+/g, " ").trim()
  return `Blog ${payload.event}: ${title}`
}

export function buildEmailHtml(template: string | undefined, payload: NotifyPayload): string {
  const source = template
    || "<p>Event: {{event}}</p><p>Title: {{title}}</p><p>URL: {{url}}</p><p>Views: {{views}}</p>"
  return renderTemplate(source, payload, escapeHtml)
}

export async function sendWebhook(config: any, payload: NotifyPayload): Promise<void> {
  const { url, method, headers: hdrs, body: bodyTemplate } = config || {}
  const httpMethod = String(method || "POST").toUpperCase()
  const response = await fetch(url, {
    method: httpMethod,
    headers: { "Content-Type": "application/json", ...(hdrs || {}) },
    ...(httpMethod !== "GET" ? { body: buildWebhookBody(bodyTemplate, payload) } : {}),
    signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    throw new Error(`Webhook responded ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`)
  }
}
