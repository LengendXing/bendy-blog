import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { locales, localeNames } from "./i18n"

const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8")

test("README language codes cover every locale in lib/i18n.ts", () => {
  const codes = readme.match(/Multi-language config \(([^)]+)\)/)?.[1].split("/") ?? []
  for (const locale of locales) {
    assert.ok(codes.includes(locale), `README is missing locale code: ${locale}`)
  }
})

test("README i18n names cover every locale including Tibetan", () => {
  const names = readme.match(/^Supports: (.+)$/m)?.[1].split(", ") ?? []
  for (const locale of locales) {
    assert.ok(names.includes(localeNames[locale]), `README is missing locale name: ${locale}`)
  }
  assert.ok(names.includes("བོད་སྐད།"), "README is missing the Tibetan locale name")
})
