import { prisma } from "@/lib/prisma"
import { ExternalLink } from "lucide-react"
// import Image from "next/image"

export const revalidate = 60

export default async function ProjectsPage() {
  const projects = await prisma.project.findMany({ orderBy: { sortOrder: "asc" } })

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="font-mono text-lg uppercase tracking-widest mb-12">// Projects</h1>
      <div className="space-y-4">
        {projects.map(p => (
          <a key={p.id} href={p.url || "#"} target="_blank" rel="noopener noreferrer"
            className="group block border-2 border-pixel-black dark:border-pixel-white p-5 hover:bg-pixel-gray-100 dark:hover:bg-pixel-gray-900 transition-colors">
            <div className="flex items-start gap-4">
              {p.logoUrl && (
                <img src={p.logoUrl} alt="" className="w-10 h-10 border-2 border-pixel-gray-300 dark:border-pixel-gray-700 shrink-0 object-cover" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm uppercase">{p.title}</span>
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                {p.description && <p className="font-body text-xs text-pixel-gray-500 mt-1">{p.description}</p>}
              </div>
            </div>
          </a>
        ))}
        {projects.length === 0 && <p className="font-body text-pixel-gray-500">No projects yet.</p>}
      </div>
    </div>
  )
}
