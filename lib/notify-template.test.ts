import { describe, expect, it } from "vitest"
import { renderTemplate } from "./notify-template"

describe("renderTemplate", () => {
  it("replaces every supported placeholder", () => {
    const rendered = renderTemplate(
      "Blog {{event}}: {{title}} at {{url}} ({{views}} views)",
      { event: "share", title: "Hello", url: "https://example.com/post", views: 12 },
    )
    expect(rendered).toBe("Blog share: Hello at https://example.com/post (12 views)")
  })

  it("replaces repeated placeholders and preserves zero values", () => {
    expect(renderTemplate("{{title}} / {{title}} / {{views}}", { title: "Post", views: 0 }))
      .toBe("Post / Post / 0")
  })

  it("accepts optional whitespace inside braces", () => {
    expect(renderTemplate("{{ title }} {{event}}", { title: "Post", event: "comment" }))
      .toBe("Post comment")
  })

  it("keeps unknown placeholders visible", () => {
    expect(renderTemplate("{{title}} {{unknown}}", { title: "Post" })).toBe("Post {{unknown}}")
  })

  it("returns templates without placeholders unchanged", () => {
    expect(renderTemplate("plain text", {})).toBe("plain text")
  })
})
