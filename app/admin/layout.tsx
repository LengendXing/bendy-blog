"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession, signIn, signOut } from "next-auth/react"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageSwitcher } from "@/components/language-switcher"
import { LocaleProvider, useLocale } from "@/components/locale-provider"
import { LayoutDashboard, MessageSquare, FileText, User, FolderGit2, Bell, LogOut, Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const { t } = useLocale()
  const [mobileNav, setMobileNav] = useState(false)

  const nav = [
    { href: "/admin/overview", label: t.overview, icon: LayoutDashboard },
    { href: "/admin/content", label: t.content, icon: FileText },
    { href: "/admin/comments", label: t.commentsMgmt, icon: MessageSquare },
    { href: "/admin/about", label: t.aboutPage, icon: User },
    { href: "/admin/projects", label: t.projectsMgmt, icon: FolderGit2 },
    { href: "/admin/settings", label: t.settings, icon: Bell },
  ]

  if (status === "loading") return <div className="min-h-screen flex items-center justify-center font-mono text-xs">{t.loading}</div>
  if (!session || !(session.user as any)?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="font-mono text-sm uppercase mb-4">░ {t.adminRequired}</h1>
          <button onClick={() => signIn("github")} className="font-body text-sm border-2 border-pixel-black dark:border-pixel-white px-6 py-2 hover:bg-pixel-gray-100 dark:hover:bg-pixel-gray-900">
            {t.signInGithub}
          </button>
        </div>
      </div>
    )
  }

  const sidebar = (
    <>
      <div className="h-14 flex items-center justify-between px-4 border-b-2 border-pixel-black dark:border-pixel-white">
        <Link href="/admin/overview" className="font-mono text-xs uppercase tracking-widest">░ B.B-Admin</Link>
        <button className="lg:hidden" onClick={() => setMobileNav(false)}><X className="w-4 h-4" /></button>
      </div>
      <nav className="flex-1 py-4">
        {nav.map(item => (
          <Link key={item.href} href={item.href} onClick={() => setMobileNav(false)}
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 font-body text-sm transition-colors",
              pathname.startsWith(item.href) ? "bg-pixel-black dark:bg-pixel-white text-pixel-white dark:text-pixel-black" : "hover:bg-pixel-gray-100 dark:hover:bg-pixel-gray-900"
            )}>
            <item.icon className="w-4 h-4" />{item.label}
          </Link>
        ))}
      </nav>
      <div className="border-t-2 border-pixel-black dark:border-pixel-white p-4">
        <div className="flex items-center gap-2">
          {session.user.image && <img src={session.user.image} alt="" className="w-6 h-6 rounded-full border" />}
          <span className="font-mono text-xs truncate flex-1">{(session.user as any).githubUsername || session.user.name}</span>
          <button onClick={() => signOut()} title={t.signOut} className="hover:opacity-70"><LogOut className="w-3.5 h-3.5" /></button>
        </div>
      </div>
    </>
  )

  return (
    <div className="min-h-screen flex">
      {/* Desktop sidebar */}
      <aside className="w-56 border-r-2 border-pixel-black dark:border-pixel-white flex-col shrink-0 hidden lg:flex">
        {sidebar}
      </aside>
      {/* Mobile overlay */}
      {mobileNav && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileNav(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-56 bg-pixel-white dark:bg-pixel-black border-r-2 border-pixel-black dark:border-pixel-white flex flex-col z-10">
            {sidebar}
          </aside>
        </div>
      )}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b-2 border-pixel-black dark:border-pixel-white flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button className="lg:hidden" onClick={() => setMobileNav(true)}><Menu className="w-4 h-4" /></button>
            <Link href="/blogs" className="font-body text-xs hover:underline">{t.backToBlog}</Link>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <LocaleProvider><AdminLayoutInner>{children}</AdminLayoutInner></LocaleProvider>
}
