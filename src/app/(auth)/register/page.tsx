"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Turnstile } from "@marsidev/react-turnstile";
import { useTheme } from "@/hooks/useTheme";
import { useLocale } from "@/hooks/useLocale";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { SocialLoginButtons } from "@/components/SocialLoginButtons";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string>("");
  const router = useRouter();
  const { mode, setMode } = useTheme();
  const { locale, setLocale, t } = useLocale();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email: email || undefined, password, name, turnstileToken }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t("auth.register"));
        return;
      }

      router.push("/select");
    } catch {
      setError(t("auth.network_error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex-1 flex flex-col min-h-screen overflow-hidden">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-background" />
        <div className="absolute top-[-15%] left-[-10%] w-[55vw] h-[55vw] rounded-full bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.18),transparent_60%)] blur-3xl" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-[radial-gradient(circle_at_center,rgba(244,114,182,0.14),transparent_60%)] blur-3xl" />
      </div>

      <div className="flex items-center justify-between gap-3 p-4 md:p-6">
        <Link href="/" className="text-sm text-muted hover:text-foreground transition-colors">
          ← {t("auth.back_home")}
        </Link>
        <div className="flex items-center gap-2">
          <LocaleSwitcher locale={locale} setLocale={setLocale} />
          <ThemeSwitcher
            mode={mode}
            setMode={setMode}
            labels={{ light: t("theme.light"), dark: t("theme.dark"), auto: t("theme.auto") }}
          />
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 pb-10">
        <div className="w-full max-w-md animate-slide-up">
          <div className="mb-6 flex items-center justify-center gap-2 text-[11px] tracking-wider uppercase text-muted">
            <span className="text-primary font-semibold">{t("auth.progress_login")}</span>
            <span className="opacity-40">→</span>
            <span>{t("auth.progress_select")}</span>
            <span className="opacity-40">→</span>
            <span>{t("auth.progress_chat")}</span>
          </div>

          <div className="rounded-3xl border border-card-border bg-card-bg/80 backdrop-blur-xl p-7 sm:p-9 shadow-xl shadow-primary/5">
            <div className="text-center mb-7">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-light to-accent-pink bg-clip-text text-transparent">
                {t("app.name")}
              </h1>
              <p className="text-muted mt-2 text-sm leading-6">{t("auth.register_hint")}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">
                  {t("auth.username")} <span className="text-accent-rose">*</span>
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-input-bg border border-card-border rounded-xl text-foreground placeholder-muted/50 focus:outline-none focus:border-primary transition-colors"
                  placeholder={t("auth.username_placeholder")}
                  required
                  minLength={2}
                  maxLength={20}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5">
                    {t("auth.nickname")}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 bg-input-bg border border-card-border rounded-xl text-foreground placeholder-muted/50 focus:outline-none focus:border-primary transition-colors"
                    placeholder={t("auth.nickname_placeholder")}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5">
                    {t("auth.email")}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-input-bg border border-card-border rounded-xl text-foreground placeholder-muted/50 focus:outline-none focus:border-primary transition-colors"
                    placeholder={t("auth.email_placeholder")}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">
                  {t("auth.password")}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-input-bg border border-card-border rounded-xl text-foreground placeholder-muted/50 focus:outline-none focus:border-primary transition-colors"
                  placeholder={t("auth.password_hint")}
                  required
                  minLength={6}
                />
              </div>

              {error && (
                <p className="text-accent-rose text-sm text-center">{error}</p>
              )}

              <Turnstile
                siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
                onSuccess={(token) => {
                  setTurnstileToken(token);
                }}
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-primary to-accent-pink text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg shadow-primary/20"
              >
                {loading ? t("auth.registering") : t("auth.create_account")}
              </button>
            </form>

            <SocialLoginButtons t={t} callbackURL="/select" />

            <p className="text-center text-muted text-sm mt-6">
              {t("auth.has_account")}{" "}
              <Link
                href="/login"
                className="text-primary-light hover:underline font-medium"
              >
                {t("auth.login")}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
