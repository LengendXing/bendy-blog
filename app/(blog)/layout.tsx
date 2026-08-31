"use client"
import Link from "next/link"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageSwitcher } from "@/components/language-switcher"
import { LocaleProvider, useLocale } from "@/components/locale-provider"
import { Globe2, X } from "lucide-react"
import { useEffect, useState } from "react"

const NETWORK_NOTICE_STORAGE_KEY = "bendy-network-notice-seen"

function NetworkNotice() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (window.localStorage.getItem(NETWORK_NOTICE_STORAGE_KEY)) return
      window.localStorage.setItem(NETWORK_NOTICE_STORAGE_KEY, "1")
      setVisible(true)
    } catch {
      // Private browsing modes can deny storage access; the notice still works for this visit.
      setVisible(true)
    }
  }, [])

  useEffect(() => {
    if (!visible) return
    const timeout = window.setTimeout(() => setVisible(false), 8000)
    return () => window.clearTimeout(timeout)
  }, [visible])

  if (!visible) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div
        className="pixel-pop pointer-events-auto w-full max-w-md border-2 border-pixel-black bg-pixel-white p-4 text-pixel-black shadow-[8px_8px_0_#0a0a0a] dark:border-pixel-white dark:bg-pixel-black dark:text-pixel-white dark:shadow-[8px_8px_0_#fafafa]"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-start gap-3">
          <Globe2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-widest">访问提示</p>
            <p className="mt-2 font-body text-xs leading-relaxed">
              如果你没有使用网络代理，建议开启网络代理访问，否则部分图片可能无法正常加载。
            </p>
          </div>
          <button
            type="button"
            onClick={() => setVisible(false)}
            className="shrink-0 p-1 hover:bg-pixel-gray-100 dark:hover:bg-pixel-gray-900"
            aria-label="关闭访问提示"
            title="关闭"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}

function BlogLayoutInner({ children }: { children: React.ReactNode }) {
  const { t } = useLocale()
  const [config, setConfig] = useState<Record<string, string>>({})

  useEffect(() => { fetch("/api/config").then(r => r.json()).then(setConfig).catch(() => {}) }, [])

  const normalizedTitle = config.blogTitle?.trim().toUpperCase()
  const blogTitle = !config.blogTitle || normalizedTitle === "BENDY BLOG" || normalizedTitle === "笨迪博客 BENDYBLOG | 码农修炼笔记" || normalizedTitle === "笨迪博客 BENDYBLOG"
    ? "Bendy Blog"
    : config.blogTitle
  const footerText = config.footerText || "Built with nextjs & By @SunChengXin"

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b-2 border-pixel-black dark:border-pixel-white">
        <nav className="max-w-3xl mx-auto px-4 h-12 sm:h-14 flex items-center justify-between">
          <Link href="/blogs" className="font-mono text-[10px] sm:text-xs uppercase tracking-widest hover:opacity-70">
            ░ {blogTitle}
          </Link>
          <div className="flex items-center gap-3 sm:gap-6">
            <Link href="/blogs" className="font-body text-xs sm:text-sm hover:underline underline-offset-4">{t.blogs}</Link>
            <Link href="/projects" className="font-body text-xs sm:text-sm hover:underline underline-offset-4">{t.projects}</Link>
            <Link href="/about" className="font-body text-xs sm:text-sm hover:underline underline-offset-4">{t.about}</Link>
            <LanguageSwitcher compact />
            <ThemeToggle />
          </div>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t-2 border-pixel-black dark:border-pixel-white py-4 sm:py-6 text-center font-body text-[10px] sm:text-xs text-pixel-gray-500">
        {footerText}
      </footer>
      <NetworkNotice />
    </div>
  )
}

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <LocaleProvider><BlogLayoutInner>{children}</BlogLayoutInner></LocaleProvider>
}
