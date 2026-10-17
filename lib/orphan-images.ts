/**
 * Pure helpers for the orphan-image audit. Reference matching is intentionally
 * conservative: a stored file is kept when its filename appears anywhere in
 * posts, about pages, projects, settings or comments.
 */

export type StoredImage = {
  path: string
  name?: string
  size?: number
  updatedAt?: string
  sha?: string
  url?: string
}

export type OrphanImage = StoredImage & {
  ageMs: number | null
}

export type SelectOrphanOptions = {
  now?: number
  minAgeMs?: number
}

const IMAGE_EXTENSION = /\.(?:png|jpe?g|gif|webp|avif|svg|bmp|ico)$/i
const IMAGE_NAME_PATTERN = /[^\s"'()<>\\/]+\.(?:png|jpe?g|gif|webp|avif|svg|bmp|ico)\b/gi

export function isImagePath(path: string): boolean {
  return IMAGE_EXTENSION.test(path.split(/[?#]/)[0])
}

export function imageNameFromPath(path: string): string {
  const clean = path.split(/[?#]/)[0].replace(/\\/g, "/").replace(/\/+$/, "")
  const name = clean.slice(clean.lastIndexOf("/") + 1)
  try {
    return decodeURIComponent(name)
  } catch {
    return name
  }
}

export function extractImageReferences(text: string): string[] {
  const refs = new Set<string>()
  const markdown = /!\[[^\]]*\]\(\s*(?:<([^>]+)>|([^\s)]+))(?:\s+["'][^"']*["'])?\s*\)/g
  for (const match of text.matchAll(markdown)) {
    const value = match[1] || match[2]
    if (value) refs.add(value)
  }

  const html = /<img\b[^>]*?\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi
  for (const match of text.matchAll(html)) {
    const value = match[1] || match[2] || match[3]
    if (value) refs.add(value)
  }

  const srcset = /<(?:img|source)\b[^>]*?\bsrcset\s*=\s*(?:"([^"]*)"|'([^']*)')/gi
  for (const match of text.matchAll(srcset)) {
    const value = match[1] || match[2] || ""
    for (const candidate of value.split(",")) {
      const url = candidate.trim().split(/\s+/)[0]
      if (url) refs.add(url)
    }
  }

  const definitions = /^\s*\[[^\]]+\]:\s*(\S+)/gm
  for (const match of text.matchAll(definitions)) {
    if (match[1]) refs.add(match[1])
  }

  return [...refs]
}

export function collectReferenceNames(texts: string[]): Set<string> {
  const names = new Set<string>()
  for (const text of texts) {
    for (const reference of extractImageReferences(text)) {
      const name = imageNameFromPath(reference).toLowerCase()
      if (name) names.add(name)
    }
    for (const match of text.matchAll(IMAGE_NAME_PATTERN)) {
      const name = imageNameFromPath(match[0]).toLowerCase()
      if (name) names.add(name)
    }
  }
  return names
}

export function selectOrphanImages<T extends StoredImage>(
  images: T[],
  referenceTexts: string[],
  options: SelectOrphanOptions = {},
): Array<T & { ageMs: number | null }> {
  const now = options.now ?? Date.now()
  const minAgeMs = Math.max(0, options.minAgeMs ?? 24 * 60 * 60 * 1000)
  const referenced = collectReferenceNames(referenceTexts)

  return images.flatMap(image => {
    const name = imageNameFromPath(image.path || image.url || "").toLowerCase()
    if (!name || referenced.has(name)) return []
    const timestamp = image.updatedAt ? Date.parse(image.updatedAt) : Number.NaN
    const ageMs = Number.isFinite(timestamp) ? now - timestamp : null
    if (ageMs !== null && ageMs < minAgeMs) return []
    return [{ ...image, ageMs }]
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function entryList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload
  if (isRecord(payload)) {
    for (const key of ["paths", "files", "entries", "children"]) {
      if (Array.isArray(payload[key])) return payload[key] as unknown[]
    }
  }
  return []
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.?\//, "").replace(/^\/+/, "")
}

function readString(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    if (typeof record[key] === "string") return record[key] as string
  }
  return ""
}

function readNumber(record: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "number" && Number.isFinite(value)) return value
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value)
  }
  return undefined
}

function collectListingEntries(entry: unknown, parentPath: string, output: StoredImage[]): void {
  if (typeof entry === "string") {
    const path = normalizePath(entry)
    if (isImagePath(path)) output.push({ path, name: imageNameFromPath(path) })
    return
  }
  if (!isRecord(entry)) return

  const rawPath = readString(entry, ["path", "name", "href"])
  const type = readString(entry, ["type", "kind"]).toLowerCase()
  const path = normalizePath(parentPath && rawPath && !rawPath.includes("/") ? `${parentPath}/${rawPath}` : rawPath)
  const children = Array.isArray(entry.children)
    ? entry.children as unknown[]
    : Array.isArray(entry.entries)
      ? entry.entries as unknown[]
      : null

  if (children) {
    for (const child of children) collectListingEntries(child, path.replace(/\/+$/, ""), output)
    return
  }
  if (type === "dir" || type === "directory" || rawPath.endsWith("/")) return
  if (!path || !isImagePath(path)) return
  output.push({
    path,
    name: imageNameFromPath(path),
    size: readNumber(entry, ["size", "getcontentlength", "length"]),
    updatedAt: readString(entry, ["mtime", "modified", "updatedAt", "lastModified"]) || undefined,
  })
}

export function normalizeDufsListing(payload: unknown): StoredImage[] {
  const output: StoredImage[] = []
  for (const entry of entryList(payload)) collectListingEntries(entry, "", output)
  return output
}
