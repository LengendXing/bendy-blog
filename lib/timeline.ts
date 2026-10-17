/** Timeline days are always evaluated in the blog's canonical timezone. */
export const TIMELINE_TIME_ZONE = "Asia/Shanghai"

// Asia/Shanghai has been UTC+8 without daylight saving time since 1991.
const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000
const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

export interface TimelineRange {
  dateKey: string
  start: Date
  end: Date
}

function pad(value: number) {
  return String(value).padStart(2, "0")
}

/** Formats an instant as the calendar date it falls on in Asia/Shanghai. */
export function formatTimelineDateKey(value: Date): string | null {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return null
  const shanghaiTime = new Date(value.getTime() + SHANGHAI_OFFSET_MS)
  return `${shanghaiTime.getUTCFullYear()}-${pad(shanghaiTime.getUTCMonth() + 1)}-${pad(shanghaiTime.getUTCDate())}`
}

/** Formats a Date by its local calendar fields for the `date` query parameter. */
export function toTimelineDateParam(value: Date): string {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
}

function parseDateKey(value: string) {
  const match = DATE_KEY_PATTERN.exec(value)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const utc = new Date(Date.UTC(year, month - 1, day))
  const isValid = utc.getUTCFullYear() === year
    && utc.getUTCMonth() === month - 1
    && utc.getUTCDate() === day

  return isValid ? { year, month, day } : null
}

/**
 * Resolves the `date` query parameter into an Asia/Shanghai calendar day.
 * Accepts YYYY-MM-DD (preferred) or any Date-parsable instant. Returns null
 * for invalid input so the route can answer 400 instead of failing with 500.
 */
export function resolveTimelineRange(
  dateParam: string | null | undefined,
  now: Date = new Date(),
): TimelineRange | null {
  const raw = typeof dateParam === "string" ? dateParam.trim() : ""
  let dateKey: string | null

  if (!raw) {
    dateKey = formatTimelineDateKey(now)
  } else if (DATE_KEY_PATTERN.test(raw)) {
    dateKey = parseDateKey(raw) ? raw : null
  } else {
    const instant = new Date(raw)
    dateKey = Number.isNaN(instant.getTime()) ? null : formatTimelineDateKey(instant)
  }

  if (!dateKey) return null
  const parts = parseDateKey(dateKey)
  if (!parts) return null

  const startMs = Date.UTC(parts.year, parts.month - 1, parts.day) - SHANGHAI_OFFSET_MS
  return {
    dateKey,
    start: new Date(startMs),
    end: new Date(startMs + DAY_MS - 1),
  }
}
