import * as React from "react"
import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn("flex min-h-[120px] w-full border-2 border-pixel-black dark:border-pixel-white bg-transparent px-3 py-2 text-sm font-body placeholder:text-pixel-gray-400 focus:outline-none focus:ring-2 focus:ring-pixel-gray-400 disabled:opacity-50 resize-y", className)}
      ref={ref}
      {...props}
    />
  )
)
Textarea.displayName = "Textarea"
export { Textarea }
