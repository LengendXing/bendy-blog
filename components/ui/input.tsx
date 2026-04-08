import * as React from "react"
import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      className={cn("flex h-10 w-full border-2 border-pixel-black dark:border-pixel-white bg-transparent px-3 py-2 text-sm font-body placeholder:text-pixel-gray-400 focus:outline-none focus:ring-2 focus:ring-pixel-gray-400 disabled:opacity-50", className)}
      ref={ref}
      {...props}
    />
  )
)
Input.displayName = "Input"
export { Input }
