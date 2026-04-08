"use client"
import { useEffect, useState } from "react"
import { Card, CardTitle, CardContent } from "@/components/ui/card"
import { Eye, Share2, MessageSquare, FileText, TrendingUp, Clock } from "lucide-react"

export default function OverviewPage() {
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    fetch("/api/stats").then(r => r.json()).then(setStats)
  }, [])

  if (!stats) return <div className="font-mono text-xs">Loading...</div>

  const cards = [
    { label: "Total Views", value: stats.totalViews, icon: Eye },
    { label: "Total Posts", value: stats.totalPosts, icon: FileText },
    { label: "Total Comments", value: stats.totalComments, icon: MessageSquare },
    { label: "Total Shares", value: stats.totalShares, icon: Share2 },
    { label: "Top Viewed", value: stats.topViewed?.title || "—", sub: stats.topViewed ? `${stats.topViewed.views} views` : "", icon: TrendingUp },
    { label: "Most Commented", value: stats.topCommented?.title || "—", sub: stats.topCommented ? `${stats.topCommented.comments} comments` : "", icon: MessageSquare },
    { label: "Top Views (Single)", value: stats.topViewed?.views ?? 0, icon: Eye },
    { label: "Last Updated", value: stats.lastUpdated ? new Date(stats.lastUpdated).toLocaleDateString() : "—", icon: Clock },
  ]

  return (
    <div>
      <h1 className="font-mono text-sm uppercase tracking-widest mb-6">// Overview</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <Card key={c.label}>
            <div className="flex items-start justify-between mb-3">
              <CardTitle>{c.label}</CardTitle>
              <c.icon className="w-4 h-4 text-pixel-gray-400" />
            </div>
            <CardContent>
              <div className="font-mono text-2xl">{typeof c.value === "number" ? c.value.toLocaleString() : c.value}</div>
              {c.sub && <p className="font-body text-xs text-pixel-gray-500 mt-1">{c.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
