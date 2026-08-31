import test from "node:test"
import assert from "node:assert/strict"
import { buildPixelRingPath, getSnakeSegments } from "./pixel-loader"

test("pixel ring stays on the outer rails without duplicate points", () => {
  const path = buildPixelRingPath({ width: 280, height: 70, cell: 8, padding: 8 })
  assert.ok(path.length > 8)
  assert.equal(new Set(path.map(point => `${point.x}:${point.y}`)).size, path.length)

  const minX = Math.min(...path.map(point => point.x))
  const maxX = Math.max(...path.map(point => point.x))
  const minY = Math.min(...path.map(point => point.y))
  const maxY = Math.max(...path.map(point => point.y))
  for (const point of path) {
    assert.ok(point.x === minX || point.x === maxX || point.y === minY || point.y === maxY)
  }
})

test("pixel ring remains valid at small dimensions", () => {
  const path = buildPixelRingPath({ width: 12, height: 12, cell: 10, padding: 10 })
  assert.ok(path.length >= 4)
  for (const point of path) {
    assert.ok(point.x >= 0 && point.y >= 0)
    assert.ok(point.x < 12 && point.y < 12)
  }
})

test("pixel ring clamps coordinates for sub-cell containers", () => {
  const path = buildPixelRingPath({ width: 3, height: 2, cell: 10, padding: 10 })
  assert.ok(path.length > 0)
  for (const point of path) {
    assert.ok(point.x >= 0 && point.x < 3)
    assert.ok(point.y >= 0 && point.y < 2)
  }
})

test("snake segments wrap around the ring and preserve requested length", () => {
  const path = buildPixelRingPath({ width: 100, height: 40, cell: 5, padding: 5 })
  const segments = getSnakeSegments(path, 0, 10)
  assert.equal(segments.length, 10)
  assert.deepEqual(segments[0], path[0])
  assert.deepEqual(segments[9], path[path.length - 9])
  assert.deepEqual(getSnakeSegments([], 0, 4), [])
  assert.deepEqual(getSnakeSegments(path, 0, 0), [])
})
