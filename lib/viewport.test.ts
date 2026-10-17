import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const layoutSource = readFileSync(join(process.cwd(), "app", "layout.tsx"), "utf8")

test("viewport keeps responsive defaults without disabling zoom", () => {
  assert.match(layoutSource, /export const viewport:\s*Viewport\s*=\s*\{/)
  assert.match(layoutSource, /width:\s*["']device-width["']/)
  assert.match(layoutSource, /initialScale:\s*1\b/)
  assert.doesNotMatch(layoutSource, /maximumScale\s*:/)
  assert.doesNotMatch(layoutSource, /userScalable\s*:\s*false/)
})
