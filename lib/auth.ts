import { NextAuthOptions } from "next-auth"
import GithubProvider from "next-auth/providers/github"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { prisma } from "./prisma"
import { isAdminIdentity, normalizeGithubUsername } from "./admins"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID || "",
      clientSecret: process.env.GITHUB_SECRET || "",
      issuer: "https://github.com/login/oauth",
    }),
  ],
  callbacks: {
    async signIn({ user, profile }) {
      return true
    },
    async session({ session, user }) {
      if (session.user) {
        (session.user as any).id = user.id
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: {
            githubUsername: true,
            accounts: {
              where: { provider: "github" },
              take: 1,
              select: { providerAccountId: true },
            },
          },
        })
        const githubId = dbUser?.accounts[0]?.providerAccountId || null
        let githubUsername = dbUser?.githubUsername || null

        // Older accounts may predate githubUsername; resolve the public profile without a token once.
        if (!githubUsername && githubId) {
          try {
            const res = await fetch(`https://api.github.com/user/${encodeURIComponent(githubId)}`, {
              headers: {
                Accept: "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
                "User-Agent": "BendyBlog-Auth",
              },
              cache: "no-store",
            })
            if (res.ok) {
              const gh = await res.json()
              githubUsername = normalizeGithubUsername(gh?.login)
              if (githubUsername) {
                await prisma.user.update({ where: { id: user.id }, data: { githubUsername } })
              }
            }
          } catch {}
        }

        ;(session.user as any).githubUsername = githubUsername
        ;(session.user as any).githubId = githubId
        ;(session.user as any).isAdmin = await isAdminIdentity(githubUsername, githubId)
      }
      return session
    },
  },
  events: {
    async signIn({ user, profile }) {
      const githubUsername = typeof (profile as any)?.login === "string" ? (profile as any).login : null
      if (user.id && githubUsername) {
        await prisma.user.update({ where: { id: user.id }, data: { githubUsername } }).catch(() => {})
      }
    },
  },
  // callbacks: {
  //  async signIn({ user, profile }) {
  //     if (profile && (profile as any).login) {
  //       // 延迟一下确保 user 已入库
  //       setTimeout(async () => {
  //         try {
  //           await prisma.user.update({
  //             where: { id: user.id },
  //             data: { githubUsername: (profile as any).login },
  //           })
  //         } catch {}
  //       }, 1000)
  //     }
  //     return true
  //   },
  //   async session({ session, user }) {
  //     if (session.user) {
  //       (session.user as any).id = user.id
  //       const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
  //       ;(session.user as any).githubUsername = dbUser?.githubUsername
  //       ;(session.user as any).isAdmin = adminUsernames.includes(dbUser?.githubUsername || "")
  //     }
  //     return session
  //   },
  // },
  // events: {
  //   async signIn({ user, profile }) {
  //     if (profile && (profile as any).login) {
  //       await prisma.user.update({
  //         where: { id: user.id },
  //         data: { githubUsername: (profile as any).login },
  //       })
  //     }
  //   },
  // },
  // pages: {
  //   signIn: "/api/auth/signin",
  // },
}
