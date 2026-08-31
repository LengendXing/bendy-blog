import test from "node:test"
import assert from "node:assert/strict"
import { clampDelay, LIST_SKELETON_DELAY_MS, shouldShowSkeleton } from "./loading"

test("list skeleton uses a strict 1.5 second threshold", () => {
  const startedAt = 10_000
  assert.equal(shouldShowSkeleton(startedAt, startedAt + LIST_SKELETON_DELAY_MS), false)
  assert.equal(shouldShowSkeleton(startedAt, startedAt + LIST_SKELETON_DELAY_MS + 1), true)
  assert.equal(shouldShowSkeleton(startedAt, startedAt - 1), false)
})

test("clampDelay normalizes invalid and negative delays", () => {
  assert.equal(clampDelay(-20), 0)
  assert.equal(clampDelay(Number.NaN), LIST_SKELETON_DELAY_MS)
  assert.equal(clampDelay(Number.POSITIVE_INFINITY), LIST_SKELETON_DELAY_MS)
  assert.equal(clampDelay(240), 240)
})
