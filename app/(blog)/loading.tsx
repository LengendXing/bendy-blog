import { DelayedLoading } from "@/components/delayed-loading"
import { BlogListSkeleton } from "@/components/pixel-skeleton"

export default function BlogLoading() {
  return <DelayedLoading minHeightClassName="min-h-[60vh]"><BlogListSkeleton /></DelayedLoading>
}
