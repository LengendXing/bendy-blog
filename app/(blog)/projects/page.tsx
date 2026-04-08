"use client"
import { useEffect, useState } from "react"
import { ExternalLink } from "lucide-react"
import { useLocale } from "@/components/locale-provider"

export default function ProjectsPage() {
  const { t } = useLocale()
  const [projects, setProjects] = useState<any[]>([])

  useEffect(() => { fetch("/api/projects").then(r => r.json()).then(setProjects) }, [])

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 sm:py-16">
      <h1 className="font-mono text-base sm:text-lg uppercase tracking-widest mb-8 sm:mb-12">// {t.projects}</h1>
      <div className="space-y-3 sm:space-y-4">
        {projects.map((p: any) => (
          <a key={p.id} href={p.url || "#"} target="_blank" rel="noopener noreferrer"
            className="group block border-2 border-pixel-black dark:border-pixel-white p-4 sm:p-5 hover:bg-pixel-gray-100 dark:hover:bg-pixel-gray-900 transition-colors">
            <div className="flex items-start gap-3 sm:gap-4">
              {p.logoUrl && <img src={p.logoUrl} alt="" className="w-8 h-8 sm:w-10 sm:h-10 border-2 border-pixel-gray-300 dark:border-pixel-gray-700 shrink-0 object-cover" />}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs sm:text-sm uppercase">{p.title}</span>
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                {p.description && <p className="font-body text-xs text-pixel-gray-500 mt-1">{p.description}</p>}
              </div>
            </div>
          </a>
        ))}
        {projects.length === 0 && <p className="font-body text-pixel-gray-500">{t.noProjectsYet}</p>}
      </div>
    </div>
  )
}
