"use client"

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react"
import { X } from "lucide-react"

type ToastVariant = "error" | "success" | "info"

export type ToastAction = {
  label: string
  onClick: () => void
}

type ToastItem = {
  id: number
  message: string
  variant: ToastVariant
  action?: ToastAction
}

type AdminToastContextValue = {
  error: (message: string, action?: ToastAction) => void
  success: (message: string) => void
  info: (message: string) => void
}

const AdminToastContext = createContext<AdminToastContextValue | null>(null)

const TOAST_DURATION: Record<ToastVariant, number> = {
  error: 6000,
  success: 3500,
  info: 4000,
}

const TOAST_STYLES: Record<ToastVariant, string> = {
  error: "border-red-500 text-red-600 dark:text-red-400",
  success: "border-green-600 text-green-700 dark:text-green-400",
  info: "border-pixel-black text-pixel-black dark:border-pixel-white dark:text-pixel-white",
}

const TOAST_GLYPHS: Record<ToastVariant, string> = {
  error: "!",
  success: "✓",
  info: "i",
}

/**
 * Pixel-styled toast host for the admin area. Action failures are reported
 * through this single channel so no request can fail silently.
 */
export function AdminToastProvider({ children, dismissLabel, regionLabel }: { children: ReactNode; dismissLabel: string; regionLabel: string }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts(items => items.filter(item => item.id !== id))
  }, [])

  const push = useCallback((message: string, variant: ToastVariant, action?: ToastAction) => {
    if (!message) return
    const id = ++nextId.current
    setToasts(items => [...items.slice(-3), { id, message, variant, action }])
    window.setTimeout(() => dismiss(id), TOAST_DURATION[variant])
  }, [dismiss])

  const value = useMemo<AdminToastContextValue>(() => ({
    error: (message, action) => push(message, "error", action),
    success: message => push(message, "success"),
    info: message => push(message, "info"),
  }), [push])

  return (
    <AdminToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2"
        role="region"
        aria-label={regionLabel}
      >
        {toasts.map(toast => (
          <div
            key={toast.id}
            role={toast.variant === "error" ? "alert" : "status"}
            className={`pixel-toast-in pointer-events-auto flex items-start gap-3 border-2 bg-pixel-white p-3 shadow-[4px_4px_0_currentColor] dark:bg-pixel-black ${TOAST_STYLES[toast.variant]}`}
          >
            <span aria-hidden="true" className="mt-0.5 font-mono text-xs leading-none">{TOAST_GLYPHS[toast.variant]}</span>
            <div className="min-w-0 flex-1">
              <p className="break-words font-body text-xs leading-relaxed">{toast.message}</p>
              {toast.action && (
                <button
                  type="button"
                  onClick={() => {
                    const action = toast.action
                    dismiss(toast.id)
                    action?.onClick()
                  }}
                  className="mt-2 border border-current px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider hover:bg-current/10 focus:outline-none focus:ring-2 focus:ring-current"
                >
                  {toast.action.label}
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label={dismissLabel}
              title={dismissLabel}
              className="shrink-0 p-0.5 hover:opacity-60 focus:outline-none focus:ring-2 focus:ring-current"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </AdminToastContext.Provider>
  )
}

export function useAdminToast(): AdminToastContextValue {
  const context = useContext(AdminToastContext)
  if (!context) throw new Error("useAdminToast must be used within AdminToastProvider")
  return context
}
