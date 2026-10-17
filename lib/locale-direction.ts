import { locales, rtlLocales, type Locale } from "./i18n"

export type TextDirection = "ltr" | "rtl"

export const LOCALE_STORAGE_KEY = "locale"
export const DEFAULT_LOCALE: Locale = "zh"

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value)
}

export function resolveLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE
}

export function getTextDirection(locale: Locale): TextDirection {
  return rtlLocales.includes(locale) ? "rtl" : "ltr"
}

type DirectionTarget = { dir: string }

export function applyDocumentDirection(locale: Locale, root: DirectionTarget): void {
  root.dir = getTextDirection(locale)
}

export function buildLocaleInitScript(): string {
  const storageKey = JSON.stringify(LOCALE_STORAGE_KEY)
  const rtl = JSON.stringify(rtlLocales)
  return `(function(){try{var l=window.localStorage.getItem(${storageKey});var r=${rtl};document.documentElement.dir=r.indexOf(l)>-1?"rtl":"ltr";}catch(e){}})();`
}
