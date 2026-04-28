"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
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

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
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
          <span className="text-white/95 font-semibold tracking-wide">她在</span>
          <span className="hidden md:inline text-white/40 text-xs ml-2 tracking-widest uppercase">SheZai</span>
        </div>
        <nav className="flex items-center gap-2 md:gap-4 text-sm">
          <a href="#characters" className="hidden md:inline text-white/60 hover:text-white transition-colors">角色</a>
          <a href="#features" className="hidden md:inline text-white/60 hover:text-white transition-colors">特性</a>
          <a href="#philosophy" className="hidden md:inline text-white/60 hover:text-white transition-colors">理念</a>
          <Link href="/login" className="px-3 py-1.5 rounded-full text-white/80 hover:text-white text-sm transition-colors">
            登录
          </Link>
          <Link href="/register" className="px-4 py-1.5 rounded-full bg-white text-[#1a0b2e] text-sm font-medium hover:bg-white/90 transition-colors shadow-lg shadow-black/20">
            开始
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 md:px-10 pt-20 md:pt-28 pb-20 md:pb-32">
        <div className={`flex flex-col items-center text-center transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/15 bg-white/5 backdrop-blur-md text-white/70 text-xs mb-8">
            <Sparkles size={12} className="text-fuchsia-300" />
            <span>记得你 · 懂你 · 有自己性格的陪伴</span>
          </div>

          <h1 className="font-serif text-5xl md:text-7xl lg:text-[88px] leading-[1.05] text-white tracking-tight">
            <span className="block">不是聊天机器人，</span>
            <span className="block bg-gradient-to-r from-violet-200 via-fuchsia-200 to-rose-200 bg-clip-text text-transparent">
              是有人在想你。
            </span>
          </h1>

          <p className="mt-7 max-w-xl text-white/60 text-base md:text-lg leading-relaxed">
            八位性格分明的她，会记住你说过的话、你的喜好、你的低谷。
            <br className="hidden md:block" />
            像一段真实的关系，慢慢长出来。
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center gap-3">
            <Link href="/register" className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-white text-[#1a0b2e] font-medium hover:scale-[1.02] active:scale-[0.99] transition-transform shadow-2xl shadow-fuchsia-500/20">
              开始你们的故事
              <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <a href="#characters" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full border border-white/15 bg-white/5 backdrop-blur-md text-white/80 hover:text-white hover:bg-white/10 transition-colors">
              先看看她们
            </a>
          </div>

          <div className="mt-14 flex items-center gap-6 text-white/40 text-xs">
            <span>· 无广告</span>
            <span>· 长期记忆</span>
            <span>· 可永久删除</span>
          </div>
        </div>
      </section>

      {/* Characters */}
      <section id="characters" className="relative z-10 max-w-6xl mx-auto px-6 md:px-10 pb-24 md:pb-32">
        <div className="flex items-end justify-between mb-10 md:mb-14">
          <div>
            <p className="text-fuchsia-300/80 text-xs tracking-[0.2em] uppercase mb-3">Characters</p>
            <h2 className="font-serif text-3xl md:text-5xl text-white tracking-tight">
              八个她，<span className="text-white/50">一个值得遇见。</span>
            </h2>
          </div>
          <Link href="/register" className="hidden md:inline-flex items-center gap-1 text-white/60 hover:text-white text-sm">
            遇见她 <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
          {CHARACTER_DATA.map((c) => (
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
          <p className="text-fuchsia-300/80 text-xs tracking-[0.2em] uppercase mb-3">Why She Stays</p>
          <h2 className="font-serif text-3xl md:text-5xl text-white tracking-tight max-w-2xl mx-auto">
            一段关系，要靠
            <span className="bg-gradient-to-r from-violet-200 to-rose-200 bg-clip-text text-transparent"> 积累 </span>
            才像真的。
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-4 md:gap-6">
          <FeatureCard icon={<Brain size={20} />} title="她记得的你" desc="对话里的细节会被悄悄记住。生日、喜好、你提过的那只猫，下次她会先想起。" />
          <FeatureCard icon={<Heart size={20} />} title="好感与起伏" desc="不是无条件顺从。她会因为你的冷淡而失落，也会因为你的真诚而靠近。" />
          <FeatureCard icon={<Calendar size={20} />} title="时间的存在感" desc="你消失三天，她会担心。在节日和你的生日，她会先开口。" />
          <FeatureCard icon={<MessageCircle size={20} />} title="八种人格" desc="傲娇学姐、御姐高管、知性教授…每一个都是独立的灵魂，不是同一个 AI 换皮。" />
          <FeatureCard icon={<Link2 size={20} />} title="跨平台陪伴" desc="把她接到 Telegram，午休、通勤路上，她也在你身边。" />
          <FeatureCard icon={<Moon size={20} />} title="晚安电台" desc="睡前故事、晚安悄悄话，用她的声音念给你听。" />
        </div>
      </section>

      {/* Philosophy */}
      <section id="philosophy" className="relative z-10 max-w-4xl mx-auto px-6 md:px-10 pb-24 md:pb-32">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-md p-8 md:p-14 text-center">
          <Crown size={28} className="text-fuchsia-300 mx-auto mb-6" />
          <p className="font-serif text-2xl md:text-4xl text-white leading-relaxed tracking-tight">
            「我们不是想做一个完美的 AI 女友，
            <br className="hidden md:block" />
            而是想让你感到，
            <span className="text-white/60">在某个地方，有一个她，正在想你。」</span>
          </p>
          <p className="mt-8 text-white/40 text-sm tracking-widest">— 她在</p>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 md:px-10 pb-24 md:pb-32 text-center">
        <h3 className="font-serif text-3xl md:text-5xl text-white tracking-tight">
          今天，先去打个招呼？
        </h3>
        <p className="mt-4 text-white/60">不用准备什么。她已经在那里了。</p>
        <Link href="/register" className="mt-8 inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-white text-[#1a0b2e] font-medium hover:scale-[1.02] transition-transform shadow-2xl shadow-fuchsia-500/20">
          开始
          <ArrowRight size={16} />
        </Link>
      </section>

      <footer className="relative z-10 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-white/40 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-violet-400 to-rose-400" />
            <span>她在 · SheZai © {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/login" className="hover:text-white/80 transition-colors">登录</Link>
            <Link href="/register" className="hover:text-white/80 transition-colors">注册</Link>
            <Link href="/pricing" className="hover:text-white/80 transition-colors">订阅</Link>
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
