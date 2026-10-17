export type ProjectOrderRecord = {
  id: string
  sortOrder: number
  createdAt: Date | string
}

export type ProjectCreatePayload = {
  title: string
  description: string | null
  url: string | null
  logoUrl: string | null
  sortOrder?: number
}

export type ProjectUpdatePayload = {
  title?: string
  description?: string | null
  url?: string | null
  logoUrl?: string | null
  sortOrder?: number
}

const TITLE_MAX_LENGTH = 200
const DESCRIPTION_MAX_LENGTH = 2_000
const URL_MAX_LENGTH = 2_048

/** Stable ordering: manual order first, then creation time, then id. */
export function projectOrderBy() {
  return [
    { sortOrder: "asc" as const },
    { createdAt: "asc" as const },
    { id: "asc" as const },
  ]
}

/** Appends after the current maximum; an empty table starts at 0. */
export function nextProjectSortOrder(maxSortOrder: number | null | undefined): number {
  return typeof maxSortOrder === "number" && Number.isInteger(maxSortOrder) && maxSortOrder >= 0
    ? maxSortOrder + 1
    : 0
}

function projectCreatedAt(value: Date | string): number {
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : 0
}

export function compareProjectOrder(a: ProjectOrderRecord, b: ProjectOrderRecord): number {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
  const createdDifference = projectCreatedAt(a.createdAt) - projectCreatedAt(b.createdAt)
  if (createdDifference !== 0) return createdDifference
  return a.id.localeCompare(b.id)
}

/** Mirrors the database order for optimistic updates in the admin UI. */
export function sortProjects<T extends ProjectOrderRecord>(projects: readonly T[]): T[] {
  return [...projects].sort(compareProjectOrder)
}

/** Returns a new id list with the requested project swapped one position. */
export function moveProjectId(ids: readonly string[], id: string, direction: "up" | "down"): string[] {
  const index = ids.indexOf(id)
  const target = direction === "up" ? index - 1 : index + 1
  if (index < 0 || target < 0 || target >= ids.length) return [...ids]

  const next = [...ids]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

/** Reorder payload must be a full, duplicate-free list of project ids. */
export function parseProjectOrderIds(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length === 0) return null
  const ids = value.map(item => (typeof item === "string" ? item.trim() : ""))
  if (ids.some(id => !id) || new Set(ids).size !== ids.length) return null
  return ids
}

export function parseOptionalProjectSortOrder(value: unknown): number | undefined | null {
  if (value === undefined || value === null || value === "") return undefined
  const sortOrder = typeof value === "number" ? value : Number(value)
  return Number.isInteger(sortOrder) && sortOrder >= 0 && sortOrder <= 1_000_000 ? sortOrder : null
}

function readOptionalText(
  body: Record<string, unknown>,
  key: string,
  maxLength: number,
): { ok: true; value: string | null } | { ok: false } {
  const value = body[key]
  if (value === undefined || value === null) return { ok: true, value: null }
  if (typeof value !== "string") return { ok: false }
  const trimmed = value.trim()
  if (trimmed.length > maxLength) return { ok: false }
  return { ok: true, value: trimmed || null }
}

function readTitle(value: unknown): string | null {
  if (typeof value !== "string") return null
  const title = value.trim()
  return title && title.length <= TITLE_MAX_LENGTH ? title : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function parseProjectCreatePayload(value: unknown): ProjectCreatePayload | null {
  if (!isRecord(value)) return null

  const title = readTitle(value.title)
  if (!title) return null

  const description = readOptionalText(value, "description", DESCRIPTION_MAX_LENGTH)
  const url = readOptionalText(value, "url", URL_MAX_LENGTH)
  const logoUrl = readOptionalText(value, "logoUrl", URL_MAX_LENGTH)
  const sortOrder = parseOptionalProjectSortOrder(value.sortOrder)
  if (!description.ok || !url.ok || !logoUrl.ok || sortOrder === null) return null

  return {
    title,
    description: description.value,
    url: url.value,
    logoUrl: logoUrl.value,
    ...(sortOrder === undefined ? {} : { sortOrder }),
  }
}

export function parseProjectUpdatePayload(value: unknown): ProjectUpdatePayload | null {
  if (!isRecord(value)) return null

  const payload: ProjectUpdatePayload = {}

  if (Object.prototype.hasOwnProperty.call(value, "title")) {
    const title = readTitle(value.title)
    if (!title) return null
    payload.title = title
  }

  for (const [key, maxLength] of [
    ["description", DESCRIPTION_MAX_LENGTH],
    ["url", URL_MAX_LENGTH],
    ["logoUrl", URL_MAX_LENGTH],
  ] as const) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) continue
    const result = readOptionalText(value, key, maxLength)
    if (!result.ok) return null
    payload[key] = result.value
  }

  if (Object.prototype.hasOwnProperty.call(value, "sortOrder")) {
    const sortOrder = parseOptionalProjectSortOrder(value.sortOrder)
    if (sortOrder === undefined || sortOrder === null) return null
    payload.sortOrder = sortOrder
  }

  return payload
}
