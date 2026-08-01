/**
 * The 3D Konstruktor used to carry its own provider, its own storage key and
 * its own language switcher - which meant switching the platform to Russian
 * left this one module in Uzbek.
 *
 * Its dictionaries now merge into the platform's, so this file is only the
 * seam: every component below still imports useI18n from here and calls the
 * same t(), but the language they read is the one the whole platform is on.
 */
export { useI18n } from "@/i18n";

/**
 * Kept so the module can still be mounted on its own. The platform already
 * wraps everything in the real provider, and nesting one is not needed, so
 * this is a pass-through rather than a second context.
 */
export function I18nProvider({ children }) {
  return children;
}
