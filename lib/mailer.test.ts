import test from "node:test"
import assert from "node:assert/strict"
import { getMailTransport, resetMailTransport, SMTP_TIMEOUTS } from "./mailer"

test("SMTP transport is created once and reused", () => {
  resetMailTransport()
  const first = getMailTransport()
  const second = getMailTransport()
  assert.equal(first, second)
  resetMailTransport()
})

test("SMTP transport uses pooling and bounded timeouts", () => {
  resetMailTransport()
  const options = getMailTransport().options as Record<string, unknown>
  assert.equal(options.pool, true)
  assert.equal(options.maxConnections, 2)
  assert.equal(options.connectionTimeout, SMTP_TIMEOUTS.connectionTimeout)
  assert.equal(options.greetingTimeout, SMTP_TIMEOUTS.greetingTimeout)
  assert.equal(options.socketTimeout, SMTP_TIMEOUTS.socketTimeout)
  assert.equal(options.dnsTimeout, SMTP_TIMEOUTS.dnsTimeout)
  resetMailTransport()
})
