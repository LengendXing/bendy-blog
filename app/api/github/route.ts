export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getFileContent } from "@/lib/github"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!(session?.user as any)?.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 })
  const path = req.nextUrl.searchParams.get("path")
  if (!path) return NextResponse.json({ error: "path required" }, { status: 400 })

  try {
    const file = await getFileContent(path)
    return NextResponse.json(file || { content: "", sha: null })
  } catch (error) {
    const message = error instanceof Error ? error.message : "GitHub read failed"
    return NextResponse.json({ error: message, code: "github_api_error" }, { status: 502 })
  }
}
