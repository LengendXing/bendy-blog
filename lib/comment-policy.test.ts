import test from "node:test"
import assert from "node:assert/strict"
import {
  MAX_COMMENT_LENGTH,
  MAX_IMAGE_URL_LENGTH,
  validateCommentInput,
} from "./comment-policy"

test("accepts a normal comment and trims surrounding whitespace", () => {
  const result = validateCommentInput({ postId: "post-1", content: "  hello  " })

  assert.equal(result.ok, true)
  if (result.ok) {
    assert.equal(result.value.postId, "post-1")
    assert.equal(result.value.content, "hello")
    assert.equal(result.value.imageUrl, null)
    assert.equal(result.value.parentId, null)
    assert.equal(result.value.replyToId, null)
  }
})

test("requires a post id", () => {
  for (const postId of [undefined, null, "", "   ", 42]) {
    const result = validateCommentInput({ postId, content: "hello" })
    assert.equal(result.ok, false)
    if (!result.ok) assert.equal(result.error.code, "post_required")
  }
})

test("rejects empty text even when an image is attached", () => {
  for (const content of [undefined, null, "", "   ", 42]) {
    const result = validateCommentInput({
      postId: "post-1",
      content,
      imageUrl: "https://example.com/image.png",
    })
    assert.equal(result.ok, false)
    if (!result.ok) assert.equal(result.error.code, "content_required")
  }
})

test("enforces the comment length ceiling", () => {
  const accepted = validateCommentInput({
    postId: "post-1",
    content: "a".repeat(MAX_COMMENT_LENGTH),
  })
  assert.equal(accepted.ok, true)

  const rejected = validateCommentInput({
    postId: "post-1",
    content: "a".repeat(MAX_COMMENT_LENGTH + 1),
  })
  assert.equal(rejected.ok, false)
  if (!rejected.ok) assert.equal(rejected.error.code, "content_too_long")
})

test("accepts only safe image URL schemes", () => {
  const valid = [
    "https://example.com/image.png",
    "http://example.com/image.jpg",
    "/api/image?url=https%3A%2F%2Fexample.com%2Fa.png",
    "data:image/png;base64,AAAA",
    "data:image/webp;base64,AAAA",
  ]
  for (const imageUrl of valid) {
    const result = validateCommentInput({ postId: "post-1", content: "hi", imageUrl })
    assert.equal(result.ok, true, imageUrl)
  }

  const invalid = [
    "javascript:alert(1)",
    "data:image/svg+xml;base64,AAAA",
    "//evil.example/image.png",
    "ftp://example.com/image.png",
  ]
  for (const imageUrl of invalid) {
    const result = validateCommentInput({ postId: "post-1", content: "hi", imageUrl })
    assert.equal(result.ok, false, imageUrl)
    if (!result.ok) assert.equal(result.error.code, "invalid_image_url")
  }
})

test("caps the image URL length", () => {
  const imageUrl = `https://example.com/${"a".repeat(MAX_IMAGE_URL_LENGTH)}.png`
  const result = validateCommentInput({ postId: "post-1", content: "hi", imageUrl })

  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.error.code, "image_too_large")
})

test("normalizes blank parent and reply ids to null", () => {
  const result = validateCommentInput({
    postId: "post-1",
    content: "hi",
    parentId: "   ",
    replyToId: "",
  })

  assert.equal(result.ok, true)
  if (result.ok) {
    assert.equal(result.value.parentId, null)
    assert.equal(result.value.replyToId, null)
  }
})

test("keeps valid parent and reply ids", () => {
  const result = validateCommentInput({
    postId: "post-1",
    content: "hi",
    parentId: "parent-1",
    replyToId: "reply-1",
  })

  assert.equal(result.ok, true)
  if (result.ok) {
    assert.equal(result.value.parentId, "parent-1")
    assert.equal(result.value.replyToId, "reply-1")
  }
})
