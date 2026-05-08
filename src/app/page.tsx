"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/hooks/useLocale";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import {
  ArrowRight,
  Sparkles,
  Brain,
  Heart,
  MessageCircle,
  Calendar,
  Moon,
  Crown,
  Link2,
} from "lucide-react";
import { CHARACTER_DATA } from "@/lib/characters";
import { CHARACTER_LOCALES } from "@/lib/character-i18n";

export default function Home() {
  const { user, loading } = useAuth();
  const { locale, setLocale, t } = useLocale();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (user) {
      router.replace(user.selectedCharacterId ? "/chat" : "/select");
    }
  }, [user, loading, router]);

  if (loading || user) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0a0612]">
        <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  const characters = CHARACTER_DATA.map((character) => {
    const localized = CHARACTER_LOCALES[character.name]?.[locale];
    return {
      ...character,
      name: localized?.name || character.name,
      subtitle: localized?.subtitle || character.subtitle,
      tags: localized?.tags || character.tags,
    };
  });

  return (
    <div className="landing-root min-h-screen w-full overflow-x-hidden bg-[#0a0612] text-white">
      {/* Decorative ambient gradients */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute top-[-15%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.28),transparent_60%)] blur-3xl" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[55vw] h-[55vw] rounded-full bg-[radial-gradient(circle_at_center,rgba(244,114,182,0.20),transparent_60%)] blur-3xl" />
        <div className="absolute top-[40%] left-[40%] w-[40vw] h-[40vw] rounded-full bg-[radial-gradient(circle_at_center,rgba(96,165,250,0.12),transparent_60%)] blur-3xl" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 stitchTiles=%22stitch%22/><feColorMatrix values=%220 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.04 0%22/></filter><rect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/></svg>')] opacity-40 mix-blend-overlay" />
      </div>

      {/* Nav */}
      <header className="relative z-20 max-w-6xl mx-auto px-6 md:px-10 pt-7 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-400 via-fuchsia-400 to-rose-400 shadow-lg shadow-fuchsia-500/30" />
          <span className="text-white/95 font-semibold tracking-wide">{t("app.name")}</span>
          <span className="hidden md:inline text-white/40 text-xs ml-2 tracking-widest uppercase">SheZai</span>
        </div>
        <nav className="flex items-center gap-2 md:gap-4 text-sm">
          <a href="#characters" className="hidden md:inline text-white/60 hover:text-white transition-colors">{t("landing.nav.characters")}</a>
          <a href="#features" className="hidden md:inline text-white/60 hover:text-white transition-colors">{t("landing.nav.features")}</a>
          <a href="#philosophy" className="hidden md:inline text-white/60 hover:text-white transition-colors">{t("landing.nav.philosophy")}</a>
          <LocaleSwitcher locale={locale} setLocale={setLocale} />
          <Link href="/login" className="px-3 py-1.5 rounded-full text-white/80 hover:text-white text-sm transition-colors">
            {t("auth.login")}
          </Link>
          <Link href="/register" className="px-4 py-1.5 rounded-full bg-white text-[#1a0b2e] text-sm font-medium hover:bg-white/90 transition-colors shadow-lg shadow-black/20">
            {t("landing.start")}
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 md:px-10 pt-20 md:pt-28 pb-20 md:pb-32">
        <div className={`flex flex-col items-center text-center transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/15 bg-white/5 backdrop-blur-md text-white/70 text-xs mb-8">
            <Sparkles size={12} className="text-fuchsia-300" />
            <span>{t("landing.hero_badge")}</span>
          </div>

          <h1 className="font-serif text-5xl md:text-7xl lg:text-[88px] leading-[1.05] text-white tracking-tight">
            <span className="block">{t("landing.hero_line1")}</span>
            <span className="block bg-gradient-to-r from-violet-200 via-fuchsia-200 to-rose-200 bg-clip-text text-transparent">
              {t("landing.hero_line2")}
            </span>
          </h1>

          <p className="mt-7 max-w-xl text-white/60 text-base md:text-lg leading-relaxed">
            {t("landing.hero_desc1")}
            <br className="hidden md:block" />
            {t("landing.hero_desc2")}
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center gap-3">
            <Link href="/register" className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-white text-[#1a0b2e] font-medium hover:scale-[1.02] active:scale-[0.99] transition-transform shadow-2xl shadow-fuchsia-500/20">
              {t("landing.primary_cta")}
              <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <a href="#characters" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full border border-white/15 bg-white/5 backdrop-blur-md text-white/80 hover:text-white hover:bg-white/10 transition-colors">
              {t("landing.secondary_cta")}
            </a>
          </div>

          <div className="mt-14 flex items-center gap-6 text-white/40 text-xs">
            <span>{t("landing.proof_no_ads")}</span>
            <span>{t("landing.proof_memory")}</span>
            <span>{t("landing.proof_delete")}</span>
          </div>
        </div>
      </section>

      <section className="relative z-10 max-w-6xl mx-auto px-6 md:px-10 pb-24 md:pb-28">
        <div className="mb-8 text-center">
          <p className="text-fuchsia-300/80 text-xs tracking-[0.2em] uppercase mb-3">{t("landing.flow_kicker")}</p>
          <h2 className="font-serif text-3xl md:text-4xl text-white tracking-tight">{t("landing.flow_title")}</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { step: "01", title: t("landing.flow_step1_title"), desc: t("landing.flow_step1_desc") },
            { step: "02", title: t("landing.flow_step2_title"), desc: t("landing.flow_step2_desc") },
            { step: "03", title: t("landing.flow_step3_title"), desc: t("landing.flow_step3_desc") },
          ].map((item) => (
            <div key={item.step} className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-md">
              <p className="text-xs tracking-[0.25em] text-white/35 mb-4">{item.step}</p>
              <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
              <p className="text-sm leading-6 text-white/60">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Characters */}
      <section id="characters" className="relative z-10 max-w-6xl mx-auto px-6 md:px-10 pb-24 md:pb-32">
        <div className="flex items-end justify-between mb-10 md:mb-14">
          <div>
            <p className="text-fuchsia-300/80 text-xs tracking-[0.2em] uppercase mb-3">{t("landing.characters_kicker")}</p>
            <h2 className="font-serif text-3xl md:text-5xl text-white tracking-tight">
              {t("landing.characters_title_main")}<span className="text-white/50">{t("landing.characters_title_muted")}</span>
            </h2>
          </div>
          <Link href="/register" className="hidden md:inline-flex items-center gap-1 text-white/60 hover:text-white text-sm">
            {t("landing.meet")} <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
          {characters.map((c) => (
            <div key={c.name} className="group relative aspect-[3/4] rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-sm hover:border-white/30 transition-colors">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={c.avatarUrl}
                alt={c.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4">
                <p className="text-white font-medium text-base md:text-lg">{c.name}</p>
                <p className="text-white/70 text-xs md:text-sm mt-0.5">{c.subtitle}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {c.tags.slice(0, 2).map((t) => (
                    <span key={t} className="text-[10px] md:text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/80 border border-white/10">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 max-w-6xl mx-auto px-6 md:px-10 pb-24 md:pb-32">
        <div className="text-center mb-14 md:mb-20">
          <p className="text-fuchsia-300/80 text-xs tracking-[0.2em] uppercase mb-3">{t("landing.features_kicker")}</p>
          <h2 className="font-serif text-3xl md:text-5xl text-white tracking-tight max-w-2xl mx-auto">
            {t("landing.features_title_prefix")}
            <span className="bg-gradient-to-r from-violet-200 to-rose-200 bg-clip-text text-transparent">{t("landing.features_title_highlight")}</span>
            {t("landing.features_title_suffix")}
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-4 md:gap-6">
          <FeatureCard icon={<Brain size={20} />} title={t("landing.feature.memory.title")} desc={t("landing.feature.memory.desc")} />
          <FeatureCard icon={<Heart size={20} />} title={t("landing.feature.affinity.title")} desc={t("landing.feature.affinity.desc")} />
          <FeatureCard icon={<Calendar size={20} />} title={t("landing.feature.time.title")} desc={t("landing.feature.time.desc")} />
          <FeatureCard icon={<MessageCircle size={20} />} title={t("landing.feature.personalities.title")} desc={t("landing.feature.personalities.desc")} />
          <FeatureCard icon={<Link2 size={20} />} title={t("landing.feature.platform.title")} desc={t("landing.feature.platform.desc")} />
          <FeatureCard icon={<Moon size={20} />} title={t("landing.feature.goodnight.title")} desc={t("landing.feature.goodnight.desc")} />
        </div>
      </section>

      {/* Philosophy */}
      <section id="philosophy" className="relative z-10 max-w-4xl mx-auto px-6 md:px-10 pb-24 md:pb-32">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-md p-8 md:p-14 text-center">
          <Crown size={28} className="text-fuchsia-300 mx-auto mb-6" />
          <p className="font-serif text-2xl md:text-4xl text-white leading-relaxed tracking-tight">
            {t("landing.philosophy_line1")}
            <br className="hidden md:block" />
            {t("landing.philosophy_line2")}
            <span className="text-white/60">{t("landing.philosophy_highlight")}</span>
          </p>
          <p className="mt-8 text-white/40 text-sm tracking-widest">— {t("app.name")}</p>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 md:px-10 pb-24 md:pb-32 text-center">
        <h3 className="font-serif text-3xl md:text-5xl text-white tracking-tight">
          {t("landing.final_title")}
        </h3>
        <p className="mt-4 text-white/60">{t("landing.final_subtitle")}</p>
        <Link href="/register" className="mt-8 inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-white text-[#1a0b2e] font-medium hover:scale-[1.02] transition-transform shadow-2xl shadow-fuchsia-500/20">
          {t("landing.start")}
          <ArrowRight size={16} />
        </Link>
      </section>

      <footer className="relative z-10 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-white/40 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-violet-400 to-rose-400" />
            <span>{t("app.name")} · SheZai © {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/login" className="hover:text-white/80 transition-colors">{t("auth.login")}</Link>
            <Link href="/register" className="hover:text-white/80 transition-colors">{t("auth.register")}</Link>
            <Link href="/pricing" className="hover:text-white/80 transition-colors">{t("pricing.subscribe")}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="group relative rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-6 md:p-7 hover:border-white/25 hover:bg-white/[0.06] transition-colors">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/30 to-rose-500/30 border border-white/10 flex items-center justify-center text-fuchsia-200 mb-4">
        {icon}
      </div>
      <h3 className="text-white font-medium text-lg">{title}</h3>
      <p className="mt-2 text-white/55 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}
