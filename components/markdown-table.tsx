import type { ReactNode } from "react"

/** Keep wide Markdown tables inside the article column while preserving native table semantics. */
export function MarkdownTable({ children }: { children?: ReactNode }) {
  return (
    <div className="prose-table-scroll">
      <table>{children}</table>
    </div>
  )
}
