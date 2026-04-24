"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTheme } from "@/hooks/useTheme";
import { useLocale } from "@/hooks/useLocale";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
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
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
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
    <div className="flex-1 flex flex-col">
      <div className="flex items-center justify-end gap-2 p-4">
        <LocaleSwitcher locale={locale} setLocale={setLocale} />
        <ThemeSwitcher
          mode={mode}
          setMode={setMode}
          labels={{ light: t("theme.light"), dark: t("theme.dark"), auto: t("theme.auto") }}
        />
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm animate-slide-up">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-light to-accent-pink bg-clip-text text-transparent">
              {t("app.name")}
            </h1>
            <p className="text-muted mt-2 text-sm">
              {t("auth.register_tagline")}
            </p>
          </div>

          <div className="bg-card-bg border border-card-border rounded-2xl p-8">
            <h2 className="text-xl font-semibold mb-6 text-center">
              {t("auth.register")}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-muted mb-1.5">
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
                <label className="block text-sm text-muted mb-1.5">
                  {t("auth.email")}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-input-bg border border-card-border rounded-xl text-foreground placeholder-muted/50 focus:outline-none focus:border-primary transition-colors"
                  placeholder={t("auth.email_placeholder")}
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
                  placeholder={t("auth.password_hint")}
                  required
                  minLength={6}
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
                {loading ? t("auth.registering") : t("auth.create_account")}
              </button>
            </form>

            <p className="text-center text-muted text-sm mt-6">
              {t("auth.has_account")}{" "}
              <Link
                href="/login"
                className="text-primary-light hover:underline"
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
