import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  commentFindMany: vi.fn(),
  postFindMany: vi.fn(),
  getServerSession: vi.fn(),
}))

vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }))
vi.mock("@/lib/auth", () => ({ authOptions: {} }))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    comment: { findMany: mocks.commentFindMany },
    blogPost: { findMany: mocks.postFindMany },
  },
}))

import { GET } from "./route"

function request(date = "2026-10-17") {
  return new NextRequest(`http://localhost/api/timeline?date=${date}`)
}

describe("GET /api/timeline", () => {
  beforeEach(() => {
    mocks.getServerSession.mockReset()
    mocks.commentFindMany.mockReset()
    mocks.postFindMany.mockReset()
  })

  it("rejects anonymous requests", async () => {
    mocks.getServerSession.mockResolvedValue(null)

    const response = await GET(request())

    expect(response.status).toBe(403)
    expect(mocks.commentFindMany).not.toHaveBeenCalled()
    expect(mocks.postFindMany).not.toHaveBeenCalled()
  })

  it("returns merged activity sorted newest first for administrators", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { isAdmin: true } })
    mocks.commentFindMany.mockResolvedValue([
      {
        createdAt: new Date("2026-10-17T10:00:00.000Z"),
        user: { name: "Fallback Name", githubUsername: null },
        post: { title: "First post" },
      },
    ])
    mocks.postFindMany.mockResolvedValue([
      { title: "Second post", createdAt: new Date("2026-10-17T12:00:00.000Z") },
    ])

    const response = await GET(request())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.map((event: { type: string }) => event.type)).toEqual(["post", "comment"])
    expect(body[1].desc).toBe('Fallback Name commented on "First post"')
    expect(body[0].desc).toBe('Published "Second post"')
  })
})
