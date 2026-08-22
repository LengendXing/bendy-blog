"use client"

import { useEffect, useState } from "react"
import { ExternalLink } from "lucide-react"
import { useLocale } from "@/components/locale-provider"
import { PixelLoader } from "@/components/pixel-loader"

interface Project {
  id: string
  title: string
  description?: string
  url?: string
  logoUrl?: string
}

export default function ProjectsPage() {
  const { t } = useLocale()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/projects")
      .then(r => r.json())
      .then(data => {
        setProjects(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(err => {
        console.error("Failed to fetch projects:", err)
        setProjects([])
        setLoading(false)
      })
  }, [])

  return (
    <div className="min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-10 sm:py-16">
        <h1 className="font-mono text-base sm:text-lg uppercase tracking-widest mb-8 sm:mb-12 text-center">// {t.projects}</h1>

        {loading ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <PixelLoader size="lg" />
          </div>
        ) : projects.length === 0 ? (
          <div className="flex items-center justify-center min-h-[200px]">
            <p className="font-body text-pixel-gray-500">{t.noProjectsYet}</p>
          </div>
        ) : (
          <div className="border-t-2 border-pixel-black dark:border-pixel-white">
            {projects.map((project, index) => {
              const content = (
                <>
                  <span className="font-mono text-[10px] text-pixel-gray-400 shrink-0 w-6 sm:w-8">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {project.logoUrl ? (
                    <img
                      src={project.logoUrl}
                      alt=""
                      className="w-10 h-10 border-2 border-pixel-gray-300 dark:border-pixel-gray-700 shrink-0 object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 border-2 border-pixel-black dark:border-pixel-white flex items-center justify-center bg-pixel-gray-100 dark:bg-pixel-gray-900 shrink-0">
                      <span className="font-mono text-xs">{project.title[0]?.toUpperCase() || "?"}</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs uppercase truncate">{project.title}</span>
                      {project.url && <ExternalLink className="w-3 h-3 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" />}
                    </div>
                    {project.description && (
                      <p className="font-body text-xs text-pixel-gray-500 mt-1 line-clamp-2">{project.description}</p>
                    )}
                  </div>
                </>
              )

              const className = "group flex items-center gap-3 sm:gap-4 border-b-2 border-pixel-gray-200 dark:border-pixel-gray-800 py-4 sm:py-5 px-2 sm:px-3 -mx-2 sm:-mx-3 hover:bg-pixel-gray-100 dark:hover:bg-pixel-gray-900 transition-colors"

              return project.url ? (
                <a
                  key={project.id}
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={className}
                >
                  {content}
                </a>
              ) : (
                <div key={project.id} className={className}>
                  {content}
                </div>
              )
            })}
          </div>
        )}

        <div className="flex items-center justify-center pt-8">
          <div className="flex gap-1" aria-hidden="true">
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className="w-1.5 h-1.5 bg-pixel-gray-300 dark:bg-pixel-gray-700" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
