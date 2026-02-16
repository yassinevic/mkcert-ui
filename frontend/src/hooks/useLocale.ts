import { useSyncExternalStore } from "react";
import { getLocale, setLocale, subscribe, type Locale } from "../i18n";

export const useLocale = () => {
  const locale = useSyncExternalStore(subscribe, getLocale, getLocale);

  return {
    locale,
    setLocale: (next: Locale) => setLocale(next),
  };
};
