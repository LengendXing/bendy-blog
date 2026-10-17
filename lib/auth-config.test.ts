import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const source = readFileSync(join(process.cwd(), "lib", "auth.ts"), "utf8")

test("auth.ts has no commented-out legacy callbacks block", () => {
  assert.doesNotMatch(source, /\/\/\s*callbacks\s*:/)
  assert.doesNotMatch(source, /\/\/\s*events\s*:/)
})

test("auth.ts declares each NextAuth hook exactly once", () => {
  assert.equal(source.match(/\bcallbacks\s*:/g)?.length, 1)
  assert.equal(source.match(/\bevents\s*:/g)?.length, 1)
})
