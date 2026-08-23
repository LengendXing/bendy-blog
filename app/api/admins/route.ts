export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  AdminConfigError,
  AdminEntry,
  adminEntriesIncludeIdentity,
  getAdminConfigSnapshot,
  normalizeGithubId,
  normalizeGithubUsername,
  saveAdminEntries,
} from "@/lib/admins"
import { isRateLimited } from "@/lib/rate-limit"

const privateResponseHeaders = {
  "Cache-Control": "private, no-store",
  Vary: "Cookie",
}

interface AdminIdentity {
  sessionUserId: string
  username: string | null
  githubId: string | null
}

function publicAdmin(entry: AdminEntry) {
  return {
    username: entry.username,
    githubId: entry.githubId,
    avatarUrl: `https://github.com/${encodeURIComponent(entry.username)}.png?size=80`,
    profileUrl: `https://github.com/${encodeURIComponent(entry.username)}`,
  }
}

function response(entries: AdminEntry[]) {
  return NextResponse.json({ admins: entries.map(publicAdmin) }, { headers: privateResponseHeaders })
}

function errorResponse(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: privateResponseHeaders })
}

function validateMutationRequest(req: NextRequest) {
  const contentType = req.headers.get("content-type")?.toLowerCase() || ""
  if (!contentType.startsWith("application/json")) {
    return errorResponse("unsupported_media_type", 415)
  }

  const origin = req.headers.get("origin")
  const requestOrigin = `${req.nextUrl.protocol}//${req.nextUrl.host}`
  const configuredOrigin = process.env.NEXTAUTH_URL?.replace(/\/$/, "")
  const allowedOrigins = new Set([requestOrigin, configuredOrigin].filter(Boolean))
  if (!origin || !allowedOrigins.has(origin)) {
    return errorResponse("invalid_origin", 403)
  }

  return null
}

function configErrorResponse(error: unknown) {
  if (error instanceof AdminConfigError) {
    return errorResponse(error.code, error.code === "admin_config_conflict" ? 409 : 503)
  }
  return errorResponse("admin_config_unavailable", 503)
}

async function requireAdmin(): Promise<AdminIdentity | null> {
  const session = await getServerSession(authOptions)
  const user = session?.user as {
    id?: string
    githubUsername?: string | null
    githubId?: string | null
    isAdmin?: boolean
  } | undefined
  if (!user?.id || !user.isAdmin) return null

  return {
    sessionUserId: user.id,
    username: normalizeGithubUsername(user.githubUsername),
    githubId: normalizeGithubId(user.githubId),
  }
}

async function resolveGithubUser(username: string, sessionUserId: string) {
  if (await isRateLimited(`admin-github-verify:${sessionUserId}`, 20, 3600)) {
    return { error: "github_rate_limited", status: 429 } as const
  }

  let githubResponse: Response
  try {
    // Intentionally anonymous. Never attach GITHUB_TOKEN or an OAuth access token here.
    githubResponse = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "BendyBlog-Admin",
      },
      cache: "no-store",
    })
  } catch {
    return { error: "github_unavailable", status: 503 } as const
  }

  if (githubResponse.status === 404) return { error: "github_user_not_found", status: 404 } as const
  if (githubResponse.status === 403 || githubResponse.status === 429) {
    return { error: "github_rate_limited", status: 429 } as const
  }
  if (!githubResponse.ok) return { error: "github_unavailable", status: 502 } as const

  let githubUser: any
  try {
    githubUser = await githubResponse.json()
  } catch {
    return { error: "github_unavailable", status: 502 } as const
  }

  const canonicalUsername = normalizeGithubUsername(githubUser?.login)
  const githubId = normalizeGithubId(githubUser?.id)
  if (!canonicalUsername || !githubId || githubUser?.type !== "User") {
    return { error: "github_user_not_found", status: 404 } as const
  }

  return { username: canonicalUsername, githubId } as const
}

function refreshRequestingAdmin(entries: AdminEntry[], identity: AdminIdentity) {
  const nextEntries = entries.map(entry => ({ ...entry }))
  if (!identity.githubId || !identity.username) return nextEntries

  const idIndex = nextEntries.findIndex(entry => entry.githubId === identity.githubId)
  if (idIndex >= 0) {
    const usernameTaken = nextEntries.some((entry, index) => (
      index !== idIndex && entry.username.toLowerCase() === identity.username!.toLowerCase()
    ))
    if (!usernameTaken) nextEntries[idIndex].username = identity.username
    return nextEntries
  }

  const legacyIndex = nextEntries.findIndex(entry => (
    entry.githubId === null && entry.username.toLowerCase() === identity.username!.toLowerCase()
  ))
  if (legacyIndex >= 0) nextEntries[legacyIndex].githubId = identity.githubId
  return nextEntries
}

function findAdminIndex(entries: AdminEntry[], username: string, githubId: string | null) {
  if (githubId) return entries.findIndex(entry => entry.githubId === githubId)
  return entries.findIndex(entry => (
    entry.githubId === null && entry.username.toLowerCase() === username.toLowerCase()
  ))
}

