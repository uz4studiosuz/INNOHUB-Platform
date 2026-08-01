"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { PLATFORM_UZ, PLATFORM_RU, PLATFORM_EN, type Dict } from "./platform";
import HARDWARE_UZ from "@/components/hardware/i18n/uz.js";
import HARDWARE_RU from "@/components/hardware/i18n/ru.js";
import HARDWARE_EN from "@/components/hardware/i18n/en.js";

export const LANGUAGES = [
  { code: "uz", label: "UZ", name: "O‘zbekcha" },
  { code: "ru", label: "RU", name: "Русский" },
  { code: "en", label: "EN", name: "English" },
] as const;

export type Lang = (typeof LANGUAGES)[number]["code"];

/**
 * One dictionary per language for the whole platform. The 3D Konstruktor
 * brought its own translations with it and its keys are namespaced
 * (`header.*`, `catalog.*`, `ldraw.*`), so they merge in flat rather than
 * being ported - and its components keep calling the same t() they always did.
 */
const DICTS: Record<Lang, Dict> = {
  uz: { ...PLATFORM_UZ, ...(HARDWARE_UZ as Dict) },
  ru: { ...PLATFORM_RU, ...(HARDWARE_RU as Dict) },
  en: { ...PLATFORM_EN, ...(HARDWARE_EN as Dict) },
};

const STORAGE_KEY = "innohub_lang";

interface I18nValue {
  lang: Lang;
  setLang: (next: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // Always start on Uzbek. The stored choice cannot be read while rendering:
  // the server has no localStorage, so seeding state from it would make the
  // server and the browser disagree on every label at once. The effect below
  // applies the saved language immediately after mount instead.
  const [lang, setLangState] = useState<Lang>("uz");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && saved in DICTS) setLangState(saved as Lang);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    if (!(next in DICTS)) return;
    window.localStorage.setItem(STORAGE_KEY, next);
    setLangState(next);
  }, []);

  // t('nav.main') -> chosen language -> Uzbek -> the key itself, so a missing
  // translation degrades to the source language rather than to debug output.
  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      let s = DICTS[lang][key] ?? DICTS.uz[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          s = s.replaceAll(`{${k}}`, String(v));
        }
      }
      return s;
    },
    [lang]
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
