/**
 * Unified browser-side API client.
 *
 * Every admin request must go through this module so a failed response
 * (network error, 401, 403, 500, ...) can never be parsed as if it succeeded.
 */

export type ApiErrorPayload = {
  error?: unknown
  message?: unknown
  code?: unknown
}

export class ApiError extends Error {
  readonly status: number
  readonly code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
  }
}

export type ApiErrorMessages = {
  requestFailed: string
  networkError: string
  sessionExpired: string
  permissionDenied: string
}

const MACHINE_CODE = /^[a-z][a-z0-9_]*$/

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return undefined
}

async function readErrorPayload(response: Response): Promise<ApiErrorPayload | null> {
  try {
    const data = await response.json()
    return data && typeof data === "object" ? (data as ApiErrorPayload) : null
  } catch {
    return null
  }
}

/**
 * Fetch wrapper that rejects on any non-2xx response.
 * The response body is inspected once for `{ error, message, code }`.
 */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const response = await fetch(input, init)
  if (response.ok) return response

  const payload = await readErrorPayload(response)
  const message = firstString(payload?.message, payload?.error) ?? `Request failed with status ${response.status}`
  const code = firstString(payload?.code, payload?.error)
  throw new ApiError(message, response.status, code)
}

/** Fetch + JSON parse convenience wrapper. Use for endpoints that return a body. */
export async function apiJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await apiFetch(input, init)
  return response.json() as Promise<T>
}

export type RetryOptions = {
  /** Number of retries after the first attempt. Defaults to 2. */
  retries?: number
  /** Base delay in milliseconds; doubles after every failed attempt. Defaults to 400. */
  baseDelayMs?: number
}

const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504])

function requestMethod(init?: RequestInit): string {
  return (init?.method || "GET").toUpperCase()
}

export function isRetryableError(error: unknown): boolean {
  if (isAbortError(error)) return false
  if (error instanceof ApiError) return RETRYABLE_STATUSES.has(error.status)
  // fetch() rejects with TypeError for DNS failures, offline state and resets.
  return error instanceof TypeError
}

function waitForRetry(ms: number, signal?: AbortSignal | null): Promise<void> {
  if (ms <= 0) return Promise.resolve()
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"))
      return
    }
    const onAbort = () => {
      clearTimeout(timer)
      reject(new DOMException("Aborted", "AbortError"))
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort)
      resolve()
    }, ms)
    signal?.addEventListener("abort", onAbort, { once: true })
  })
}

/**
 * JSON GET helper with bounded retries for transient failures.
 * Only idempotent methods (GET/HEAD) are retried; mutations never are, so a
 * flaky network cannot create duplicate posts, comments or uploads.
 */
export async function apiJsonWithRetry<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
  options: RetryOptions = {},
): Promise<T> {
  const method = requestMethod(init)
  const idempotent = method === "GET" || method === "HEAD"
  const retries = idempotent ? Math.max(0, options.retries ?? 2) : 0
  const baseDelayMs = Math.max(0, options.baseDelayMs ?? 400)

  let attempt = 0
  for (;;) {
    try {
      return await apiJson<T>(input, init)
    } catch (error) {
      if (attempt >= retries || !isRetryableError(error)) throw error
      await waitForRetry(baseDelayMs * 2 ** attempt, init?.signal)
      attempt += 1
    }
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError"
}

/**
 * Convert any thrown value into a localized, user-facing message.
 * Machine codes such as `forbidden` / `github_api_error` are replaced by
 * localized text; human-readable server messages are preserved.
 */
export function getApiErrorMessage(error: unknown, messages: ApiErrorMessages): string {
  if (isAbortError(error)) return ""
  if (error instanceof ApiError) {
    if (error.status === 401) return messages.sessionExpired
    if (error.status === 403) return messages.permissionDenied
    const message = error.message.trim()
    if (message && !MACHINE_CODE.test(message)) return message
    return messages.requestFailed
  }
  if (error instanceof TypeError) return messages.networkError
  return messages.requestFailed
}
