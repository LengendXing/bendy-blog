import test from "node:test"
import assert from "node:assert/strict"
import {
  formatTimelineDateKey,
  resolveTimelineRange,
  toTimelineDateParam,
} from "./timeline"

test("explicit Shanghai dates map to UTC day boundaries", () => {
  const range = resolveTimelineRange("2026-10-14")

  assert.ok(range)
  assert.equal(range.dateKey, "2026-10-14")
  assert.equal(range.start.toISOString(), "2026-10-13T16:00:00.000Z")
  assert.equal(range.end.toISOString(), "2026-10-14T15:59:59.999Z")
})

test("instants between Beijing 00:00 and 08:00 stay on the Shanghai day", () => {
  const range = resolveTimelineRange("2026-10-13T23:00:00.000Z")

  assert.ok(range)
  assert.equal(range.dateKey, "2026-10-14")
  assert.equal(range.start.toISOString(), "2026-10-13T16:00:00.000Z")
  assert.equal(range.end.toISOString(), "2026-10-14T15:59:59.999Z")
})

test("Shanghai midnight starts the next day", () => {
  const range = resolveTimelineRange("2026-10-14T16:00:00.000Z")

  assert.ok(range)
  assert.equal(range.dateKey, "2026-10-15")
  assert.equal(range.start.toISOString(), "2026-10-14T16:00:00.000Z")
})

test("missing dates default to the current Shanghai day", () => {
  const now = new Date("2026-10-13T16:30:00.000Z")
  const range = resolveTimelineRange(null, now)
  const blankRange = resolveTimelineRange("  ", now)

  assert.ok(range)
  assert.equal(range.dateKey, "2026-10-14")
  assert.equal(range.start.toISOString(), "2026-10-13T16:00:00.000Z")
  assert.equal(range.end.toISOString(), "2026-10-14T15:59:59.999Z")
  assert.equal(blankRange?.dateKey, range.dateKey)
})

test("invalid dates are rejected instead of producing invalid ranges", () => {
  assert.equal(resolveTimelineRange("not-a-date"), null)
  assert.equal(resolveTimelineRange("2026-02-30"), null)
  assert.equal(resolveTimelineRange("2026-13-01"), null)
})

test("date keys follow the Shanghai calendar across the UTC boundary", () => {
  assert.equal(formatTimelineDateKey(new Date("2026-10-13T15:59:59.999Z")), "2026-10-13")
  assert.equal(formatTimelineDateKey(new Date("2026-10-13T16:00:00.000Z")), "2026-10-14")
  assert.equal(formatTimelineDateKey(new Date("invalid")), null)
})

test("client query dates use the selected local calendar day", () => {
  assert.equal(toTimelineDateParam(new Date(2026, 9, 14)), "2026-10-14")
  assert.equal(toTimelineDateParam(new Date(2026, 0, 5)), "2026-01-05")
})
