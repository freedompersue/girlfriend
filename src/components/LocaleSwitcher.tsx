"use client";

import { type Locale, LOCALE_NAMES } from "@/lib/i18n";

export function LocaleSwitcher({
  locale,
  setLocale,
}: {
  locale: Locale;
  setLocale: (l: Locale) => void;
}) {
  const locales: Locale[] = ["zh", "en", "ja"];

  return (
    <div className="flex items-center bg-surface rounded-lg p-0.5 gap-0.5">
      {locales.map((l) => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          className={`px-2.5 py-1.5 rounded-md text-xs transition-all ${
            locale === l
              ? "bg-card-bg text-foreground shadow-sm"
              : "text-muted hover:text-foreground"
          }`}
        >
          {LOCALE_NAMES[l]}
        </button>
      ))}
    </div>
  );
}
