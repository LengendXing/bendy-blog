import { NextAuthOptions } from "next-auth"
import GithubProvider from "next-auth/providers/github"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "./prisma"

const adminUsernames = (process.env.ADMIN_GITHUB_USERNAMES || "").split(",").map(s => s.trim())

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID || "",
      clientSecret: process.env.GITHUB_SECRET || "",
    }),
  ],
  callbacks: {
    async signIn({ user, profile }) {
      return true
    },
    async session({ session, user }) {
      if (session.user) {
        (session.user as any).id = user.id
        const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
        // 如果 githubUsername 还没存，从 account 补上
        if (!dbUser?.githubUsername && dbUser) {
          const account = await prisma.account.findFirst({ where: { userId: user.id, provider: "github" } })
          if (account) {
            const res = await fetch(`https://api.github.com/user/${account.providerAccountId}`)
            if (res.ok) {
              const gh = await res.json()
              await prisma.user.update({ where: { id: user.id }, data: { githubUsername: gh.login } })
              ;(session.user as any).githubUsername = gh.login
              ;(session.user as any).isAdmin = adminUsernames.includes(gh.login)
              return session
            }
          }
        }
        ;(session.user as any).githubUsername = dbUser?.githubUsername
        ;(session.user as any).isAdmin = adminUsernames.includes(dbUser?.githubUsername || "")
      }
      return session
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
