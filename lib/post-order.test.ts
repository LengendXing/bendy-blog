import { describe, expect, it } from "vitest"
import { postEffectiveTimestamp, sortPostsByEffectiveDate } from "./post-order"

type TestPost = {
  slug: string
  publishDate: Date | string | null
  createdAt: Date | string
}

function post(slug: string, publishDate: Date | string | null, createdAt: Date | string): TestPost {
  return { slug, publishDate, createdAt }
}

describe("post ordering", () => {
  it("prefers the explicit publish date over creation time", () => {
    const value = postEffectiveTimestamp({
      publishDate: "2026-03-01T00:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
    })
    expect(value).toBe(Date.parse("2026-03-01T00:00:00.000Z"))
  })

  it("falls back to creation time when the publish date is missing or invalid", () => {
    expect(postEffectiveTimestamp({ publishDate: null, createdAt: "2026-01-02T00:00:00.000Z" }))
      .toBe(Date.parse("2026-01-02T00:00:00.000Z"))
    expect(postEffectiveTimestamp({ publishDate: "not-a-date", createdAt: "2026-01-03T00:00:00.000Z" }))
      .toBe(Date.parse("2026-01-03T00:00:00.000Z"))
  })

  it("sorts newest first by effective date", () => {
    const posts = [
      post("middle", "2026-02-01T00:00:00.000Z", "2026-01-01T00:00:00.000Z"),
      post("newest", "2026-04-01T00:00:00.000Z", "2026-01-01T00:00:00.000Z"),
      post("oldest", null, "2026-01-15T00:00:00.000Z"),
    ]
    expect(sortPostsByEffectiveDate(posts).map(item => item.slug)).toEqual(["newest", "middle", "oldest"])
  })

  it("breaks effective-date ties by creation time", () => {
    const posts = [
      post("first-created", null, "2026-01-01T00:00:00.000Z"),
      post("second-created", null, "2026-01-02T00:00:00.000Z"),
    ]
    expect(sortPostsByEffectiveDate(posts).map(item => item.slug)).toEqual(["second-created", "first-created"])
  })

  it("returns a new array without mutating the input", () => {
    const posts = [
      post("a", null, "2026-01-01T00:00:00.000Z"),
      post("b", null, "2026-01-02T00:00:00.000Z"),
    ]
    const sorted = sortPostsByEffectiveDate(posts)
    expect(sorted).not.toBe(posts)
    expect(posts.map(item => item.slug)).toEqual(["a", "b"])
    expect(sorted.map(item => item.slug)).toEqual(["b", "a"])
  })
})
