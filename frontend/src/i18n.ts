import en from "./i18n/en.json";
import fr from "./i18n/fr.json";
import ar from "./i18n/ar.json";

export type Locale = "en" | "fr" | "ar";

type FlatTranslations = Record<string, string>;
interface NestedTranslations {
  [key: string]: string | NestedTranslations;
}
type Translations = Record<Locale, FlatTranslations>;

type Vars = Record<string, string | number>;

const supportedLocales: Locale[] = ["en", "fr", "ar"];

const readStoredLocale = (): Locale => {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem("locale");
  if (stored && supportedLocales.includes(stored as Locale)) {
    return stored as Locale;
  }
  return "en";
};

let currentLocale: Locale = readStoredLocale();
const listeners = new Set<() => void>();

const interpolate = (template: string, vars?: Vars) => {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const value = vars[key];
    return value === undefined ? `{${key}}` : String(value);
  });
};

const validateNested = (
  source: NestedTranslations,
  prefix = "",
  errors: string[] = [],
) => {
  for (const [key, value] of Object.entries(source)) {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") continue;
    if (value && typeof value === "object") {
      validateNested(value as NestedTranslations, nextKey, errors);
    } else {
      errors.push(nextKey);
    }
  }
  return errors;
};

export const setLocale = (locale: Locale) => {
  currentLocale = locale;
  if (typeof window !== "undefined") {
    window.localStorage.setItem("locale", locale);
  }
  listeners.forEach((listener) => listener());
};

export const getLocale = (): Locale => currentLocale;

export const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const t = (key: string, vars?: Vars) => {
  const table = translations[currentLocale] || translations.en;
  const template = table[key] ?? translations.en[key] ?? key;
  return interpolate(template, vars);
};

const flatten = (
  source: NestedTranslations,
  prefix = "",
  out: FlatTranslations = {},
) => {
  for (const [key, value] of Object.entries(source)) {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      out[nextKey] = value;
    } else {
      flatten(value, nextKey, out);
    }
  }
  return out;
};

export const translations: Translations = {
  en: flatten(en as NestedTranslations),
  fr: flatten(fr as NestedTranslations),
  ar: flatten(ar as NestedTranslations),
};

const reportInvalid = (locale: Locale, source: NestedTranslations) => {
  const errors = validateNested(source);
  if (errors.length > 0) {
    console.warn(`i18n: invalid values in ${locale} at:`, errors);
  }
};

reportInvalid("en", en as NestedTranslations);
reportInvalid("fr", fr as NestedTranslations);
reportInvalid("ar", ar as NestedTranslations);
