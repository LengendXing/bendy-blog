export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { selectOrphanImages } from "@/lib/orphan-images"
import {
  collectImageReferenceTexts,
  deleteStoredImage,
  listAllStoredImages,
  type StoredImageRef,
} from "@/lib/image-storage"

const MIN_AGE_MS = 24 * 60 * 60 * 1000
const MAX_DELETE_BATCH = 100

const privateHeaders = { "Cache-Control": "private, no-store", Vary: "Cookie" }

type ScanOrphan = StoredImageRef & { ageMs: number | null }

type OrphanScan = {
  scannedAt: string
  minAgeMs: number
  sources: Array<{ provider: string; total: number }>
  total: number
  orphanCount: number
  orphans: ScanOrphan[]
}

async function scan(): Promise<OrphanScan> {
  const sources = await listAllStoredImages()
  const texts = await collectImageReferenceTexts()
  const all = sources.flatMap(source => source.images)
  const orphans = selectOrphanImages(all, texts, { minAgeMs: MIN_AGE_MS })
  return {
    scannedAt: new Date().toISOString(),
    minAgeMs: MIN_AGE_MS,
    sources: sources.map(source => ({ provider: source.provider, total: source.images.length })),
    total: all.length,
    orphanCount: orphans.length,
    orphans,
  }
}

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  return Boolean((session?.user as any)?.isAdmin)
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403, headers: privateHeaders })
  try {
    return NextResponse.json(await scan(), { headers: privateHeaders })
  } catch (error) {
    console.error("Orphan image scan failed:", error)
    return NextResponse.json({ error: "scan_failed" }, { status: 500, headers: privateHeaders })
  }
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "forbidden" }, { status: 403, headers: privateHeaders })

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400, headers: privateHeaders })
  }
  if (body?.confirm !== true) return NextResponse.json({ error: "confirmation_required" }, { status: 400, headers: privateHeaders })
  if (!Array.isArray(body?.paths) || body.paths.length === 0) {
    return NextResponse.json({ error: "paths_required" }, { status: 400, headers: privateHeaders })
  }
  if (body.paths.length > MAX_DELETE_BATCH) {
    return NextResponse.json({ error: "too_many_paths" }, { status: 400, headers: privateHeaders })
  }

  const requested = new Set<string>(
    (body.paths as unknown[]).filter((path): path is string => typeof path === "string" && path.length > 0),
  )
  if (requested.size === 0) return NextResponse.json({ error: "paths_required" }, { status: 400, headers: privateHeaders })

  const result = await scan()
  const current = new Map(result.orphans.map(image => [`${image.provider}:${image.path}`, image]))
  const deleted: string[] = []
  const skipped: string[] = []
  const failed: Array<{ path: string; error: string }> = []

  for (const key of requested) {
    const image = current.get(key)
    if (!image) {
      skipped.push(key)
      continue
    }
    try {
      await deleteStoredImage(image as StoredImageRef)
      deleted.push(key)
    } catch (error) {
      failed.push({ path: key, error: error instanceof Error ? error.message : "delete_failed" })
    }
  }

  return NextResponse.json({ deleted, skipped, failed }, { headers: privateHeaders })
}
