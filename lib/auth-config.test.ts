import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

const source = readFileSync(new URL("./auth.ts", import.meta.url), "utf8")

test("lib/auth.ts has no commented-out legacy callbacks/events block", () => {
  assert.equal(/^\s*\/\/\s*(?:callbacks|events|pages)\s*:/m.test(source), false)
})

test("lib/auth.ts keeps a single active callbacks and events configuration", () => {
  assert.equal((source.match(/^  callbacks: \{/gm) || []).length, 1)
  assert.equal((source.match(/^  events: \{/gm) || []).length, 1)
})
