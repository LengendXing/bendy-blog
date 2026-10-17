import test from "node:test"
import assert from "node:assert/strict"
import vm from "node:vm"
import {
  applyDocumentDirection,
  buildLocaleInitScript,
  getTextDirection,
  resolveLocale,
} from "./locale-direction"

test("RTL locales resolve to rtl and other locales resolve to ltr", () => {
  assert.equal(getTextDirection("ar"), "rtl")
  assert.equal(getTextDirection("ug"), "rtl")
  assert.equal(getTextDirection("zh"), "ltr")
  assert.equal(getTextDirection("en"), "ltr")
  assert.equal(getTextDirection("mn"), "ltr")
  assert.equal(getTextDirection("bo"), "ltr")
})

test("stored locale is restored only when it is supported", () => {
  assert.equal(resolveLocale("ar"), "ar")
  assert.equal(resolveLocale("ug"), "ug")
  assert.equal(resolveLocale("ko"), "ko")
  assert.equal(resolveLocale("xx"), "zh")
  assert.equal(resolveLocale(""), "zh")
  assert.equal(resolveLocale(null), "zh")
  assert.equal(resolveLocale(undefined), "zh")
})

test("applying a restored locale updates the document direction", () => {
  const root = { dir: "ltr" }

  applyDocumentDirection("ar", root)
  assert.equal(root.dir, "rtl")

  applyDocumentDirection("ug", root)
  assert.equal(root.dir, "rtl")

  applyDocumentDirection("en", root)
  assert.equal(root.dir, "ltr")
})

test("pre-hydration script applies the stored RTL direction", () => {
  const cases = [
    ["ar", "rtl"],
    ["ug", "rtl"],
    ["en", "ltr"],
    [null, "ltr"],
  ] as const

  for (const [stored, expected] of cases) {
    const documentElement = { dir: "ltr" }
    const context = {
      window: { localStorage: { getItem: () => stored } },
      document: { documentElement },
    }

    vm.runInNewContext(buildLocaleInitScript(), context)

    assert.equal(documentElement.dir, expected, `stored locale: ${String(stored)}`)
  }
})

test("pre-hydration script stays LTR when storage is unavailable", () => {
  const documentElement = { dir: "ltr" }
  const context = {
    window: {
      localStorage: {
        getItem: () => {
          throw new Error("storage disabled")
        },
      },
    },
    document: { documentElement },
  }

  vm.runInNewContext(buildLocaleInitScript(), context)

  assert.equal(documentElement.dir, "ltr")
})
