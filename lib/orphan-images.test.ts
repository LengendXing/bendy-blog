import test from "node:test"
import assert from "node:assert/strict"
import {
  collectReferenceNames,
  extractImageReferences,
  imageNameFromPath,
  isImagePath,
  normalizeDufsListing,
  selectOrphanImages,
} from "./orphan-images"

const DAY = 24 * 60 * 60 * 1000
const NOW = Date.parse("2026-10-17T12:00:00.000Z")

test("imageNameFromPath strips directories, query strings and decodes escapes", () => {
  assert.equal(imageNameFromPath("https://cdn.example.com/images/a%20b.png?x=1#top"), "a b.png")
  assert.equal(imageNameFromPath("images/sub/nested.webp"), "nested.webp")
  assert.equal(imageNameFromPath("/"), "")
})

test("isImagePath only accepts image extensions", () => {
  assert.equal(isImagePath("images/a.PNG"), true)
  assert.equal(isImagePath("images/a.jpeg"), true)
  assert.equal(isImagePath("posts/a.md"), false)
  assert.equal(isImagePath("images/archive.zip"), false)
})

test("extractImageReferences finds markdown images, html images and reference definitions", () => {
  const markdown = [
    "![cover](/api/image?url=https%3A%2F%2Fdufs.example.com%2Fcover.png)",
    '<img src="https://cdn.example.com/diagram.svg" alt="diagram" />',
    "[inline]: https://cdn.example.com/photo.webp",
    "![ref][inline]",
  ].join("\n")
  const refs = extractImageReferences(markdown)
  assert.ok(refs.some(ref => ref.includes("cover.png")))
  assert.ok(refs.some(ref => ref.includes("diagram.svg")))
  assert.ok(refs.some(ref => ref.includes("photo.webp")))
})

test("collectReferenceNames is conservative about bare filenames in text", () => {
  const names = collectReferenceNames(["See images/old-cover.png for details.", "no image here"])
  assert.equal(names.has("old-cover.png"), true)
})

test("selectOrphanImages skips referenced images", () => {
  const images = [
    { path: "images/used.png", updatedAt: "2026-10-01T00:00:00.000Z" },
    { path: "images/unused.png", updatedAt: "2026-10-01T00:00:00.000Z" },
  ]
  const orphans = selectOrphanImages(images, ["![x](https://cdn.example.com/images/used.png)"], { now: NOW })
  assert.deepEqual(orphans.map(image => image.path), ["images/unused.png"])
})

test("selectOrphanImages keeps recently uploaded files out of the orphan list", () => {
  const images = [
    { path: "images/fresh.png", updatedAt: "2026-10-17T11:30:00.000Z" },
    { path: "images/old.png", updatedAt: "2026-10-10T11:30:00.000Z" },
  ]
  const orphans = selectOrphanImages(images, [], { now: NOW, minAgeMs: DAY })
  assert.deepEqual(orphans.map(image => image.path), ["images/old.png"])
})

test("selectOrphanImages treats unknown timestamps as old enough to review", () => {
  const orphans = selectOrphanImages([{ path: "images/unknown.png" }], [], { now: NOW, minAgeMs: DAY })
  assert.equal(orphans.length, 1)
})

test("normalizeDufsListing accepts string paths and object entries", () => {
  const fromStrings = normalizeDufsListing(["images/a.png", "images/sub/", "posts/a.md"])
  assert.deepEqual(fromStrings.map(image => image.path), ["images/a.png"])

  const fromObjects = normalizeDufsListing([
    { path: "images/b.png", size: 12, mtime: "2026-10-01T00:00:00.000Z" },
    { name: "c.webp", type: "file", size: 34 },
    { name: "folder", type: "dir" },
  ])
  assert.deepEqual(fromObjects.map(image => image.path), ["images/b.png", "c.webp"])
  assert.equal(fromObjects[0].size, 12)
})

test("normalizeDufsListing accepts wrapper objects and nested children", () => {
  const wrapped = normalizeDufsListing({ paths: ["images/d.png"] })
  assert.deepEqual(wrapped.map(image => image.path), ["images/d.png"])

  const nested = normalizeDufsListing([{ name: "images", type: "dir", children: [{ name: "e.png", size: 5 }] }])
  assert.deepEqual(nested.map(image => image.path), ["images/e.png"])
})

test("normalizeDufsListing tolerates malformed payloads", () => {
  assert.deepEqual(normalizeDufsListing(null), [])
  assert.deepEqual(normalizeDufsListing({ unexpected: true }), [])
})
