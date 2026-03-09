import enAdmin from "./en/admin.json";
import enPublic from "./en/public.json";
import thAdmin from "./th/admin.json";
import thPublic from "./th/public.json";

export type Locale = "th" | "en";

/* ------------------------------------------------------------------ */
/*  Flatten nested JSON into dot-separated keys                       */
/*  e.g. { sidebar: { title: "X" } } → { "sidebar.title": "X" }     */
/* ------------------------------------------------------------------ */
function flatten(obj: Record<string, unknown>, prefix = ""): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      Object.assign(result, flatten(value as Record<string, unknown>, fullKey));
    } else {
      result[fullKey] = String(value);
    }
  }

  return result;
}

const dictionaries: Record<Locale, Record<string, string>> = {
  en: { ...enPublic, ...flatten(enAdmin) },
  th: { ...thPublic, ...flatten(thAdmin) },
};

/* Legacy module-level locale for non-React code (public map, etc.) */
let currentLocale: Locale = "th";

export function setLocale(locale: Locale) {
  currentLocale = locale;
}

export function t(key: string): string {
  return dictionaries[currentLocale]?.[key] ?? dictionaries.th[key] ?? key;
}

/* Used by the React LocaleProvider */
export function getTranslation(locale: Locale, key: string): string {
  return dictionaries[locale]?.[key] ?? dictionaries.th[key] ?? key;
}

export { dictionaries };