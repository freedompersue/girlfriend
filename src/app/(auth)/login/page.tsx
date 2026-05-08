"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTheme } from "@/hooks/useTheme";
import { useLocale } from "@/hooks/useLocale";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { SocialLoginButtons } from "@/components/SocialLoginButtons";

export default function LoginPage() {
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { mode, setMode } = useTheme();
  const { locale, setLocale, t } = useLocale();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t("auth.login"));
        return;
      }

      if (data.user.selectedCharacterId) {
        router.push("/chat");
      } else {
        router.push("/select");
      }
    } catch {
      setError(t("auth.network_error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center justify-between gap-3 p-4">
        <Link href="/" className="text-sm text-muted hover:text-foreground transition-colors">
          ← {t("auth.back_home")}
        </Link>
        <LocaleSwitcher locale={locale} setLocale={setLocale} />
        <ThemeSwitcher
          mode={mode}
          setMode={setMode}
          labels={{ light: t("theme.light"), dark: t("theme.dark"), auto: t("theme.auto") }}
        />
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-5xl animate-slide-up">
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-3xl border border-card-border bg-card-bg p-8 lg:p-10">
              <div className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs text-primary">
                {t("auth.progress_title")}
              </div>
              <div className="mt-6">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-light to-accent-pink bg-clip-text text-transparent">
                  {t("app.name")}
                </h1>
                <p className="text-muted mt-3 text-sm leading-6">{t("auth.login_hint")}</p>
              </div>
              <div className="mt-8 space-y-4">
                {[t("auth.progress_login"), t("auth.progress_select"), t("auth.progress_chat")].map((item, index) => (
                  <div key={item} className="flex items-center gap-4 rounded-2xl border border-card-border bg-surface/60 px-4 py-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-r from-primary to-accent-pink text-sm font-semibold text-white">
                      {index + 1}
                    </div>
                    <p className="text-sm text-foreground">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card-bg border border-card-border rounded-2xl p-8">
              <h2 className="text-xl font-semibold mb-2 text-center">
                {t("auth.login")}
              </h2>
              <p className="mb-6 text-center text-sm text-muted">{t("app.tagline")}</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-muted mb-1.5">
                    {t("auth.account")}
                  </label>
                  <input
                    type="text"
                    value={account}
                    onChange={(e) => setAccount(e.target.value)}
                    className="w-full px-4 py-3 bg-input-bg border border-card-border rounded-xl text-foreground placeholder-muted/50 focus:outline-none focus:border-primary transition-colors"
                    placeholder={t("auth.account_placeholder")}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-muted mb-1.5">
                    {t("auth.password")}
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-input-bg border border-card-border rounded-xl text-foreground placeholder-muted/50 focus:outline-none focus:border-primary transition-colors"
                    placeholder={t("auth.password_placeholder")}
                    required
                  />
                </div>

                {error && (
                  <p className="text-accent-rose text-sm text-center">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {loading ? t("auth.logging_in") : t("auth.login")}
                </button>
              </form>

              <SocialLoginButtons t={t} callbackURL="/select" />

              <p className="text-center text-muted text-sm mt-6">
                {t("auth.no_account")}{" "}
                <Link
                  href="/register"
                  className="text-primary-light hover:underline"
                >
                  {t("auth.register")}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
