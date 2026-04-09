import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { saveFileContent } from "@/lib/github"

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

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!(session?.user as any)?.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 })

  const formData = await req.formData()
  const files = formData.getAll("files") as File[]

  if (!files.length) return NextResponse.json({ error: "no files" }, { status: 400 })

  const results: Array<{ filename: string; status: string; title?: string; error?: string }> = []

  for (const file of files) {
    const filename = file.name
    try {
      const text = await file.text()
      const parsed = parseNotionMd(text)

      // Check if slug exists
      const existing = await prisma.blogPost.findUnique({ where: { slug: parsed.slug } })
      if (existing) {
        results.push({ filename, status: "skipped", title: parsed.title, error: "slug already exists" })
        continue
      }

      // Find or create column
      let columnId: string | null = null
      if (parsed.category) {
        const catName = parsed.category.length > 6 ? parsed.category.slice(0, 6) : parsed.category
        let col = await prisma.column.findUnique({ where: { name: catName } })
        if (!col) col = await prisma.column.create({ data: { name: catName } })
        columnId = col.id
      }

      // Upload to GitHub
      const githubPath = `posts/${parsed.slug}.md`
      await saveFileContent(githubPath, parsed.body || `# ${parsed.title}\n`, undefined, `Import: ${parsed.title}`)

      // Create DB record
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

      results.push({ filename, status: "imported", title: parsed.title })
    } catch (e: any) {
      results.push({ filename, status: "error", error: e.message || "unknown error" })
    }
  }

  return NextResponse.json({ results })
}
