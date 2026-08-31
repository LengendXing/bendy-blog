import { prisma } from "@/lib/prisma"

export const ADMIN_GITHUB_USERS_CONFIG_KEY = "adminGithubUsernames"

export interface AdminEntry {
  username: string
  githubId: string | null
}

export interface AdminConfigSnapshot {
  entries: AdminEntry[]
  rawValue: string | null
  source: "database" | "environment"
}

export type AdminConfigErrorCode =
  | "admin_config_invalid"
  | "admin_config_unavailable"
  | "admin_config_conflict"

export class AdminConfigError extends Error {
  constructor(public readonly code: AdminConfigErrorCode) {
    super(code)
    this.name = "AdminConfigError"
  }
}

const githubUsernamePattern = /^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i

export function normalizeGithubUsername(value: unknown) {
  if (typeof value !== "string") return null
  const username = value.trim()
  if (!githubUsernamePattern.test(username)) return null
  return username
}

export function normalizeGithubId(value: unknown) {
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value <= 0) return null
    return String(value)
  }
  if (typeof value !== "string" || !/^\d+$/.test(value.trim())) return null

  try {
    const githubId = BigInt(value.trim())
    return githubId > BigInt(0) ? githubId.toString() : null
  } catch {
    return null
  }
}

function parseAdminEntries(values: unknown, allowEmpty: boolean) {
  if (!Array.isArray(values) || (!allowEmpty && values.length === 0)) return null

  const usernames = new Set<string>()
  const githubIds = new Set<string>()
  const entries: AdminEntry[] = []

  for (const value of values) {
    const username = normalizeGithubUsername(
      typeof value === "string" ? value : (value as { username?: unknown } | null)?.username,
    )
    if (!username) return null

    const rawGithubId = typeof value === "object" && value !== null
      ? (value as { githubId?: unknown }).githubId
      : null
    const githubId = rawGithubId === undefined || rawGithubId === null
      ? null
      : normalizeGithubId(rawGithubId)
    if (rawGithubId !== undefined && rawGithubId !== null && !githubId) return null

    const usernameKey = username.toLowerCase()
    if (usernames.has(usernameKey) || (githubId && githubIds.has(githubId))) return null
    usernames.add(usernameKey)
    if (githubId) githubIds.add(githubId)
    entries.push({ username, githubId })
  }

  return entries
}

function envAdminEntries() {
  const entries: AdminEntry[] = []
  const usernames = new Set<string>()

  for (const value of (process.env.ADMIN_GITHUB_USERNAMES || "").split(",")) {
    const username = normalizeGithubUsername(value)
    if (!username || usernames.has(username.toLowerCase())) continue
    usernames.add(username.toLowerCase())
    entries.push({ username, githubId: null })
  }

  return entries
}

function parseStoredAdminEntries(value: string) {
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    // Older builds accepted a comma-separated SiteConfig value. Keep that
    // narrow compatibility path so an upgrade cannot strand existing admins.
    if (!value.includes(",")) return null
    parsed = value.split(",").map(item => item.trim()).filter(Boolean)
  }
  return parseAdminEntries(parsed, false)
}

export async function getAdminConfigSnapshot(): Promise<AdminConfigSnapshot> {
  let config: { value: string } | null
  try {
    config = await prisma.siteConfig.findUnique({
      where: { key: ADMIN_GITHUB_USERS_CONFIG_KEY },
      select: { value: true },
    })
  } catch {
    throw new AdminConfigError("admin_config_unavailable")
  }

  if (!config) {
    return {
      entries: envAdminEntries(),
      rawValue: null,
      source: "environment",
    }
  }

  const entries = parseStoredAdminEntries(config.value)
  if (!entries) throw new AdminConfigError("admin_config_invalid")

  return {
    entries,
    rawValue: config.value,
    source: "database",
  }
}

export async function saveAdminEntries(expectedRawValue: string | null, values: AdminEntry[]) {
  const entries = parseAdminEntries(values, false)
  if (!entries) throw new AdminConfigError("admin_config_invalid")

  const value = JSON.stringify(entries)

  if (expectedRawValue === null) {
    try {
      await prisma.siteConfig.create({
        data: { key: ADMIN_GITHUB_USERS_CONFIG_KEY, value },
      })
    } catch (error) {
      if ((error as { code?: string })?.code === "P2002") {
        throw new AdminConfigError("admin_config_conflict")
      }
      throw new AdminConfigError("admin_config_unavailable")
    }
  } else {
    let updated: { count: number }
    try {
      updated = await prisma.siteConfig.updateMany({
        where: {
          key: ADMIN_GITHUB_USERS_CONFIG_KEY,
          value: expectedRawValue,
        },
        data: { value },
      })
    } catch {
      throw new AdminConfigError("admin_config_unavailable")
    }
    if (updated.count !== 1) throw new AdminConfigError("admin_config_conflict")
  }

  return {
    entries,
    rawValue: value,
    source: "database" as const,
  }
}

export function adminEntriesIncludeIdentity(
  entries: AdminEntry[],
  username?: string | null,
  githubId?: string | null,
) {
  const normalizedUsername = normalizeGithubUsername(username)
  const normalizedGithubId = normalizeGithubId(githubId)

  if (normalizedGithubId && entries.some(entry => entry.githubId === normalizedGithubId)) {
    return true
  }

  // Username matching is retained only for the initial environment-based/legacy entries.
  return Boolean(normalizedUsername) && entries.some(entry => (
    entry.githubId === null && entry.username.toLowerCase() === normalizedUsername!.toLowerCase()
  ))
}

export async function isAdminIdentity(username?: string | null, githubId?: string | null) {
  const normalizedUsername = normalizeGithubUsername(username)
  const normalizedGithubId = normalizeGithubId(githubId)

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const snapshot = await getAdminConfigSnapshot()
      if (normalizedGithubId && snapshot.entries.some(entry => entry.githubId === normalizedGithubId)) {
        return true
      }

      const legacyIndex = normalizedUsername
        ? snapshot.entries.findIndex(entry => (
          entry.githubId === null && entry.username.toLowerCase() === normalizedUsername.toLowerCase()
        ))
        : -1
      if (legacyIndex < 0) return false
      if (!normalizedGithubId) return true

      // Lazily migrate a username-only bootstrap/legacy entry as soon as that
      // administrator signs in with a verified GitHub account ID.
      const entries = snapshot.entries.map(entry => ({ ...entry }))
      entries[legacyIndex] = { username: normalizedUsername!, githubId: normalizedGithubId }
      try {
        await saveAdminEntries(snapshot.rawValue, entries)
        return true
      } catch (error) {
        if (error instanceof AdminConfigError && error.code === "admin_config_conflict") continue
        return false
      }
    } catch {
      // Authentication must fail closed if the database or stored configuration is invalid.
      return false
    }
  }

  return false
}
