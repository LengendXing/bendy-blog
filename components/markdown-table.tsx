import React, { type ReactNode } from "react"

/** Keep wide Markdown tables inside the article column while preserving native table semantics. */
export function MarkdownTable({ children }: { children?: ReactNode }) {
  return (
    // tabIndex keeps the horizontal scroll area reachable without a pointer device.
    <div className="prose-table-scroll w-full min-w-0" tabIndex={0}>
      <table>{children}</table>
    </div>
  )
}
