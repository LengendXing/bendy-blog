import { describe, expect, it } from "vitest"
import { formatPostDate } from "./format-date"

describe("formatPostDate", () => {
  it("formats ISO timestamps in a stable timezone", () => {
    expect(formatPostDate("2026-10-17T12:00:00.000Z", "UTC")).toBe("Oct 17, 2026")
  })

  it("accepts Date instances", () => {
    expect(formatPostDate(new Date("2026-01-05T12:00:00.000Z"), "UTC")).toBe("Jan 5, 2026")
  })

  it("returns an em dash for missing or invalid values", () => {
    expect(formatPostDate(null)).toBe("—")
    expect(formatPostDate(undefined)).toBe("—")
    expect(formatPostDate("")).toBe("—")
    expect(formatPostDate("not-a-date")).toBe("—")
  })
})
