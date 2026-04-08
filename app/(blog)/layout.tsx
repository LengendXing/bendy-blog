import Link from "next/link"
import { ThemeToggle } from "@/components/theme-toggle"

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b-2 border-pixel-black dark:border-pixel-white">
        <nav className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/blogs" className="font-mono text-xs uppercase tracking-widest hover:opacity-70">
            ░ PIXEL BLOG
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/blogs" className="font-body text-sm hover:underline underline-offset-4">blogs</Link>
            <Link href="/projects" className="font-body text-sm hover:underline underline-offset-4">projects</Link>
            <Link href="/about" className="font-body text-sm hover:underline underline-offset-4">about</Link>
            <ThemeToggle />
          </div>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t-2 border-pixel-black dark:border-pixel-white py-6 text-center font-body text-xs text-pixel-gray-500">
        Built with pixels & passion
      </footer>
    </div>
  )
}
