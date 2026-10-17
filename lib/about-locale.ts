import type { Locale } from "./i18n"
import { resolveLocale } from "./locale-direction"

/** Requested locale first, then English, then Chinese as the last resort. */
export const ABOUT_FALLBACK_LOCALES: readonly Locale[] = ["en", "zh"]

export function getAboutLocaleCandidates(value: unknown): Locale[] {
  const candidates: Locale[] = [resolveLocale(value)]
  for (const fallback of ABOUT_FALLBACK_LOCALES) {
    if (!candidates.includes(fallback)) candidates.push(fallback)
  }
  return candidates
}

export function hasAboutContent(value: unknown): boolean {
  if (!value || typeof value !== "object") return false
  const content = value as Record<string, unknown>
  const textFields = ["name", "bio", "avatar", "markdown"]
  if (textFields.some(field => typeof content[field] === "string" && (content[field] as string).trim().length > 0)) {
    return true
  }
  const links = content.links
  return typeof links === "object" && links !== null && Object.keys(links).length > 0
}
