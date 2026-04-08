import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-sm font-body transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 border-2",
  {
    variants: {
      variant: {
        default: "border-pixel-black dark:border-pixel-white bg-pixel-black dark:bg-pixel-white text-pixel-white dark:text-pixel-black hover:bg-pixel-gray-800 dark:hover:bg-pixel-gray-200",
        outline: "border-pixel-black dark:border-pixel-white bg-transparent hover:bg-pixel-gray-100 dark:hover:bg-pixel-gray-800",
        ghost: "border-transparent hover:bg-pixel-gray-100 dark:hover:bg-pixel-gray-800",
        destructive: "border-red-600 bg-red-600 text-white hover:bg-red-700",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-6",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  }
)
Button.displayName = "Button"
export { Button, buttonVariants }
