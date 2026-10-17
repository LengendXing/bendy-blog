import { describe, expect, it } from "vitest"
import { buildPixelRingPath, getSnakeSegments } from "./pixel-loader"

describe("pixel loader geometry", () => {
  it("stays on the outer rails without duplicate points", () => {
    const path = buildPixelRingPath({ width: 280, height: 70, cell: 8, padding: 8 })
    expect(path.length).toBeGreaterThan(8)
    expect(new Set(path.map(point => `${point.x}:${point.y}`)).size).toBe(path.length)

    const minX = Math.min(...path.map(point => point.x))
    const maxX = Math.max(...path.map(point => point.x))
    const minY = Math.min(...path.map(point => point.y))
    const maxY = Math.max(...path.map(point => point.y))
    for (const point of path) {
      expect(point.x === minX || point.x === maxX || point.y === minY || point.y === maxY).toBe(true)
    }
  })

  it("remains valid at small dimensions", () => {
    const path = buildPixelRingPath({ width: 12, height: 12, cell: 10, padding: 10 })
    expect(path.length).toBeGreaterThanOrEqual(4)
    for (const point of path) {
      expect(point.x).toBeGreaterThanOrEqual(0)
      expect(point.y).toBeGreaterThanOrEqual(0)
      expect(point.x).toBeLessThan(12)
      expect(point.y).toBeLessThan(12)
    }
  })

  it("clamps coordinates for sub-cell containers", () => {
    const path = buildPixelRingPath({ width: 3, height: 2, cell: 10, padding: 10 })
    expect(path.length).toBeGreaterThan(0)
    for (const point of path) {
      expect(point.x).toBeGreaterThanOrEqual(0)
      expect(point.x).toBeLessThan(3)
      expect(point.y).toBeGreaterThanOrEqual(0)
      expect(point.y).toBeLessThan(2)
    }
  })

  it("wraps snake segments around the ring and preserves requested length", () => {
    const path = buildPixelRingPath({ width: 100, height: 40, cell: 5, padding: 5 })
    const segments = getSnakeSegments(path, 0, 10)
    expect(segments).toHaveLength(10)
    expect(segments[0]).toEqual(path[0])
    expect(segments[9]).toEqual(path[path.length - 9])
    expect(getSnakeSegments([], 0, 4)).toEqual([])
    expect(getSnakeSegments(path, 0, 0)).toEqual([])
  })
})
