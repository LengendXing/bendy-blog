import test from "node:test"
import assert from "node:assert/strict"
import {
  buildAlertEmailSubject,
  buildAlertWebhookPayload,
  escapeHtml,
  formatAlertSummary,
  renderEmailTemplate,
  renderWebhookBody,
} from "./notify-format"

const alertPayload = {
  event: "alert" as const,
  title: 'Publish "failed"',
  url: "https://example.com/admin/settings",
  message: "GitHub API 500",
  severity: "error" as const,
  fingerprint: "content.publish_failed:api.blog:create",
  occurredAt: "2026-10-17T00:00:00.000Z",
  context: { slug: "hello" },
}

test("escapeHtml neutralizes markup", () => {
  assert.equal(escapeHtml(`<script>"x"&'y'</script>`), "&lt;script&gt;&quot;x&quot;&amp;&#39;y&#39;&lt;/script&gt;")
})

test("renderWebhookBody keeps object templates valid JSON and escapes values", () => {
  const rendered = renderWebhookBody(
    { text: "Event: {{event}}", title: "{{title}}", severity: "{{severity}}" },
    alertPayload,
  )
  const parsed = JSON.parse(rendered)
  assert.equal(parsed.text, "Event: alert")
  assert.equal(parsed.title, 'Publish "failed"')
  assert.equal(parsed.severity, "error")
})

test("renderWebhookBody keeps string JSON templates valid when values contain quotes", () => {
  const rendered = renderWebhookBody('{"title":"{{title}}","message":"{{message}}"}', alertPayload)
  const parsed = JSON.parse(rendered)
  assert.equal(parsed.title, 'Publish "failed"')
  assert.equal(parsed.message, "GitHub API 500")
})

test("renderWebhookBody falls back to the default alert payload", () => {
  const parsed = JSON.parse(renderWebhookBody(undefined, alertPayload))
  assert.equal(parsed.event, "alert")
  assert.equal(parsed.fingerprint, alertPayload.fingerprint)
  assert.deepEqual(parsed.context, { slug: "hello" })
})

test("email templates escape HTML values", () => {
  const html = renderEmailTemplate("<h1>{{title}}</h1><p>{{message}}</p>", alertPayload)
  assert.equal(html, "<h1>Publish &quot;failed&quot;</h1><p>GitHub API 500</p>")
})

test("alert email subject and summary include the alert details", () => {
  assert.equal(buildAlertEmailSubject(alertPayload), '[Bendy Blog][ERROR] alert: Publish "failed"')
  const summary = formatAlertSummary(alertPayload)
  assert.match(summary, /GitHub API 500/)
  assert.match(summary, /"slug":"hello"/)
})

test("buildAlertWebhookPayload preserves alert metadata", () => {
  const payload = buildAlertWebhookPayload(alertPayload)
  assert.equal(payload.event, "alert")
  assert.equal(payload.severity, "error")
  assert.equal(payload.fingerprint, alertPayload.fingerprint)
})
