export type ContentRecord = {
  id: string
  slug: string
  githubPath: string | null
}

export type RepositoryFile = {
  path: string
}

export type DuplicatePath = {
  githubPath: string
  records: ContentRecord[]
}

export type ContentDrift = {
  missingInRepository: ContentRecord[]
  orphanInRepository: RepositoryFile[]
  duplicatePaths: DuplicatePath[]
  invalidPaths: ContentRecord[]
}

export function normalizeContentPath(path: string | null | undefined): string | null {
  if (!path) return null
  const normalized = path.replace(/\\/g, "/").replace(/^\/+/, "").trim()
  return normalized || null
}

/**
 * Compare database post references with the files actually present in the
 * GitHub content repository. Pure function so it can be unit tested without
 * network or database access.
 */
export function reconcileContent(records: ContentRecord[], files: RepositoryFile[]): ContentDrift {
  const recordsByPath = new Map<string, ContentRecord[]>()
  const invalidPaths: ContentRecord[] = []

  for (const record of records) {
    const path = normalizeContentPath(record.githubPath)
    if (!path) {
      invalidPaths.push(record)
      continue
    }
    const existing = recordsByPath.get(path)
    if (existing) existing.push(record)
    else recordsByPath.set(path, [record])
  }

  const filePaths = new Set<string>()
  for (const file of files) {
    const path = normalizeContentPath(file.path)
    if (path) filePaths.add(path)
  }

  const missingInRepository: ContentRecord[] = []
  const duplicatePaths: DuplicatePath[] = []

  for (const [githubPath, pathRecords] of recordsByPath) {
    if (!filePaths.has(githubPath)) missingInRepository.push(...pathRecords)
    if (pathRecords.length > 1) duplicatePaths.push({ githubPath, records: pathRecords })
  }

  const orphanInRepository = files
    .filter(file => {
      const path = normalizeContentPath(file.path)
      return Boolean(path && !recordsByPath.has(path))
    })
    .sort((a, b) => a.path.localeCompare(b.path))

  missingInRepository.sort((a, b) => a.slug.localeCompare(b.slug))
  duplicatePaths.sort((a, b) => a.githubPath.localeCompare(b.githubPath))
  invalidPaths.sort((a, b) => a.slug.localeCompare(b.slug))

  return { missingInRepository, orphanInRepository, duplicatePaths, invalidPaths }
}

export function hasContentDrift(drift: ContentDrift): boolean {
  return (
    drift.missingInRepository.length > 0 ||
    drift.orphanInRepository.length > 0 ||
    drift.duplicatePaths.length > 0 ||
    drift.invalidPaths.length > 0
  )
}
