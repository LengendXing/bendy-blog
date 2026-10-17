import test from "node:test"
import assert from "node:assert/strict"
import {
  buildEmailHtml,
  buildEmailSubject,
  buildWebhookBody,
  escapeHtml,
  escapeJsonValue,
  sendWebhook,
  WEBHOOK_TIMEOUT_MS,
  type NotifyPayload,
} from "./notify-template"

const payload: NotifyPayload = {
  event: "comment",
  title: 'He said "hi"\nand \\ left',
  url: "https://example.com/blogs/a?x=1&y=2",
  views: 7,
}

test("webhook body keeps template JSON valid when values contain quotes and newlines", () => {
  const body = buildWebhookBody(
    { text: "{{event}}: {{title}} - {{url}} ({{views}} views)" },
    payload,
  )
  const parsed = JSON.parse(body)
  assert.equal(
    parsed.text,
    'comment: He said "hi"\nand \\ left - https://example.com/blogs/a?x=1&y=2 (7 views)',
  )
})

test("webhook body escapes values inside a string template", () => {
  const body = buildWebhookBody("{{event}}: {{title}}", payload)
  assert.equal(JSON.parse(body), `comment: ${payload.title}`)
})

test("escapeJsonValue produces a JSON-safe fragment", () => {
  const value = 'a"b\\c\nd\te'
  assert.equal(JSON.parse(`"${escapeJsonValue(value)}"`), value)
})

test("email HTML escapes markup and attributes", () => {
  const html = buildEmailHtml(
    '<p>{{title}}</p><a href="{{url}}">{{event}}</a>',
    { ...payload, title: '<script>alert("x")</script>' },
  )
  assert.ok(html.includes("&lt;script&gt;"))
  assert.ok(!html.includes("<script>"))
  assert.ok(html.includes("&quot;"))
  assert.ok(html.includes("&amp;"))
})

test("email subject strips header-breaking newlines", () => {
  assert.equal(
    buildEmailSubject({ ...payload, title: "a\r\nbcc: attacker@example.com" }),
    "Blog comment: a bcc: attacker@example.com",
  )
})

test("escapeHtml escapes all HTML-significant characters", () => {
  assert.equal(escapeHtml(`<>&"'`), "&lt;&gt;&amp;&quot;&#39;")
})

test("webhook sends a timeout signal and posts escaped JSON", async (t) => {
  const originalFetch = globalThis.fetch
  let received: RequestInit | undefined
  globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
    received = init
    return new Response("ok", { status: 200 })
  }) as typeof fetch
  t.after(() => { globalThis.fetch = originalFetch })

  await sendWebhook({ url: "https://example.com/hook", method: "post" }, payload)

  assert.equal(received?.method, "POST")
  assert.ok(received?.signal instanceof AbortSignal)
  assert.equal(WEBHOOK_TIMEOUT_MS, 10_000)
  const parsed = JSON.parse(String(received?.body))
  assert.equal(parsed.title, payload.title)
})

test("webhook GET sends no body", async (t) => {
  const originalFetch = globalThis.fetch
  let received: RequestInit | undefined
  globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
    received = init
    return new Response("ok", { status: 200 })
  }) as typeof fetch
  t.after(() => { globalThis.fetch = originalFetch })

  await sendWebhook({ url: "https://example.com/hook", method: "GET" }, payload)
  assert.equal(received?.method, "GET")
  assert.equal(received?.body, undefined)
})

test("webhook rejects non-2xx responses with status and body detail", async (t) => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => new Response("upstream boom", { status: 502 })) as typeof fetch
  t.after(() => { globalThis.fetch = originalFetch })

  await assert.rejects(
    () => sendWebhook({ url: "https://example.com/hook" }, payload),
    /Webhook responded 502: upstream boom/,
  )
})
