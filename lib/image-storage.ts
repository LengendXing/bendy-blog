/**
 * Server-side image storage discovery for the orphan-image audit.
 * Supports the same two remote backends as the upload route: Dufs first,
 * then the GitHub image repository. Base64 uploads have no file lifecycle.
 */
import { prisma } from "@/lib/prisma"
import { getFileContent, listFiles } from "@/lib/github"
import { normalizeDufsListing, type StoredImage } from "@/lib/orphan-images"

export type ImageProvider = "dufs" | "github"
export type StoredImageRef = StoredImage & { provider: ImageProvider }
export type ImageSource = { provider: ImageProvider; images: StoredImageRef[] }

type DufsConfig = { baseUrl: string; user: string; pass: string }
type GithubConfig = { repo: string; token: string }

async function configValue(key: string, envKey: string): Promise<string> {
  const row = await prisma.siteConfig.findUnique({ where: { key } })
  return row?.value || process.env[envKey] || ""
}

async function getDufsConfig(): Promise<DufsConfig | null> {
  const enabledRow = await prisma.siteConfig.findUnique({ where: { key: "dufsEnabled" } })
  const enabled = enabledRow?.value === "true" || process.env.DUFS_ENABLED === "true"
  if (!enabled) return null
  const baseUrl = (await configValue("dufsUrl", "DUFS_URL")).replace(/\/+$/, "")
  if (!baseUrl) return null
  return {
    baseUrl,
    user: await configValue("dufsUser", "DUFS_USER"),
    pass: await configValue("dufsPass", "DUFS_PASS"),
  }
}

async function getGithubConfig(): Promise<GithubConfig | null> {
  const repo = await configValue("githubImageRepo", "GITHUB_IMAGE_REPO")
  const token = await configValue("githubImageToken", "GITHUB_IMAGE_TOKEN")
  if (!repo || !token) return null
  return { repo, token }
}

function authHeaders(config: DufsConfig): Record<string, string> {
  if (!config.user || !config.pass) return {}
  return { Authorization: "Basic " + Buffer.from(`${config.user}:${config.pass}`).toString("base64") }
}

export function buildDufsImageUrl(baseUrl: string, path: string): string {
  const encoded = path.split("/").filter(Boolean).map(encodeURIComponent).join("/")
  return `${baseUrl.replace(/\/+$/, "")}/${encoded}`
}

function parsePropfind(xml: string, baseUrl: string): StoredImage[] {
  const blocks = xml.match(/<(?:[\w-]+:)?response\b[\s\S]*?<\/(?:[\w-]+:)?response>/gi) ?? []
  const images: StoredImage[] = []
  for (const block of blocks) {
    const href = block.match(/<(?:[\w-]+:)?href[^>]*>([^<]+)</i)?.[1]
    if (!href) continue
    let pathname = href
    try {
      pathname = new URL(href, baseUrl).pathname
    } catch {
      // Keep the raw href when the server returns a relative path.
    }
    const basePath = new URL(baseUrl).pathname.replace(/\/+$/, "")
    let path = pathname.startsWith(basePath) ? pathname.slice(basePath.length) : pathname
    path = decodeURIComponent(path).replace(/^\/+/, "")
    if (!path || path.endsWith("/")) continue
    const size = Number(block.match(/<(?:[\w-]+:)?getcontentlength[^>]*>([^<]+)</i)?.[1] || "")
    const modified = block.match(/<(?:[\w-]+:)?getlastmodified[^>]*>([^<]+)</i)?.[1]
    images.push({
      path,
      name: path.split("/").pop(),
      size: Number.isFinite(size) && size > 0 ? size : undefined,
      updatedAt: modified || undefined,
    })
  }
  return images
}

async function listDufsImages(config: DufsConfig): Promise<StoredImageRef[]> {
  const headers = authHeaders(config)
  const jsonResponse = await fetch(`${config.baseUrl}/?json`, { headers, cache: "no-store" })
  let images: StoredImage[] = []
  if (jsonResponse.ok) {
    images = normalizeDufsListing(await jsonResponse.json())
  } else {
    const propfind = await fetch(`${config.baseUrl}/`, {
      method: "PROPFIND",
      headers: { ...headers, Depth: "1" },
      cache: "no-store",
    })
    if (propfind.ok) images = parsePropfind(await propfind.text(), config.baseUrl)
  }
  return images.map(image => ({ ...image, provider: "dufs" as const, url: buildDufsImageUrl(config.baseUrl, image.path) }))
}

async function listGithubImages(config: GithubConfig): Promise<StoredImageRef[]> {
  const response = await fetch(`https://api.github.com/repos/${config.repo}/contents/images`, {
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store",
  })
  if (!response.ok) return []
  const payload = await response.json()
  if (!Array.isArray(payload)) return []
  return payload
    .filter((item: any) => item?.type === "file" && typeof item.path === "string")
    .map((item: any) => ({
      provider: "github" as const,
      path: item.path,
      name: item.name,
      size: typeof item.size === "number" ? item.size : undefined,
      sha: item.sha,
      url: item.download_url,
    }))
}

export async function listAllStoredImages(): Promise<ImageSource[]> {
  const [dufs, github] = await Promise.all([getDufsConfig(), getGithubConfig()])
  const sources: ImageSource[] = []
  if (dufs) sources.push({ provider: "dufs", images: await listDufsImages(dufs) })
  if (github) sources.push({ provider: "github", images: await listGithubImages(github) })
  return sources
}

export async function collectImageReferenceTexts(): Promise<string[]> {
  const [posts, abouts, projects, configs, comments, users] = await Promise.all([
    prisma.blogPost.findMany({ select: { title: true, description: true, slug: true } }),
    prisma.aboutPage.findMany({ select: { content: true } }),
    prisma.project.findMany({ select: { description: true, logoUrl: true } }),
    prisma.siteConfig.findMany({ select: { value: true } }),
    prisma.comment.findMany({ select: { content: true, imageUrl: true } }),
    prisma.user.findMany({ select: { image: true } }),
  ])

  const texts: string[] = []
  for (const post of posts) texts.push(post.title, post.description || "", post.slug)
  for (const about of abouts) texts.push(about.content)
  for (const project of projects) texts.push(project.description || "", project.logoUrl || "")
  for (const config of configs) texts.push(config.value)
  for (const comment of comments) texts.push(comment.content, comment.imageUrl || "")
  for (const user of users) texts.push(user.image || "")

  const contentFiles = await listFiles("posts")
  for (const file of contentFiles.slice(0, 200)) {
    if (!file.name.endsWith(".md")) continue
    const content = await getFileContent(file.path)
    if (content) texts.push(content.content)
  }
  return texts
}

export async function deleteStoredImage(image: StoredImageRef): Promise<void> {
  if (image.provider === "dufs") {
    const config = await getDufsConfig()
    if (!config) throw new Error("dufs_not_configured")
    const response = await fetch(buildDufsImageUrl(config.baseUrl, image.path), {
      method: "DELETE",
      headers: authHeaders(config),
    })
    if (!response.ok && response.status !== 404) throw new Error(`dufs_delete_failed_${response.status}`)
    return
  }

  const config = await getGithubConfig()
  if (!config) throw new Error("github_not_configured")
  if (!image.sha) throw new Error("github_sha_missing")
  const response = await fetch(`https://api.github.com/repos/${config.repo}/contents/${image.path}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({ message: `Delete orphan image ${image.path}`, sha: image.sha }),
  })
  if (!response.ok && response.status !== 404) throw new Error(`github_delete_failed_${response.status}`)
}
