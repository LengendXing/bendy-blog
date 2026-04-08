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
    async signIn({ profile }) {
      return true
    },
    async session({ session, user }) {
      if (session.user) {
        (session.user as any).id = user.id
        const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
        ;(session.user as any).githubUsername = dbUser?.githubUsername
        ;(session.user as any).isAdmin = adminUsernames.includes(dbUser?.githubUsername || "")
      }
      return session
    },
  },
  events: {
    async signIn({ user, profile }) {
      if (profile && (profile as any).login) {
        await prisma.user.update({
          where: { id: user.id },
          data: { githubUsername: (profile as any).login },
        })
      }
    },
  },
  pages: {
    signIn: "/api/auth/signin",
  },
}
