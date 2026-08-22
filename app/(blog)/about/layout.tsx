import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Bendy Blog",
  description: "了解笨迪，以及笨迪博客 BendyBlog 背后的码农修炼笔记与技术实践。",
  alternates: { canonical: "/about" },
  openGraph: {
    type: "profile",
    url: "/about",
    title: "Bendy Blog",
    description: "了解笨迪，以及笨迪博客 BendyBlog 背后的码农修炼笔记与技术实践。",
  },
}

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children
}
