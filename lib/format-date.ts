const POST_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
}

/**
 * Formats a post timestamp for the public list and detail pages.
 * Invalid or missing values render an em dash instead of "Invalid Date".
 */
export function formatPostDate(value: Date | string | null | undefined, timeZone?: string): string {
  if (value === null || value === undefined || value === "") return "—"
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return "—"

  return new Intl.DateTimeFormat("en", {
    ...POST_DATE_FORMAT,
    ...(timeZone ? { timeZone } : {}),
  }).format(date)
}
