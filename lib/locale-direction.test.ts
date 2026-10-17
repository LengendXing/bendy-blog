import test from "node:test"
import assert from "node:assert/strict"
import vm from "node:vm"
import { locales, rtlLocales } from "./i18n"
import {
  applyDocumentLocale,
  buildLocaleInitScript,
  getTextDirection,
  htmlLangs,
  isLocale,
  resolveLocale,
} from "./locale-direction"

function runInitScript(saved: string | null) {
  const root = { dir: "ltr", lang: "zh-CN" }
  const storage = { getItem: (key: string) => (key === "locale" ? saved : null) }
  vm.runInNewContext(buildLocaleInitScript(), {
    window: { localStorage: storage },
    document: { documentElement: root },
  })
  return root
}

test("RTL locales are marked and other locales stay LTR", () => {
  assert.deepEqual(rtlLocales, ["ar", "ug"])
  assert.equal(getTextDirection("ar"), "rtl")
  assert.equal(getTextDirection("ug"), "rtl")
  for (const locale of locales.filter(l => !rtlLocales.includes(l))) {
    assert.equal(getTextDirection(locale), "ltr")
  }
})

test("locale validation rejects unknown values", () => {
  assert.equal(isLocale("bo"), true)
  assert.equal(isLocale("xx"), false)
  assert.equal(isLocale(null), false)
  assert.equal(resolveLocale("ko"), "ko")
  assert.equal(resolveLocale("xx"), "zh")
})

test("applyDocumentLocale sets both direction and lang", () => {
  const root = { dir: "", lang: "" }
  applyDocumentLocale("ar", root)
  assert.deepEqual(root, { dir: "rtl", lang: "ar" })
  applyDocumentLocale("zh", root)
  assert.deepEqual(root, { dir: "ltr", lang: "zh-CN" })
})

test("pre-hydration script restores saved RTL direction after refresh", () => {
  const root = runInitScript("ar")
  assert.equal(root.dir, "rtl")
  assert.equal(root.lang, "ar")
})

test("pre-hydration script handles Uyghur, LTR locales and no saved locale", () => {
  assert.deepEqual(runInitScript("ug"), { dir: "rtl", lang: "ug" })
  assert.deepEqual(runInitScript("ja"), { dir: "ltr", lang: "ja" })
  assert.deepEqual(runInitScript(null), { dir: "ltr", lang: "zh-CN" })
})

test("every locale has an html lang tag", () => {
  for (const locale of locales) {
    assert.ok(htmlLangs[locale], `missing html lang for ${locale}`)
  }
})
