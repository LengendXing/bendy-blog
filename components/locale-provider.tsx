"use client"
import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { Locale, getTranslations } from "@/lib/i18n"
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  applyDocumentLocale,
  getTextDirection,
  resolveLocale,
} from "@/lib/locale-direction"

type LocaleCtx = {
  locale: Locale
  setLocale: (l: Locale) => void
  t: ReturnType<typeof getTranslations>
  dir: "ltr" | "rtl"
}

const Ctx = createContext<LocaleCtx>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: getTranslations(DEFAULT_LOCALE),
  dir: "ltr",
})

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE)

  useEffect(() => {
    const saved = resolveLocale(localStorage.getItem(LOCALE_STORAGE_KEY))
    setLocaleState(saved)
    applyDocumentLocale(saved, document.documentElement)
  }, [])

  function setLocale(l: Locale) {
    setLocaleState(l)
    localStorage.setItem(LOCALE_STORAGE_KEY, l)
    applyDocumentLocale(l, document.documentElement)
  }

  const t = getTranslations(locale)
  const dir = getTextDirection(locale)

  return <Ctx.Provider value={{ locale, setLocale, t, dir }}>{children}</Ctx.Provider>
}

export const useLocale = () => useContext(Ctx)
