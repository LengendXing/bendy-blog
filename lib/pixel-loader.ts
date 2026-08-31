export interface PixelPoint {
  x: number
  y: number
}

interface RingOptions {
  width: number
  height: number
  cell: number
  padding?: number
}

/** Build a clockwise rectangular track that stays on the outside edges. */
export function buildPixelRingPath({ width, height, cell, padding = cell }: RingOptions): PixelPoint[] {
  const requestedCell = Number.isFinite(cell) ? Math.max(1, cell) : 2
  const safeWidth = Number.isFinite(width) && width > 0 ? width : requestedCell * 4
  const safeHeight = Number.isFinite(height) && height > 0 ? height : requestedCell * 4
  // On narrow mobile canvases the nominal cell can be larger than the canvas.
  // Shrink it to keep every segment inside the real paint area.
  const unit = Math.max(1, Math.min(requestedCell, safeWidth / 4, safeHeight / 4, safeWidth, safeHeight))
  const maxLeft = Math.max(0, safeWidth - unit)
  const maxTop = Math.max(0, safeHeight - unit)
  const maxInset = Math.max(0, Math.min((safeWidth - unit * 2) / 2, (safeHeight - unit * 2) / 2))
  const inset = Math.max(0, Math.min(Number.isFinite(padding) ? padding : unit, unit * 2, maxInset))
  const left = Math.min(inset, maxLeft)
  const top = Math.min(inset, maxTop)
  const right = Math.max(left, Math.min(maxLeft, safeWidth - inset - unit))
  const bottom = Math.max(top, Math.min(maxTop, safeHeight - inset - unit))
  const columns = Math.max(2, Math.floor((right - left) / unit) + 1)
  const rows = Math.max(2, Math.floor((bottom - top) / unit) + 1)
  const xAt = (index: number) => Math.min(maxLeft, Math.max(0, Math.round(left + ((right - left) * index) / (columns - 1))))
  const yAt = (index: number) => Math.min(maxTop, Math.max(0, Math.round(top + ((bottom - top) * index) / (rows - 1))))
  const path: PixelPoint[] = []

  for (let index = 0; index < columns; index += 1) path.push({ x: xAt(index), y: top })
  for (let index = 1; index < rows; index += 1) path.push({ x: right, y: yAt(index) })
  for (let index = columns - 2; index >= 0; index -= 1) path.push({ x: xAt(index), y: bottom })
  for (let index = rows - 2; index > 0; index -= 1) path.push({ x: left, y: yAt(index) })

  return path.filter((point, index) => index === 0 || point.x !== path[index - 1].x || point.y !== path[index - 1].y)
}

export function getSnakeSegments(path: PixelPoint[], frame: number, length: number): PixelPoint[] {
  if (path.length === 0 || length <= 0) return []
  return Array.from({ length }, (_, index) => path[(frame - index + path.length * 2) % path.length])
}
