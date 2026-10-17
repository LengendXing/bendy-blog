import test from "node:test"
import assert from "node:assert/strict"
import { createAlertThrottle, DEFAULT_ALERT_COOLDOWN_MS, resolveAlertCooldownMs } from "./alert-throttle"

test("resolveAlertCooldownMs converts seconds and rejects invalid values", () => {
  assert.equal(resolveAlertCooldownMs("120"), 120_000)
  assert.equal(resolveAlertCooldownMs("0"), 0)
  assert.equal(resolveAlertCooldownMs(undefined), DEFAULT_ALERT_COOLDOWN_MS)
  assert.equal(resolveAlertCooldownMs("nope"), DEFAULT_ALERT_COOLDOWN_MS)
  assert.equal(resolveAlertCooldownMs("-5"), DEFAULT_ALERT_COOLDOWN_MS)
})

test("createAlertThrottle suppresses duplicates inside the cooldown window", () => {
  const throttle = createAlertThrottle(1_000)
  assert.equal(throttle.shouldSend("publish", 10_000), true)
  assert.equal(throttle.shouldSend("publish", 10_500), false)
  assert.equal(throttle.shouldSend("publish", 11_000), true)
  assert.equal(throttle.size(), 1)
})

test("createAlertThrottle tracks fingerprints independently", () => {
  const throttle = createAlertThrottle(1_000)
  assert.equal(throttle.shouldSend("publish", 10_000), true)
  assert.equal(throttle.shouldSend("delete", 10_000), true)
  assert.equal(throttle.size(), 2)

  throttle.reset()
  assert.equal(throttle.size(), 0)
  assert.equal(throttle.shouldSend("publish", 10_001), true)
})
