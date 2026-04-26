"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "@/hooks/useLocale";
import { PLANS, CREDIT_PACKS, type PlanType, type PlanConfig } from "@/lib/billing-plans";

export default function PricingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-pulse text-muted-foreground">Loading...</div></div>}>
      <PricingContent />
    </Suspense>
  );
}

function PricingContent() {
  const { locale, t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [currentPlan, setCurrentPlan] = useState<PlanType>("free");
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const success = searchParams.get("success");
    const creditsSuccess = searchParams.get("credits_success");
    const canceled = searchParams.get("canceled");

    if (success) setToast(t("pricing.success"));
    else if (creditsSuccess) setToast(t("pricing.credits_success"));
    else if (canceled) setToast(t("pricing.canceled"));

    if (success || creditsSuccess || canceled) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, t]);

  useEffect(() => {
    fetch("/api/billing/status")
      .then((r) => r.json())
      .then((data) => {
        setCurrentPlan(data.plan || "free");
        setCredits(data.credits || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSubscribe = async (planId: PlanType) => {
    setCheckoutLoading(planId);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "subscription", planId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setToast(data.error || "错误");
    } catch {
      setToast("网络错误");
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleBuyCredits = async (packId: string) => {
    setCheckoutLoading(packId);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "credits", packId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setToast(data.error || "错误");
    } catch {
      setToast("网络错误");
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    setCheckoutLoading("portal");
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      setToast("网络错误");
    } finally {
      setCheckoutLoading(null);
    }
  };

  const getPlanName = (plan: PlanConfig) => {
    if (locale === "en") return plan.nameEn;
    if (locale === "ja") return plan.nameJa;
    return plan.name;
  };

  const getPlanFeatures = (plan: PlanConfig) => {
    if (locale === "en") return plan.featuresEn;
    if (locale === "ja") return plan.featuresJa;
    return plan.features;
  };

  const plans = (["free", "plus", "pro"] as PlanType[]).map((id) => PLANS[id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">{t("app.loading")}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-primary text-primary-foreground rounded-xl shadow-lg animate-in fade-in slide-in-from-top-2">
          {toast}
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => router.back()}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            ← {t("pricing.back")}
          </button>
          {currentPlan !== "free" && (
            <button
              onClick={handleManageSubscription}
              disabled={checkoutLoading === "portal"}
              className="text-sm px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-50"
            >
              {checkoutLoading === "portal" ? "..." : t("pricing.manage")}
            </button>
          )}
        </div>

        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-2">{t("pricing.title")}</h1>
          <p className="text-muted-foreground">{t("pricing.subtitle")}</p>
        </div>

        {/* Subscription Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {plans.map((plan) => {
            const isCurrent = plan.id === currentPlan;
            const isPopular = plan.id === "plus";
            const isUpgrade = plan.id !== "free" && !isCurrent && (plan.id === "pro" || currentPlan === "free");

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border p-6 flex flex-col transition-all ${
                  isPopular
                    ? "border-primary bg-primary/5 shadow-lg shadow-primary/10 scale-[1.02]"
                    : "border-border bg-card"
                } ${isCurrent ? "ring-2 ring-primary/50" : ""}`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full">
                    {t("pricing.popular")}
                  </div>
                )}

                {isCurrent && (
                  <div className="absolute -top-3 right-4 px-3 py-1 bg-green-500 text-white text-xs font-semibold rounded-full">
                    {t("pricing.current")}
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="text-xl font-bold mb-1">{getPlanName(plan)}</h3>
                  <div className="flex items-baseline gap-1">
                    {plan.price === 0 ? (
                      <span className="text-3xl font-bold">{t("pricing.free")}</span>
                    ) : (
                      <>
                        <span className="text-3xl font-bold">
                          {locale === "en" ? `$${(plan.price / 700).toFixed(0)}` : locale === "ja" ? `¥${Math.floor(plan.price / 5)}` : `¥${plan.price / 100}`}
                        </span>
                        <span className="text-muted-foreground">/{t("pricing.month")}</span>
                      </>
                    )}
                  </div>
                </div>

                <ul className="flex-1 space-y-3 mb-6">
                  {getPlanFeatures(plan).map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => isUpgrade && handleSubscribe(plan.id)}
                  disabled={isCurrent || !isUpgrade || !!checkoutLoading}
                  className={`w-full py-3 rounded-xl font-medium transition-all ${
                    isCurrent
                      ? "bg-muted text-muted-foreground cursor-default"
                      : isUpgrade
                        ? isPopular
                          ? "bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98]"
                          : "bg-foreground text-background hover:opacity-90 active:scale-[0.98]"
                        : "bg-muted text-muted-foreground cursor-default"
                  } disabled:opacity-50`}
                >
                  {checkoutLoading === plan.id
                    ? "..."
                    : isCurrent
                      ? t("pricing.subscribed")
                      : plan.id === "free"
                        ? t("pricing.free")
                        : isUpgrade
                          ? t("pricing.subscribe")
                          : t("pricing.subscribed")}
                </button>
              </div>
            );
          })}
        </div>

        {/* Credit Store */}
        <div className="mb-10">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">{t("pricing.credits_title")}</h2>
            <p className="text-muted-foreground">{t("pricing.credits_subtitle")}</p>
            <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full text-sm font-medium">
              <span>💎</span>
              {t("pricing.balance")}: {credits}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {CREDIT_PACKS.map((pack) => (
              <div
                key={pack.id}
                className="rounded-2xl border border-border bg-card p-5 flex flex-col items-center hover:border-primary/50 transition-colors"
              >
                <div className="text-3xl mb-2">💎</div>
                <div className="text-2xl font-bold mb-1">{pack.credits}</div>
                <div className="text-xs text-muted-foreground mb-1">{t("pricing.per_credit")}</div>
                {pack.bonus && (
                  <div className="text-xs text-amber-500 font-medium mb-2">
                    {t("pricing.bonus", { n: pack.bonus.replace("赠", "") })}
                  </div>
                )}
                <div className="text-lg font-bold mb-3">
                  {locale === "en" ? `$${(pack.price / 700).toFixed(2)}` : locale === "ja" ? `¥${Math.floor(pack.price / 5)}` : pack.priceDisplay}
                </div>
                <button
                  onClick={() => handleBuyCredits(pack.id)}
                  disabled={!!checkoutLoading}
                  className="w-full py-2 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-600 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {checkoutLoading === pack.id ? "..." : t("pricing.buy_credits")}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Credit Usage Guide */}
        <div className="max-w-3xl mx-auto rounded-2xl border border-border bg-card/50 p-6">
          <h3 className="font-semibold mb-4">
            {locale === "en" ? "What can credits do?" : locale === "ja" ? "クレジットの使い道" : "积分可以做什么？"}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: "📸", label: locale === "en" ? "AI Photo" : locale === "ja" ? "AI写真" : "AI 生成照片", cost: 5 },
              { icon: "🎙️", label: locale === "en" ? "Long Voice" : locale === "ja" ? "長い音声" : "长语音消息", cost: 10 },
              { icon: "🌙", label: locale === "en" ? "Goodnight Radio" : locale === "ja" ? "おやすみラジオ" : "晚安电台", cost: 3 },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <div className="text-sm font-medium">{item.label}</div>
                  <div className="text-xs text-muted-foreground">{t("pricing.credit_cost", { n: String(item.cost) })}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
