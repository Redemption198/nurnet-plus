// The UI's languages (nuxt.config i18n). Italian is the default, at the site's root; English at /en/
export type AppLocale = "it" | "en";

// The visitor's own choice of language (info sheet, or the offer toast), kept on the device
const LOCALE_STORAGE_KEY = "nurnet-locale";

export const isAppLocale = (value: unknown): value is AppLocale => value === "it" || value === "en";

// Storage can be missing or blocked (private windows, blocked site data): no choice then
export function readLocaleChoice(): AppLocale | null {
  try {
    const value = localStorage.getItem(LOCALE_STORAGE_KEY);
    return isAppLocale(value) ? value : null;
  } catch {
    return null;
  }
}

export function rememberLocale(locale: AppLocale) {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Not kept: the language still changes for this visit
  }
}

// The browser's languages, most wanted first: the first one the app has, English for the rest (a
// visitor whose browser is in German or French reads English more often than Italian)
export function preferredLocale(languages: readonly string[]): AppLocale {
  for (const language of languages) {
    const base = language.toLowerCase().split("-")[0];
    if (isAppLocale(base)) return base;
  }
  return "en";
}
