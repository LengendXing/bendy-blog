import { cn } from "@/lib/utils"

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("inline-flex items-center border-2 border-pixel-black dark:border-pixel-white px-2 py-0.5 text-xs font-mono uppercase", className)} {...props} />
}
