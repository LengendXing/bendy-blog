"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession, signIn } from "next-auth/react"
import { ThemeToggle } from "@/components/theme-toggle"
import { LayoutDashboard, MessageSquare, FileText, User, FolderGit2, Bell } from "lucide-react"
import { cn } from "@/lib/utils"

const nav = [
  { href: "/admin/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/content", label: "Content", icon: FileText },
  { href: "/admin/comments", label: "Comments", icon: MessageSquare },
  { href: "/admin/about", label: "About Page", icon: User },
  { href: "/admin/projects", label: "Projects", icon: FolderGit2 },
  { href: "/admin/settings", label: "Settings", icon: Bell },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { data: session, status } = useSession()

  if (status === "loading") return <div className="min-h-screen flex items-center justify-center font-mono text-xs">LOADING...</div>
  if (!session || !(session.user as any)?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-mono text-sm uppercase mb-4">░ Admin Access Required</h1>
          <button onClick={() => signIn("github")} className="font-body text-sm border-2 border-pixel-black dark:border-pixel-white px-6 py-2 hover:bg-pixel-gray-100 dark:hover:bg-pixel-gray-900">
            Sign in with GitHub
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 border-r-2 border-pixel-black dark:border-pixel-white flex flex-col shrink-0">
        <div className="h-14 flex items-center px-4 border-b-2 border-pixel-black dark:border-pixel-white">
          <Link href="/admin/overview" className="font-mono text-xs uppercase tracking-widest">░ ADMIN</Link>
        </div>
        <nav className="flex-1 py-4">
          {nav.map(item => (
            <Link key={item.href} href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 font-body text-sm transition-colors",
                pathname.startsWith(item.href) ? "bg-pixel-black dark:bg-pixel-white text-pixel-white dark:text-pixel-black" : "hover:bg-pixel-gray-100 dark:hover:bg-pixel-gray-900"
              )}>
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t-2 border-pixel-black dark:border-pixel-white p-4">
          <div className="flex items-center gap-2">
            {session.user.image && <img src={session.user.image} alt="" className="w-6 h-6 rounded-full border" />}
            <span className="font-mono text-xs truncate">{(session.user as any).githubUsername || session.user.name}</span>
          </div>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b-2 border-pixel-black dark:border-pixel-white flex items-center justify-between px-6">
          <Link href="/blogs" className="font-body text-xs hover:underline">← Back to blog</Link>
          <ThemeToggle />
        </header>
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
