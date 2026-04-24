"use client";

import { useState, useEffect, useCallback } from "react";
import { type Locale, t as translate } from "@/lib/i18n";

export function useLocale() {
  const [locale, setLocaleState] = useState<Locale>("zh");

  useEffect(() => {
    const saved = localStorage.getItem("locale") as Locale | null;
    if (saved && ["zh", "en", "ja"].includes(saved)) {
      setLocaleState(saved);
    } else {
      const lang = navigator.language.toLowerCase();
      if (lang.startsWith("ja")) setLocaleState("ja");
      else if (lang.startsWith("en")) setLocaleState("en");
      else setLocaleState("zh");
    }
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("locale", l);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string>) => translate(locale, key, params),
    [locale]
  );

  return { locale, setLocale, t };
}
