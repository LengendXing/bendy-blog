export const SITE_CONFIG_KEYS = [
  "blogTitle",
  "footerText",
  "dufsEnabled",
  "dufsUrl",
  "dufsUser",
  "dufsPass",
  "githubImageRepo",
  "githubImageToken",
] as const

export type SiteConfigKey = (typeof SITE_CONFIG_KEYS)[number]

export type SiteConfigValidationErrorCode =
  | "invalid_payload"
  | "unknown_config_key"
  | "invalid_config_value"

export interface SiteConfigValidationError {
  error: SiteConfigValidationErrorCode
  message: string
  key?: string
}

export type SiteConfigParseResult =
  | { ok: true; values: Partial<Record<SiteConfigKey, string>> }
  | { ok: false; error: SiteConfigValidationError }

type ConfigRule =
  | { kind: "text"; maxLength: number }
  | { kind: "boolean" }
  | { kind: "url"; maxLength: number }
  | { kind: "repo"; maxLength: number }

const CONFIG_RULES: Record<SiteConfigKey, ConfigRule> = {
  blogTitle: { kind: "text", maxLength: 200 },
  footerText: { kind: "text", maxLength: 500 },
  dufsEnabled: { kind: "boolean" },
  dufsUrl: { kind: "url", maxLength: 2048 },
  dufsUser: { kind: "text", maxLength: 256 },
  dufsPass: { kind: "text", maxLength: 512 },
  githubImageRepo: { kind: "repo", maxLength: 200 },
  githubImageToken: { kind: "text", maxLength: 1024 },
}

const GITHUB_REPO_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9_.-]{0,38})\/[A-Za-z0-9_.-]{1,100}$/

function failure(
  error: SiteConfigValidationErrorCode,
  message: string,
  key?: string,
): SiteConfigParseResult {
  return { ok: false, error: key ? { error, message, key } : { error, message } }
}

function normalizeValue(rule: ConfigRule, value: unknown): string | null {
  if (rule.kind === "boolean") {
    if (typeof value === "boolean") return value ? "true" : "false"
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase()
      if (normalized === "true" || normalized === "false") return normalized
    }
    return null
  }

  if (typeof value !== "string" || value.length > rule.maxLength) return null

  if (rule.kind === "text") return value

  if (rule.kind === "url") {
    if (value === "") return ""
    try {
      const parsed = new URL(value)
      return parsed.protocol === "http:" || parsed.protocol === "https:" ? value : null
    } catch {
      return null
    }
  }

  if (value === "") return ""
  if (!GITHUB_REPO_PATTERN.test(value)) return null

  const repo = value.split("/")[1]
  return repo === "." || repo === ".." ? null : value
}

export function parseSiteConfigPayload(input: unknown): SiteConfigParseResult {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return failure("invalid_payload", "Request body must be a JSON object")
  }

  const values: Partial<Record<SiteConfigKey, string>> = {}

  for (const [key, value] of Object.entries(input)) {
    if (!Object.prototype.hasOwnProperty.call(CONFIG_RULES, key)) {
      return failure("unknown_config_key", `Unknown config key: ${key}`, key)
    }

    const normalized = normalizeValue(CONFIG_RULES[key as SiteConfigKey], value)
    if (normalized === null) {
      return failure("invalid_config_value", `Invalid value for config key: ${key}`, key)
    }

    values[key as SiteConfigKey] = normalized
  }

  return { ok: true, values }
}
