import test from "node:test"
import assert from "node:assert/strict"
import { isImeComposing } from "./ime"

test("detects native IME composition state", () => {
  assert.equal(isImeComposing({ nativeEvent: { isComposing: true } }), true)
  assert.equal(isImeComposing({ nativeEvent: { isComposing: false } }), false)
})

test("detects legacy keyCode 229 emitted by IMEs", () => {
  assert.equal(isImeComposing({ keyCode: 229 }), true)
})

test("allows regular Enter key events", () => {
  assert.equal(isImeComposing({ nativeEvent: { isComposing: false }, keyCode: 13 }), false)
  assert.equal(isImeComposing({}), false)
})
