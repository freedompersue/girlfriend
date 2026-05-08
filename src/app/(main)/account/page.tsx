"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/hooks/useLocale";
import { useTheme } from "@/hooks/useTheme";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { PLANS, type PlanType } from "@/lib/billing-plans";

type BillingStatus = {
  plan: PlanType;
  credits: number;
  subscription: {
    status: string;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: string | null;
  } | null;
} | null;

export default function AccountPage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const { locale, setLocale, t } = useLocale();
  const { mode, setMode } = useTheme();
  const [billing, setBilling] = useState<BillingStatus>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
      return;
    }

    if (!user) return;

    fetch("/api/billing/status")
      .then((res) => res.json())
      .then((data) => setBilling(data))
      .catch(() => setBilling(null));
  }, [authLoading, router, user]);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const plan = billing?.plan || "free";
  const planName =
    locale === "en" ? PLANS[plan].nameEn : locale === "ja" ? PLANS[plan].nameJa : PLANS[plan].name;
  const displayName = user.name || user.username || user.email?.split("@")[0] || "You";
  const subtitle = user.email || user.username || "";
  const nextPath = user.selectedCharacterId ? "/chat" : "/select";

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-6 flex items-center justify-between gap-3">
          <button
            onClick={() => router.push(nextPath)}
            className="text-sm text-muted transition-colors hover:text-foreground"
          >
            ← {t("account.back")}
          </button>
          <div className="flex items-center gap-2">
            <LocaleSwitcher locale={locale} setLocale={setLocale} />
            <ThemeSwitcher
              mode={mode}
              setMode={setMode}
              labels={{ light: t("theme.light"), dark: t("theme.dark"), auto: t("theme.auto") }}
            />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-card-border bg-card-bg p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="h-24 w-24 overflow-hidden rounded-full ring-4 ring-primary/20">
                {user.image ? (
                  <img src={user.image} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary to-accent-pink text-3xl font-semibold text-white">
                    {displayName.slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm text-primary">{t("account.title")}</p>
                <h1 className="mt-1 text-3xl font-bold text-foreground">{displayName}</h1>
                {subtitle ? <p className="mt-2 truncate text-sm text-muted">{subtitle}</p> : null}
                <p className="mt-3 text-sm leading-6 text-muted">{t("account.subtitle")}</p>
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <InfoCard label={t("account.plan")} value={planName} />
              <InfoCard label={t("account.credits")} value={String(billing?.credits || 0)} />
              <InfoCard
                label={t("account.character")}
                value={user.selectedCharacter?.name || t("account.no_character")}
              />
              <InfoCard
                label={t("account.next_billing")}
                value={
                  billing?.subscription?.currentPeriodEnd
                    ? new Date(billing.subscription.currentPeriodEnd).toLocaleDateString(
                        locale === "en" ? "en-US" : locale === "ja" ? "ja-JP" : "zh-CN"
                      )
                    : "-"
                }
                detail={billing?.subscription?.cancelAtPeriodEnd ? t("account.cancel_at_period_end") : undefined}
              />
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-3xl border border-card-border bg-card-bg p-6">
              <h2 className="text-lg font-semibold text-foreground">{t("account.character")}</h2>
              {user.selectedCharacter ? (
                <div className="mt-4 flex items-center gap-4 rounded-2xl border border-card-border bg-surface/60 p-4">
                  <img
                    src={user.selectedCharacter.avatarUrl}
                    alt={user.selectedCharacter.name}
                    className="h-20 w-20 rounded-2xl object-cover"
                  />
                  <div className="min-w-0">
                    <p className="text-lg font-semibold">{user.selectedCharacter.name}</p>
                    <p className="text-sm text-muted">{user.selectedCharacter.subtitle}</p>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-card-border p-4 text-sm text-muted">
                  {t("account.no_character")}
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-card-border bg-card-bg p-6">
              <div className="grid gap-3">
                <ActionButton onClick={() => router.push(user.selectedCharacterId ? "/chat" : "/select")}>
                  {user.selectedCharacterId ? t("account.go_chat") : t("account.choose_character")}
                </ActionButton>
                <ActionButton onClick={() => router.push("/select")}>
                  {t("account.switch_character")}
                </ActionButton>
                <ActionButton onClick={() => router.push("/pricing")}>
                  {t("account.manage_plan")}
                </ActionButton>
                <ActionButton onClick={() => router.push("/integrations")}>
                  {t("account.integrations")}
                </ActionButton>
                <ActionButton onClick={logout} danger>
                  {t("account.sign_out")}
                </ActionButton>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function InfoCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-2xl border border-card-border bg-surface/60 p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
      {detail ? <p className="mt-1 text-xs text-primary">{detail}</p> : null}
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  danger = false,
}: {
  children: ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-medium transition-colors ${
        danger
          ? "border border-accent-rose/30 bg-accent-rose/10 text-accent-rose hover:bg-accent-rose/15"
          : "border border-card-border bg-surface/60 text-foreground hover:bg-surface"
      }`}
    >
      {children}
    </button>
  );
}