export async function GET() {
  const identity = await requireAdmin()
  if (!identity) return errorResponse("forbidden", 403)

  try {
    const snapshot = await getAdminConfigSnapshot()
    if (!adminEntriesIncludeIdentity(snapshot.entries, identity.username, identity.githubId)) {
      return errorResponse("forbidden", 403)
    }
    return response(snapshot.entries)
  } catch (error) {
    return configErrorResponse(error)
  }
}

export async function POST(req: NextRequest) {
  const invalidRequest = validateMutationRequest(req)
  if (invalidRequest) return invalidRequest

  const identity = await requireAdmin()
  if (!identity) return errorResponse("forbidden", 403)

  let body: any
  try {
    body = await req.json()
  } catch {
    return errorResponse("invalid_body", 400)
  }
  const requestedUsername = normalizeGithubUsername(body?.username)
  if (!requestedUsername) return errorResponse("invalid_username", 400)

  const verified = await resolveGithubUser(requestedUsername, identity.sessionUserId)
  if ("error" in verified) return errorResponse(verified.error as string, verified.status as number)

  try {
    const snapshot = await getAdminConfigSnapshot()
    if (!adminEntriesIncludeIdentity(snapshot.entries, identity.username, identity.githubId)) {
      return errorResponse("forbidden", 403)
    }

    const entries = refreshRequestingAdmin(snapshot.entries, identity)
    if (entries.some(entry => (
      entry.githubId === verified.githubId || entry.username.toLowerCase() === verified.username.toLowerCase()
    ))) {
      return errorResponse("already_exists", 409)
    }

    const saved = await saveAdminEntries(snapshot.rawValue, [...entries, verified])
    return response(saved.entries)
  } catch (error) {
    return configErrorResponse(error)
  }
}

export async function PUT(req: NextRequest) {
  const invalidRequest = validateMutationRequest(req)
  if (invalidRequest) return invalidRequest

  const identity = await requireAdmin()
  if (!identity) return errorResponse("forbidden", 403)

  let body: any
  try {
    body = await req.json()
  } catch {
    return errorResponse("invalid_body", 400)
  }

  if (!Object.prototype.hasOwnProperty.call(body || {}, "currentGithubId")) {
    return errorResponse("invalid_admin_identity", 400)
  }
  const currentUsername = normalizeGithubUsername(body?.currentUsername)
  const currentGithubId = body?.currentGithubId === null
    ? null
    : normalizeGithubId(body?.currentGithubId)
  const requestedUsername = normalizeGithubUsername(body?.username)
  if (!currentUsername || body?.currentGithubId !== null && !currentGithubId || !requestedUsername) {
    return errorResponse("invalid_admin_identity", 400)
  }

  const verified = await resolveGithubUser(requestedUsername, identity.sessionUserId)
  if ("error" in verified) return errorResponse(verified.error as string, verified.status as number)

  try {
    const snapshot = await getAdminConfigSnapshot()
    if (!adminEntriesIncludeIdentity(snapshot.entries, identity.username, identity.githubId)) {
      return errorResponse("forbidden", 403)
    }
    if (snapshot.entries.length <= 1) return errorResponse("sole_admin_replace_forbidden", 409)

    const currentIndex = findAdminIndex(snapshot.entries, currentUsername, currentGithubId)
    if (currentIndex < 0) return errorResponse("not_found", 404)

    const entries = refreshRequestingAdmin(snapshot.entries, identity)
    if (entries.some((entry, index) => index !== currentIndex && (
      entry.githubId === verified.githubId || entry.username.toLowerCase() === verified.username.toLowerCase()
    ))) {
      return errorResponse("already_exists", 409)
    }
    if (
      entries[currentIndex].githubId === verified.githubId
      || entries[currentIndex].username.toLowerCase() === verified.username.toLowerCase()
    ) {
      return errorResponse("already_exists", 409)
    }

    entries[currentIndex] = verified
    const saved = await saveAdminEntries(snapshot.rawValue, entries)
    return response(saved.entries)
  } catch (error) {
    return configErrorResponse(error)
  }
}

export async function DELETE(req: NextRequest) {
  const invalidRequest = validateMutationRequest(req)
  if (invalidRequest) return invalidRequest

  const identity = await requireAdmin()
  if (!identity) return errorResponse("forbidden", 403)

  let body: any
  try {
    body = await req.json()
  } catch {
    return errorResponse("invalid_body", 400)
  }

  const username = normalizeGithubUsername(body?.username)
  const hasGithubId = body?.githubId !== undefined && body?.githubId !== null
  const githubId = hasGithubId ? normalizeGithubId(body.githubId) : null
  if (!username || hasGithubId && !githubId) return errorResponse("invalid_admin_identity", 400)

  try {
    const snapshot = await getAdminConfigSnapshot()
    if (!adminEntriesIncludeIdentity(snapshot.entries, identity.username, identity.githubId)) {
      return errorResponse("forbidden", 403)
    }

    const currentIndex = findAdminIndex(snapshot.entries, username, githubId)
    if (currentIndex < 0) return errorResponse("not_found", 404)
    if (snapshot.entries.length <= 1) return errorResponse("last_admin_required", 409)

    const entries = refreshRequestingAdmin(snapshot.entries, identity)
    entries.splice(currentIndex, 1)
    const saved = await saveAdminEntries(snapshot.rawValue, entries)
    return response(saved.entries)
  } catch (error) {
    return configErrorResponse(error)
  }
}
