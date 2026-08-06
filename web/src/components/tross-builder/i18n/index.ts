/**
 * Tiny i18n layer.
 *
 * Deliberately not a library: the module has one namespace, so a typed
 * dictionary plus a `t()` that walks dot-paths is all that is needed — and it
 * costs nothing in the bundle. `uz.ts` and `ru.ts` are typed against `en.ts`,
 * so a missing key fails the build instead of rendering blank.
 *
 * The locale is *not* chosen here. The platform language switcher in the top
 * app bar owns that choice for the whole site; `useSyncPlatformLocale()` mirrors
 * it into this store so the module never disagrees with the shell around it.
 */

import { useEffect } from 'react'
import { create } from 'zustand'
import { en, type Dictionary } from './en'
import { ru } from './ru'
import { uz } from './uz'
import { useI18n } from '@/i18n'

export type Locale = 'en' | 'ru' | 'uz'

const DICTIONARIES: Record<Locale, Dictionary> = { en, ru, uz }

/** Uzbek is the platform default, so it is also the pre-hydration default. */
const DEFAULT_LOCALE: Locale = 'uz'

/** Dot-path lookup: `t('tool.select')`. */
type Leaves<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${P}${K}`
    : Leaves<T[K], `${P}${K}.`>
}[keyof T & string]

export type TranslationKey = Leaves<Dictionary>

function resolve(dict: Dictionary, key: string): string {
  let node: unknown = dict
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return key
    node = (node as Record<string, unknown>)[part]
  }
  return typeof node === 'string' ? node : key
}

interface I18nState {
  locale: Locale
  setLocale: (locale: Locale) => void
}

export const useI18nStore = create<I18nState>((set) => ({
  locale: DEFAULT_LOCALE,
  setLocale: (locale) => set({ locale }),
}))

/**
 * Mirrors the platform language into this module's store. Mount once, at the
 * module root — the platform provider already persists the choice, so this only
 * has to follow it.
 */
export function useSyncPlatformLocale() {
  const { lang } = useI18n()
  useEffect(() => {
    if (lang in DICTIONARIES) useI18nStore.getState().setLocale(lang as Locale)
  }, [lang])
}

/** `{name}` placeholders are replaced from `vars`. */
export function interpolate(text: string, vars?: Record<string, string | number>) {
  if (!vars) return text
  return text.replace(/\{(\w+)\}/g, (match, name) =>
    name in vars ? String(vars[name]) : match,
  )
}

export type TFunction = (key: TranslationKey, vars?: Record<string, string | number>) => string

/** Hook for components. Re-renders the caller when the locale changes. */
export function useT(): TFunction {
  const locale = useI18nStore((s) => s.locale)
  const dict = DICTIONARIES[locale]
  return (key, vars) => interpolate(resolve(dict, key), vars)
}

/** Non-reactive lookup, for code outside React (PDF export, worker replies). */
export function translate(
  key: TranslationKey,
  vars?: Record<string, string | number>,
): string {
  const dict = DICTIONARIES[useI18nStore.getState().locale]
  return interpolate(resolve(dict, key), vars)
}
