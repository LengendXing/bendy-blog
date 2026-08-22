import { PixelLoader } from "@/components/pixel-loader"

export default function BlogLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <PixelLoader size="lg" />
    </div>
  )
}
