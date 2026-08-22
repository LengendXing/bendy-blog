import "@/styles/globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthSessionProvider } from "@/components/session-provider"
import type { Metadata, Viewport } from "next"

const siteUrl = "https://blog.sunchengxin.com"
const siteTitle = "Bendy Blog"
const siteDescription = "笨迪博客（BendyBlog）是程序员笨迪的技术博客，记录 Java、后端开发、机器学习、深度学习、算法与工程实践，分享持续成长的码农修炼笔记。"

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: siteTitle,
  description: siteDescription,
  keywords: ["笨迪博客", "BendyBlog", "码农修炼笔记", "Java", "后端开发", "机器学习", "深度学习", "算法", "程序员"],
  authors: [{ name: "笨迪" }],
  creator: "笨迪",
  publisher: "Bendy Blog",
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Bendy Blog",
    locale: "zh_CN",
    title: siteTitle,
    description: siteDescription,
  },
  twitter: {
    card: "summary",
    title: siteTitle,
    description: siteDescription,
  },
  alternates: {
    types: { "application/rss+xml": `${siteUrl}/feed.xml` },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Bendy Blog",
    alternateName: ["笨迪博客", "BendyBlog", "码农修炼笔记"],
    url: siteUrl,
    description: siteDescription,
    inLanguage: "zh-CN",
    publisher: { "@type": "Person", name: "笨迪" },
  }

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd).replace(/</g, "\\u003c") }} />
        <AuthSessionProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            {children}
          </ThemeProvider>
        </AuthSessionProvider>
      </body>
    </html>
  )
}
