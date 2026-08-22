"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { PixelLoader } from "@/components/pixel-loader"

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const timer = window.setTimeout(() => router.replace("/blogs"), 700)
    return () => window.clearTimeout(timer)
  }, [router])

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <PixelLoader size="lg" />
    </main>
  )
}
