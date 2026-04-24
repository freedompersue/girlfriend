"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useLocale } from "@/hooks/useLocale";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";

interface Character {
  id: string;
  name: string;
  subtitle: string;
  tags: string[];
  description: string;
  avatarUrl: string;
}

const TAG_COLORS = [
  "from-purple-500/20 to-purple-600/20 text-purple-400 dark:text-purple-300 border-purple-500/30",
  "from-pink-500/20 to-pink-600/20 text-pink-400 dark:text-pink-300 border-pink-500/30",
  "from-blue-500/20 to-blue-600/20 text-blue-400 dark:text-blue-300 border-blue-500/30",
];

const CARD_GRADIENTS = [
  "from-purple-200/60 to-indigo-200/60 dark:from-purple-900/40 dark:to-indigo-900/40",
  "from-pink-200/60 to-rose-200/60 dark:from-pink-900/40 dark:to-rose-900/40",
  "from-blue-200/60 to-cyan-200/60 dark:from-blue-900/40 dark:to-cyan-900/40",
  "from-amber-200/60 to-orange-200/60 dark:from-amber-900/40 dark:to-orange-900/40",
];

const AVATAR_EMOJIS = ["🎓", "🌸", "📖", "🎨"];

export default function SelectPage() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { mode, setMode } = useTheme();
  const { locale, setLocale, t } = useLocale();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
      return;
    }
    fetch("/api/characters")
      .then((res) => res.json())
      .then((data) => setCharacters(data.characters || []))
      .catch(console.error);
  }, [user, authLoading, router]);

  const handleSelect = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const res = await fetch("/api/user/select-character", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId: selected }),
      });
      if (res.ok) {
        router.push("/chat");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center justify-end gap-2 p-4">
        <LocaleSwitcher locale={locale} setLocale={setLocale} />
        <ThemeSwitcher
          mode={mode}
          setMode={setMode}
          labels={{ light: t("theme.light"), dark: t("theme.dark"), auto: t("theme.auto") }}
        />
      </div>

      <div className="flex-1 flex flex-col items-center px-4 pb-8">
        <div className="w-full max-w-4xl animate-slide-up">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-light to-accent-pink bg-clip-text text-transparent">
              {t("select.title")}
            </h1>
            <p className="text-muted mt-2">{t("select.subtitle")}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {characters.map((char, index) => (
              <button
                key={char.id}
                onClick={() => setSelected(char.id)}
                className={`relative text-left p-6 rounded-2xl border-2 transition-all duration-300 ${
                  selected === char.id
                    ? "border-primary bg-gradient-to-br from-primary/10 to-primary-dark/10 shadow-lg shadow-primary/20 scale-[1.02]"
                    : "border-card-border bg-card-bg hover:border-primary/50"
                }`}
              >
                {selected === char.id && (
                  <div className="absolute top-3 right-3 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                )}

                <div className="flex items-start gap-4">
                  <div
                    className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${CARD_GRADIENTS[index % 4]} flex items-center justify-center text-3xl shrink-0`}
                  >
                    {AVATAR_EMOJIS[index % 4]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold">{char.name}</h3>
                      <span className="text-xs text-muted bg-surface px-2 py-0.5 rounded-full">
                        {char.subtitle}
                      </span>
                    </div>
                    <p className="text-sm text-muted/80 line-clamp-2 mb-3">
                      {char.description}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {char.tags.map((tag, tagIndex) => (
                        <span
                          key={tag}
                          className={`text-xs px-2.5 py-1 rounded-full bg-gradient-to-r border ${TAG_COLORS[tagIndex % 3]}`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {characters.length === 0 && (
            <div className="text-center py-16 text-muted">
              <p>{t("select.loading")}</p>
            </div>
          )}

          <div className="mt-8 flex justify-center">
            <button
              onClick={handleSelect}
              disabled={!selected || loading}
              className="px-12 py-3 bg-gradient-to-r from-primary to-accent-pink text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {loading ? t("select.confirming") : t("select.confirm")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
