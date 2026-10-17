/**
 * Structured logging primitives for server-side operations.
 *
 * Every entry is emitted as one JSON line so that Vercel / container log
 * collectors can index fields such as `event`, `component` and `outcome`
 * without parsing free-form text.
 */

export type LogLevel = "debug" | "info" | "warn" | "error"

export type LogOutcome = "success" | "failure" | "fallback" | "skipped"

export interface LogContext {
  [key: string]: unknown
}

export interface LogInput {
  event: string
  component: string
  action?: string
  outcome?: LogOutcome
  message?: string
  durationMs?: number
  context?: LogContext
  error?: unknown
}

export interface SerializedError {
  name: string
  message: string
  code?: string
  status?: number
  stack?: string
}

const SENSITIVE_KEY_PATTERN = /(token|secret|password|authorization|cookie|api[-_]?key|credential)/i

const MAX_STRING_LENGTH = 2_000

const MAX_DEPTH = 4

/**
 * Convert an unknown thrown value into a plain object that is safe to log.
 */
export function serializeError(error: unknown): SerializedError {
  if (error instanceof Error) {
    const candidate = error as Error & { code?: unknown; status?: unknown }
    const serialized: SerializedError = {
      name: error.name || "Error",
      message: error.message || String(error),
    }
    if (typeof candidate.code === "string") serialized.code = candidate.code
    if (typeof candidate.status === "number") serialized.status = candidate.status
    if (error.stack) serialized.stack = error.stack.slice(0, 4_000)
    return serialized
  }

  if (typeof error === "string") {
    return { name: "Error", message: error }
  }

  try {
    return { name: "Error", message: JSON.stringify(error) }
  } catch {
    return { name: "Error", message: String(error) }
  }
}

/**
 * Recursively redact credential-like keys and truncate long values before
 * they reach the log sink. The function is deliberately defensive: logging
 * must never throw because of a circular object or exotic value.
 */
export function redactValue(value: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
  if (value === null || value === undefined) return value
  if (typeof value === "string") {
    return value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}…` : value
  }
  if (typeof value === "number" || typeof value === "boolean") return value
  if (typeof value === "bigint") return value.toString()
  if (typeof value === "function" || typeof value === "symbol") return String(value)
  if (value instanceof Date) return value.toISOString()
  if (value instanceof Error) return serializeError(value)
  if (depth >= MAX_DEPTH) return "[max-depth]"

  if (Array.isArray(value)) {
    return value.map(item => redactValue(item, depth + 1, seen))
  }

  if (typeof value === "object") {
    if (seen.has(value)) return "[circular]"
    seen.add(value)
    const output: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      output[key] = SENSITIVE_KEY_PATTERN.test(key) ? "[redacted]" : redactValue(item, depth + 1, seen)
    }
    return output
  }

  return String(value)
}

/**
 * Build the canonical JSON line for one log entry.
 */
export function formatLogEntry(level: LogLevel, input: LogInput, now: Date = new Date()): string {
  const serialized = input.error === undefined ? undefined : serializeError(input.error)
  const entry: Record<string, unknown> = {
    ts: now.toISOString(),
    level,
    service: process.env.SERVICE_NAME || "bendy-blog",
    env: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
    event: input.event,
    component: input.component,
  }

  if (input.action) entry.action = input.action
  if (input.outcome) entry.outcome = input.outcome
  if (input.durationMs !== undefined) entry.durationMs = input.durationMs
  if (input.message || serialized?.message) entry.message = input.message || serialized?.message
  if (input.context) entry.context = redactValue(input.context)
  if (serialized) entry.error = serialized

  try {
    return JSON.stringify(entry)
  } catch {
    return JSON.stringify({
      ts: entry.ts,
      level,
      service: entry.service,
      event: input.event,
      component: input.component,
      message: "log_serialization_failed",
    })
  }
}

/**
 * Emit one structured log line. Never throws.
 */
export function logStructured(level: LogLevel, input: LogInput): void {
  const line = formatLogEntry(level, input)
  if (level === "error") {
    console.error(line)
  } else if (level === "warn") {
    console.warn(line)
  } else {
    console.log(line)
  }
}
