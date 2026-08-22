import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Bendy Blog",
  description: "笨迪博客 BendyBlog 的项目作品、开源实践与工程实验记录。",
  alternates: { canonical: "/projects" },
  openGraph: {
    type: "website",
    url: "/projects",
    title: "Bendy Blog",
    description: "笨迪博客 BendyBlog 的项目作品、开源实践与工程实验记录。",
  },
}

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return children
}
