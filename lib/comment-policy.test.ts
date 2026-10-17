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

test("rejects malformed post ids", () => {
  for (const postId of ["../etc/passwd", "post 1", "post/1", "post.1", "post\n1", "a".repeat(65)]) {
    const result = validateCommentInput({ postId, content: "hello" })
    assert.equal(result.ok, false, postId)
    if (!result.ok) assert.equal(result.error.code, "invalid_post_id")
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

test("accepts only proxy or HTTPS image URLs", () => {
  const valid = [
    "https://example.com/image.png",
    "/api/image?url=https%3A%2F%2Fexample.com%2Fa.png",
  ]
  for (const imageUrl of valid) {
    const result = validateCommentInput({ postId: "post-1", content: "hi", imageUrl })
    assert.equal(result.ok, true, imageUrl)
  }

  const invalid = [
    "javascript:alert(1)",
    "http://example.com/image.jpg",
    "data:image/png;base64,AAAA",
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

test("rejects malformed parent and reply ids", () => {
  const parent = validateCommentInput({
    postId: "post-1",
    content: "hi",
    parentId: "../etc/passwd",
  })
  assert.equal(parent.ok, false)
  if (!parent.ok) assert.equal(parent.error.code, "invalid_parent_id")

  const reply = validateCommentInput({
    postId: "post-1",
    content: "hi",
    replyToId: "reply 1",
  })
  assert.equal(reply.ok, false)
  if (!reply.ok) assert.equal(reply.error.code, "invalid_reply_id")
})
