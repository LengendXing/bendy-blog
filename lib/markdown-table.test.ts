import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { MarkdownTable } from "../components/markdown-table"

test("markdown tables render inside a focusable horizontal scroll container", () => {
  const html = renderToStaticMarkup(
    React.createElement(MarkdownTable, null, React.createElement("tbody", null, React.createElement("tr", null, React.createElement("td", null, "cell")))),
  )
  assert.match(html, /^<div class="prose-table-scroll w-full min-w-0" tabindex="0"><table>/)
  assert.match(html, /<\/table><\/div>$/)
})

test("table scroll container keeps wide tables from widening the page", () => {
  const css = readFileSync(new URL("../styles/globals.css", import.meta.url), "utf8")
  const block = css.match(/\.prose-table-scroll \{([\s\S]*?)\}/)?.[1] ?? ""
  assert.match(block, /width:\s*100%/)
  assert.match(block, /min-width:\s*0/)
  assert.match(block, /max-width:\s*100%/)
  assert.match(block, /overflow-x:\s*auto/)
  assert.match(css, /@media \(max-width: 640px\) \{\s*\.prose-pixel table \{ font-size: 12px; \}/)
})
