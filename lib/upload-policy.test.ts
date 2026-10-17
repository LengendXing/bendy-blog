import test from "node:test"
import assert from "node:assert/strict"
import {
  MAX_COMMENT_IMAGE_URL_LENGTH,
  MAX_IMAGE_BYTES,
  MAX_UPLOAD_REQUEST_BYTES,
  hasValidImageSignature,
  isAllowedCommentImageUrl,
  isAllowedImageType,
  isInvalidUploadSize,
  isRequestTooLarge,
  isSafeImageContentType,
  normalizeContentType,
} from "./upload-policy"

const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0])
const jpeg = Buffer.from([255, 216, 255, 224, 0, 0, 0, 0, 0, 0, 0, 0])
const gif = Buffer.from("GIF89a\0\0\0\0\0\0", "binary")
const webp = Buffer.concat([Buffer.from("RIFF"), Buffer.from([0, 0, 0, 0]), Buffer.from("WEBP")])
const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')

test("accepts only raster image MIME types", () => {
  assert.equal(isAllowedImageType("image/png"), true)
  assert.equal(isAllowedImageType("image/jpeg"), true)
  assert.equal(isAllowedImageType("image/gif"), true)
  assert.equal(isAllowedImageType("image/webp"), true)
  assert.equal(isAllowedImageType("image/svg+xml"), false)
  assert.equal(isAllowedImageType("text/html"), false)
  assert.equal(isAllowedImageType(""), false)
})

test("normalizes content types before comparison", () => {
  assert.equal(normalizeContentType(" IMAGE/PNG ; charset=binary"), "image/png")
  assert.equal(isSafeImageContentType("image/png; charset=binary"), true)
  assert.equal(isSafeImageContentType("image/svg+xml"), false)
})

test("validates magic bytes for every allowed format", () => {
  assert.equal(hasValidImageSignature(png, "image/png"), true)
  assert.equal(hasValidImageSignature(jpeg, "image/jpeg"), true)
  assert.equal(hasValidImageSignature(gif, "image/gif"), true)
  assert.equal(hasValidImageSignature(webp, "image/webp"), true)
})

test("rejects SVG and spoofed content", () => {
  assert.equal(hasValidImageSignature(svg, "image/png"), false)
  assert.equal(hasValidImageSignature(svg, "image/svg+xml"), false)
  assert.equal(hasValidImageSignature(Buffer.from("GIF89a"), "image/gif"), false)
})

test("enforces the upload size limit", () => {
  assert.equal(isInvalidUploadSize(1), false)
  assert.equal(isInvalidUploadSize(MAX_IMAGE_BYTES), false)
  assert.equal(isInvalidUploadSize(MAX_IMAGE_BYTES + 1), true)
  assert.equal(isInvalidUploadSize(0), true)
  assert.equal(isInvalidUploadSize(-1), true)
})

test("rejects oversized request bodies before multipart parsing", () => {
  assert.equal(isRequestTooLarge(null), false)
  assert.equal(isRequestTooLarge(String(MAX_UPLOAD_REQUEST_BYTES)), false)
  assert.equal(isRequestTooLarge(String(MAX_UPLOAD_REQUEST_BYTES + 1)), true)
  assert.equal(isRequestTooLarge("not-a-number"), false)
})

test("allows only short proxy or HTTPS comment image URLs", () => {
  assert.equal(isAllowedCommentImageUrl("/api/image?url=https%3A%2F%2Fdufs.example%2Fa.png"), true)
  assert.equal(isAllowedCommentImageUrl("https://raw.githubusercontent.com/o/r/main/a.png"), true)
  assert.equal(isAllowedCommentImageUrl("http://example.com/a.png"), false)
  assert.equal(isAllowedCommentImageUrl("data:image/png;base64,AAAA"), false)
  assert.equal(isAllowedCommentImageUrl("javascript:alert(1)"), false)
  assert.equal(isAllowedCommentImageUrl(`https://example.com/${"a".repeat(MAX_COMMENT_IMAGE_URL_LENGTH)}`), false)
  assert.equal(isAllowedCommentImageUrl(""), false)
})
