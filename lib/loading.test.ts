import { describe, expect, it } from "vitest"
import { clampDelay, LIST_SKELETON_DELAY_MS, shouldShowSkeleton } from "./loading"

describe("list skeleton timing", () => {
  it("uses a strict 1.5 second threshold", () => {
    const startedAt = 10_000
    expect(shouldShowSkeleton(startedAt, startedAt + LIST_SKELETON_DELAY_MS)).toBe(false)
    expect(shouldShowSkeleton(startedAt, startedAt + LIST_SKELETON_DELAY_MS + 1)).toBe(true)
    expect(shouldShowSkeleton(startedAt, startedAt - 1)).toBe(false)
  })

  it("normalizes invalid and negative delays", () => {
    expect(clampDelay(-20)).toBe(0)
    expect(clampDelay(Number.NaN)).toBe(LIST_SKELETON_DELAY_MS)
    expect(clampDelay(Number.POSITIVE_INFINITY)).toBe(LIST_SKELETON_DELAY_MS)
    expect(clampDelay(240)).toBe(240)
  })
})
