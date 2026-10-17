import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const sitemapSource = readFileSync(join(process.cwd(), "app", "sitemap.ts"), "utf8")

test("sitemap keeps hourly revalidation without force-dynamic", () => {
  assert.match(sitemapSource, /export const revalidate = 3600\b/)
  assert.doesNotMatch(sitemapSource, /export const dynamic\s*=\s*["']force-dynamic["']/)
})
