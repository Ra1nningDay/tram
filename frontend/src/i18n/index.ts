import th from "./th.json";
import en from "./en.json";

export type Locale = "th" | "en";

const dictionaries: Record<Locale, Record<string, string>> = { th, en };
let currentLocale: Locale = "th";

export function setLocale(locale: Locale) {
  currentLocale = locale;
}

export function t(key: string): string {
  return dictionaries[currentLocale]?.[key] ?? dictionaries.th[key] ?? key;
}