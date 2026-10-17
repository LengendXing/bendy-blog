import test from "node:test"
import assert from "node:assert/strict"
import { MAX_COLUMN_NAME_LENGTH, resolveImportCategory } from "./import-category"

test("keeps category names within the six-character limit", () => {
  assert.deepEqual(resolveImportCategory("前端开发"), { ok: true, name: "前端开发" })
})

test("trims surrounding whitespace before validating the category", () => {
  assert.deepEqual(resolveImportCategory("  前端  "), { ok: true, name: "前端" })
})

test("treats a blank category as no column", () => {
  assert.deepEqual(resolveImportCategory("   "), { ok: true, name: null })
  assert.deepEqual(resolveImportCategory(undefined), { ok: true, name: null })
})

test("rejects an overlong category instead of truncating it", () => {
  const result = resolveImportCategory("前端开发笔记二")
  assert.equal(result.ok, false)
  if (!result.ok) {
    assert.equal(result.code, "category_too_long")
    assert.equal(result.category, "前端开发笔记二")
    assert.equal(result.maxLength, MAX_COLUMN_NAME_LENGTH)
  }
})

test("uses exactly six characters as the accepted boundary", () => {
  assert.equal(resolveImportCategory("一二三四五六").ok, true)
  assert.equal(resolveImportCategory("一二三四五六七").ok, false)
})
