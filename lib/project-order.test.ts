import test from "node:test"
import assert from "node:assert/strict"
import {
  moveProjectId,
  nextProjectSortOrder,
  parseProjectCreatePayload,
  parseProjectOrderIds,
  parseProjectUpdatePayload,
  projectOrderBy,
  sortProjects,
} from "./project-order"

test("nextProjectSortOrder appends after the highest existing order", () => {
  assert.equal(nextProjectSortOrder(null), 0)
  assert.equal(nextProjectSortOrder(undefined), 0)
  assert.equal(nextProjectSortOrder(0), 1)
  assert.equal(nextProjectSortOrder(41), 42)
  assert.equal(nextProjectSortOrder(-3), 0)
  assert.equal(nextProjectSortOrder(2.5), 0)
})

test("projectOrderBy keeps a deterministic createdAt and id tie-breaker", () => {
  assert.deepEqual(projectOrderBy(), [
    { sortOrder: "asc" },
    { createdAt: "asc" },
    { id: "asc" },
  ])
})

test("sortProjects orders ties by createdAt and then id", () => {
  const projects = [
    { id: "c", sortOrder: 0, createdAt: "2026-10-02T00:00:00.000Z" },
    { id: "b", sortOrder: 0, createdAt: "2026-10-01T00:00:00.000Z" },
    { id: "a", sortOrder: 0, createdAt: "2026-10-01T00:00:00.000Z" },
    { id: "first", sortOrder: -1, createdAt: "2026-10-03T00:00:00.000Z" },
  ]

  assert.deepEqual(sortProjects(projects).map(project => project.id), ["first", "a", "b", "c"])
  assert.deepEqual(projects.map(project => project.id), ["c", "b", "a", "first"])
})

test("moveProjectId swaps one position without mutating the source list", () => {
  const ids = ["a", "b", "c"]
  assert.deepEqual(moveProjectId(ids, "b", "up"), ["b", "a", "c"])
  assert.deepEqual(moveProjectId(ids, "b", "down"), ["a", "c", "b"])
  assert.deepEqual(moveProjectId(ids, "a", "up"), ["a", "b", "c"])
  assert.deepEqual(moveProjectId(ids, "c", "down"), ["a", "b", "c"])
  assert.deepEqual(moveProjectId(ids, "missing", "down"), ["a", "b", "c"])
  assert.deepEqual(ids, ["a", "b", "c"])
})

test("parseProjectOrderIds accepts only a full, unique id list", () => {
  assert.deepEqual(parseProjectOrderIds(["a", "b"]), ["a", "b"])
  assert.equal(parseProjectOrderIds([]), null)
  assert.equal(parseProjectOrderIds(["a", "a"]), null)
  assert.equal(parseProjectOrderIds(["a", ""]), null)
  assert.equal(parseProjectOrderIds([1, 2]), null)
  assert.equal(parseProjectOrderIds("a,b"), null)
})

test("parseProjectCreatePayload leaves sortOrder unset so the API appends", () => {
  assert.deepEqual(parseProjectCreatePayload({
    title: "  Bendy  ",
    description: "  ",
    url: "https://example.com",
    logoUrl: null,
    ignored: "field",
  }), {
    title: "Bendy",
    description: null,
    url: "https://example.com",
    logoUrl: null,
  })

  assert.deepEqual(parseProjectCreatePayload({ title: "Bendy", sortOrder: "7" }), {
    title: "Bendy",
    description: null,
    url: null,
    logoUrl: null,
    sortOrder: 7,
  })

  assert.equal(parseProjectCreatePayload({ title: "   " }), null)
  assert.equal(parseProjectCreatePayload({ title: "Bendy", sortOrder: -1 }), null)
  assert.equal(parseProjectCreatePayload({ title: "Bendy", url: 42 }), null)
})

test("parseProjectUpdatePayload validates only supplied fields", () => {
  assert.deepEqual(parseProjectUpdatePayload({ sortOrder: 3, title: "New" }), {
    title: "New",
    sortOrder: 3,
  })
  assert.deepEqual(parseProjectUpdatePayload({ description: "" }), { description: null })
  assert.equal(parseProjectUpdatePayload({ sortOrder: 1.5 }), null)
  assert.equal(parseProjectUpdatePayload({ title: "" }), null)
  assert.equal(parseProjectUpdatePayload(null), null)
})
