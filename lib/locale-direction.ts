import { locales, rtlLocales, type Locale } from "./i18n"

export type TextDirection = "ltr" | "rtl"

export const LOCALE_STORAGE_KEY = "locale"
export const DEFAULT_LOCALE: Locale = "zh"

export const htmlLangs: Record<Locale, string> = {
  zh: "zh-CN", mn: "mn", ug: "ug", bo: "bo", en: "en",
  ar: "ar", ru: "ru", ja: "ja", ko: "ko",
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value)
}

export function resolveLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE
}

export function getTextDirection(locale: Locale): TextDirection {
  return rtlLocales.includes(locale) ? "rtl" : "ltr"
}

type LocaleRoot = { dir: string; lang: string }

export function applyDocumentLocale(locale: Locale, root: LocaleRoot): void {
  root.dir = getTextDirection(locale)
  root.lang = htmlLangs[locale]
}

/**
 * Runs before hydration so a saved RTL locale never flashes or stays LTR
 * after a refresh. Kept as a plain string: it must not depend on React state.
 */
export function buildLocaleInitScript(): string {
  const storageKey = JSON.stringify(LOCALE_STORAGE_KEY)
  const localeList = JSON.stringify(locales)
  const rtlList = JSON.stringify(rtlLocales)
  const langs = JSON.stringify(htmlLangs)
  return `(function(){try{var l=window.localStorage.getItem(${storageKey});if(${localeList}.indexOf(l)<0){l="zh";}var d=document.documentElement;d.lang=${langs}[l]||"zh-CN";d.dir=${rtlList}.indexOf(l)>-1?"rtl":"ltr";}catch(e){}})();`
}
