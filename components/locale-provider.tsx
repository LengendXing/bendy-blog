"use client"
import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { Locale, getTranslations, rtlLocales } from "@/lib/i18n"

type LocaleCtx = {
  locale: Locale
  setLocale: (l: Locale) => void
  t: ReturnType<typeof getTranslations>
  dir: "ltr" | "rtl"
}

const Ctx = createContext<LocaleCtx>({
  locale: "zh",
  setLocale: () => {},
  t: getTranslations("zh"),
  dir: "ltr",
})

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("zh")

  useEffect(() => {
    const saved = localStorage.getItem("locale") as Locale
    if (saved) setLocaleState(saved)
  }, [])

  function setLocale(l: Locale) {
    setLocaleState(l)
    localStorage.setItem("locale", l)
    document.documentElement.dir = rtlLocales.includes(l) ? "rtl" : "ltr"
  }

  const t = getTranslations(locale)
  const dir = rtlLocales.includes(locale) ? "rtl" : "ltr"

  return <Ctx.Provider value={{ locale, setLocale, t, dir }}>{children}</Ctx.Provider>
}

export const useLocale = () => useContext(Ctx)
