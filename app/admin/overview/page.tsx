"use client"
import { useEffect, useState } from "react"
import { Card, CardTitle, CardContent } from "@/components/ui/card"
import { Eye, Share2, MessageSquare, FileText, TrendingUp, Clock } from "lucide-react"
import { useLocale } from "@/components/locale-provider"

function PixelCalendar({ selectedDate, onSelect }: { selectedDate: Date; onSelect: (d: Date) => void }) {
  const [viewMonth, setViewMonth] = useState(new Date(selectedDate))
  const year = viewMonth.getFullYear()
  const month = viewMonth.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()

  const days: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) days.push(null)
  for (let i = 1; i <= daysInMonth; i++) days.push(i)

  const weeks: (number | null)[][] = []
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7))
  if (weeks.length > 0) while (weeks[weeks.length - 1].length < 7) weeks[weeks.length - 1].push(null)

  function prevMonth() { setViewMonth(new Date(year, month - 1, 1)) }
  function nextMonth() { setViewMonth(new Date(year, month + 1, 1)) }

  const isSelected = (d: number) => d === selectedDate.getDate() && month === selectedDate.getMonth() && year === selectedDate.getFullYear()
  const isToday = (d: number) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear()

  return (
    <div className="border-2 border-pixel-black dark:border-pixel-white p-3 w-full max-w-[280px]">
      <div className="flex items-center justify-between mb-2">
        <button onClick={prevMonth} className="font-mono text-xs px-2 hover:bg-pixel-gray-100 dark:hover:bg-pixel-gray-900">◀</button>
        <span className="font-mono text-xs">{year}.{String(month + 1).padStart(2, "0")}</span>
        <button onClick={nextMonth} className="font-mono text-xs px-2 hover:bg-pixel-gray-100 dark:hover:bg-pixel-gray-900">▶</button>
      </div>
      <div className="grid grid-cols-7 gap-0">
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
          <div key={d} className="text-center font-mono text-[10px] text-pixel-gray-400 py-1">{d}</div>
        ))}
        {weeks.flat().map((d, i) => (
          <button key={i} disabled={!d}
            onClick={() => d && onSelect(new Date(year, month, d))}
            className={`text-center font-mono text-xs py-1.5 transition-colors ${
              !d ? "" :
              isSelected(d) ? "bg-pixel-black dark:bg-pixel-white text-pixel-white dark:text-pixel-black" :
              isToday(d) ? "border border-pixel-black dark:border-pixel-white" :
              "hover:bg-pixel-gray-100 dark:hover:bg-pixel-gray-900"
            }`}>
            {d || ""}
          </button>
        ))}
      </div>
    </div>
  )
}

function Timeline({ date }: { date: Date }) {
  const { t } = useLocale()
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/timeline?date=${date.toISOString()}`).then(r => r.json()).then(d => { setEvents(d); setLoading(false) })
  }, [date])

  if (loading) return <div className="flex-1 flex items-center justify-center font-mono text-xs">{t.loading}</div>

  if (events.length === 0) {
    return <div className="flex-1 flex items-center justify-center font-mono text-xs text-pixel-gray-400">{t.noActivityToday}</div>
  }

  return (
    <div className="flex-1 overflow-auto max-h-[300px] pr-2">
      {events.map((e, i) => (
        <div key={i} className="flex gap-3 mb-3">
          <div className="flex flex-col items-center">
            <div className={`w-2 h-2 border-2 ${e.type === "comment" ? "border-pixel-gray-500" : "border-pixel-black dark:border-pixel-white"} bg-transparent`} />
            {i < events.length - 1 && <div className="w-0.5 flex-1 bg-pixel-gray-300 dark:bg-pixel-gray-700 mt-1" />}
          </div>
          <div className="flex-1 min-w-0">
            <time className="font-mono text-[10px] text-pixel-gray-400">{new Date(e.time).toLocaleTimeString()}</time>
            <p className="font-body text-xs truncate">{e.desc}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function OverviewPage() {
  const { t } = useLocale()
  const [stats, setStats] = useState<any>(null)
  const [selectedDate, setSelectedDate] = useState(new Date())

  useEffect(() => { fetch("/api/stats").then(r => r.json()).then(setStats) }, [])

  if (!stats) return <div className="flex items-center justify-center h-64 font-mono text-xs">{t.loading}</div>

  const cards = [
    { label: t.totalViews, value: stats.totalViews, icon: Eye },
    { label: t.totalPosts, value: stats.totalPosts, icon: FileText },
    { label: t.totalComments, value: stats.totalComments, icon: MessageSquare },
    { label: t.totalShares, value: stats.totalShares, icon: Share2 },
    { label: t.topViewed, value: stats.topViewed?.title || "—", sub: stats.topViewed ? `${stats.topViewed.views} ${t.views}` : "", icon: TrendingUp },
    { label: t.mostCommented, value: stats.topCommented?.title || "—", sub: stats.topCommented ? `${stats.topCommented.comments} ${t.comments}` : "", icon: MessageSquare },
    { label: t.topViewsSingle, value: stats.topViewed?.views ?? 0, icon: Eye },
    { label: t.lastUpdated, value: stats.lastUpdated ? new Date(stats.lastUpdated).toLocaleDateString() : "—", icon: Clock },
  ]

  return (
    <div>
      <h1 className="font-mono text-sm uppercase tracking-widest mb-6">// {t.overview}</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
      <div className="flex gap-6 flex-col lg:flex-row">
        <PixelCalendar selectedDate={selectedDate} onSelect={setSelectedDate} />
        <div className="flex-1 border-2 border-pixel-black dark:border-pixel-white p-4 min-h-[300px] flex flex-col">
          <h2 className="font-mono text-xs uppercase tracking-wider mb-4">
            // {selectedDate.toLocaleDateString()}
          </h2>
          <Timeline date={selectedDate} />
        </div>
      </div>
    </div>
  )
}
