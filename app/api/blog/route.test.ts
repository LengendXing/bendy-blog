import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  getServerSession: vi.fn(),
}))

vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }))
vi.mock("@/lib/auth", () => ({ authOptions: {} }))
vi.mock("@/lib/prisma", () => ({ prisma: { blogPost: { findMany: mocks.findMany } } }))
vi.mock("@/lib/github", () => ({
  saveFileContent: vi.fn(),
  getFileContent: vi.fn(),
  deleteFile: vi.fn(),
}))

import { GET } from "./route"

function request(path = "http://localhost/api/blog") {
  return new NextRequest(path)
}

describe("GET /api/blog", () => {
  beforeEach(() => {
    mocks.getServerSession.mockReset()
    mocks.findMany.mockReset()
  })

  it("returns published posts sorted by effective date for anonymous visitors", async () => {
    mocks.getServerSession.mockResolvedValue(null)
    mocks.findMany.mockResolvedValue([
      { slug: "older", title: "Older", publishDate: null, createdAt: "2026-01-01T00:00:00.000Z" },
      { slug: "newer", title: "Newer", publishDate: "2026-05-01T00:00:00.000Z", createdAt: "2026-02-01T00:00:00.000Z" },
    ])

    const response = await GET(request())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.map((item: { slug: string }) => item.slug)).toEqual(["newer", "older"])
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { published: true } }))
  })

  it("lets administrators query drafts by removing the published filter", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { isAdmin: true } })
    mocks.findMany.mockResolvedValue([])

    const response = await GET(request())

    expect(response.status).toBe(200)
    expect(mocks.findMany.mock.calls[0][0].where).toEqual({})
  })
})
