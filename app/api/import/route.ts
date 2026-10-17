export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { saveFileContent } from "@/lib/github"
import { logStructured } from "@/lib/observability"
import { reportOperationFailure } from "@/lib/ops"

interface ParsedArticle {
  title: string
  slug: string
  status: string
  date: string | null
  summary: string
  category: string
  body: string
}

function parseNotionMd(raw: string): ParsedArticle {
  const lines = raw.split("\n")
  let title = ""
  const meta: Record<string, string> = {}
  let bodyStartIndex = 0

  // First line is title (# Title)
  if (lines[0]?.startsWith("# ")) {
    title = lines[0].replace(/^#\s+/, "").trim()
  }

  // Parse metadata lines until blank line
  let foundBlank = false
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()

    if (line === "" && i > 1) {
      // Could be the separator blank line
      // Check if next lines are still meta or body
      const nextLine = lines[i + 1]?.trim() || ""
      // If we already collected some meta and hit blank, body starts after
      if (Object.keys(meta).length > 0) {
        bodyStartIndex = i + 1
        break
      }
      continue
    }

    const colonIdx = line.indexOf(":")
    if (colonIdx > 0) {
      const key = line.substring(0, colonIdx).trim().toLowerCase()
      const val = line.substring(colonIdx + 1).trim()
      meta[key] = val
    }
  }

  const body = lines.slice(bodyStartIndex).join("\n").trim()

  return {
    title: title || meta["title"] || "Untitled",
    slug: meta["slug"] || title.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-").replace(/^-|-$/g, "") || `post-${Date.now()}`,
    status: meta["status"] || "Draft",
    date: meta["date"] || null,
    summary: meta["summary"] || "",
    category: meta["category"] || "",
    body,
  }
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null
  // Handle formats: 2025/11/26, 2025-11-26, etc.
  const cleaned = dateStr.replace(/\//g, "-").trim()
  const d = new Date(cleaned)
  return isNaN(d.getTime()) ? null : d
}

type ImportStage = "parse" | "duplicate_check" | "column" | "github_write" | "db_write"

interface ImportResult {
  filename: string
  status: string
  title?: string
  error?: string
}

async function resolveColumnId(category: string): Promise<string | null> {
  if (!category) return null
  const catName = category.length > 6 ? category.slice(0, 6) : category
  let column = await prisma.column.findUnique({ where: { name: catName } })
  if (!column) column = await prisma.column.create({ data: { name: catName } })
  return column.id
}

async function reportImportFailure(
  filename: string,
  stage: ImportStage,
  error: unknown,
): Promise<void> {
  await reportOperationFailure({
    event: "content.import_failed",
    component: "api.import",
    action: stage,
    error,
    context: { filename, stage, repositoryWriteAttempted: stage === "db_write" },
    fingerprint: `content.import_failed:api.import:${stage}`,
  })
}

async function importParsedArticle(parsed: ParsedArticle, filename: string): Promise<ImportResult> {
  let stage: ImportStage = "duplicate_check"
  try {
    const existing = await prisma.blogPost.findUnique({ where: { slug: parsed.slug } })
    if (existing) {
      return { filename, status: "skipped", title: parsed.title, error: "slug already exists" }
    }

    stage = "column"
    const columnId = await resolveColumnId(parsed.category)

    stage = "github_write"
    const githubPath = `posts/${parsed.slug}.md`
    await saveFileContent(githubPath, parsed.body || `# ${parsed.title}\n`, undefined, `Import: ${parsed.title}`)

    stage = "db_write"
    const isPublished = parsed.status.toLowerCase() === "published"
    const publishDate = parseDate(parsed.date || "")

    await prisma.blogPost.create({
      data: {
        slug: parsed.slug,
        title: parsed.title,
        description: parsed.summary || null,
        githubPath,
        published: isPublished,
        columnId,
        publishDate,
      },
    })

    logStructured("info", {
      event: "content.imported",
      component: "api.import",
      outcome: "success",
      context: { filename, slug: parsed.slug, path: githubPath, published: isPublished },
    })
    return { filename, status: "imported", title: parsed.title }
  } catch (error: any) {
    await reportImportFailure(filename, stage, error)
    return { filename, status: "error", error: error.message || "unknown error" }
  }
}

async function importFile(file: File): Promise<ImportResult> {
  try {
    const text = await file.text()
    return await importParsedArticle(parseNotionMd(text), file.name)
  } catch (error: any) {
    await reportImportFailure(file.name, "parse", error)
    return { filename: file.name, status: "error", error: error.message || "unknown error" }
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!(session?.user as any)?.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 })

  const formData = await req.formData()
  const files = formData.getAll("files") as File[]
  if (!files.length) return NextResponse.json({ error: "no files" }, { status: 400 })

  const results: ImportResult[] = []
  for (const file of files) {
    results.push(await importFile(file))
  }

  return NextResponse.json({ results })
}
