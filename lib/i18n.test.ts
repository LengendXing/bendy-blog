import test from "node:test"
import assert from "node:assert/strict"
import { locales, getTranslations, translationDictionaries, type Locale } from "./i18n"

const baseKeys = Object.keys(getTranslations("en")).sort()

test("every locale ships the complete key set", () => {
  for (const locale of locales) {
    assert.deepEqual(Object.keys(getTranslations(locale)).sort(), baseKeys, `${locale} has an incomplete dictionary`)
  }
})

test("no locale leaves a translation empty", () => {
  for (const locale of locales) {
    for (const [key, value] of Object.entries(getTranslations(locale))) {
      assert.equal(typeof value, "string", `${locale}.${key} must be a string`)
      assert.ok(value.trim().length > 0, `${locale}.${key} is empty`)
    }
  }
})

test("small languages are translated instead of falling back to English", () => {
  const english = getTranslations("en")
  for (const locale of locales.filter(l => l !== "en" && l !== "zh")) {
    const dictionary = getTranslations(locale)
    const translated = baseKeys.filter(key => dictionary[key as keyof typeof dictionary] !== english[key as keyof typeof english])
    assert.ok(
      translated.length >= baseKeys.length * 0.9,
      `${locale} still relies on English for ${baseKeys.length - translated.length} keys`,
    )
  }
})

test("unknown locales fall back to Chinese", () => {
  assert.equal(getTranslations("xx" as Locale), translationDictionaries.zh)
})
