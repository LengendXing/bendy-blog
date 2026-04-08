"use client"
import Link from "next/link"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageSwitcher } from "@/components/language-switcher"
import { LocaleProvider, useLocale } from "@/components/locale-provider"
import { useEffect, useState } from "react"

function BlogLayoutInner({ children }: { children: React.ReactNode }) {
  const { t } = useLocale()
  const [config, setConfig] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch("/api/config").then(r => r.json()).then(setConfig).catch(() => {})
  }, [])

  const blogTitle = config.blogTitle || "BENDY BLOG"
  const footerText = config.footerText || "Built with nextjs & By @SunChengXin"

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b-2 border-pixel-black dark:border-pixel-white">
        <nav className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/blogs" className="font-mono text-xs uppercase tracking-widest hover:opacity-70">
            ░ {blogTitle}
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/blogs" className="font-body text-sm hover:underline underline-offset-4">{t.blogs}</Link>
            <Link href="/projects" className="font-body text-sm hover:underline underline-offset-4">{t.projects}</Link>
            <Link href="/about" className="font-body text-sm hover:underline underline-offset-4">{t.about}</Link>
            <LanguageSwitcher compact />
            <ThemeToggle />
          </div>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t-2 border-pixel-black dark:border-pixel-white py-6 text-center font-body text-xs text-pixel-gray-500">
        {footerText}
      </footer>
    </div>
  )
}

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <BlogLayoutInner>{children}</BlogLayoutInner>
    </LocaleProvider>
  )
}
