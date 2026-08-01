import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import uz from './uz.js';
import ru from './ru.js';
import en from './en.js';

const DICTS = { uz, ru, en };
const STORAGE_KEY = 'hk_lang';

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem(STORAGE_KEY) || 'uz');

  const setLang = useCallback((next) => {
    if (!DICTS[next]) return;
    localStorage.setItem(STORAGE_KEY, next);
    setLangState(next);
  }, []);

  // t('catalog.title') -> tanlangan til -> uz -> kalitning o'zi
  const t = useCallback((key, vars) => {
    let s = DICTS[lang]?.[key] ?? DICTS.uz[key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        s = String(s).replaceAll(`{${k}}`, v);
      }
    }
    return s;
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n I18nProvider ichida ishlatilishi kerak');
  return ctx;
}
