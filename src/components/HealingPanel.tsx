"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  HeartHandshake,
  Loader2,
  Pause,
  Play,
  Send,
  ShieldCheck,
  Sparkles,
  Timer,
  X,
} from "lucide-react";
import type { Locale } from "@/lib/i18n";

type Translate = (key: string, params?: Record<string, string>) => string;
type HealingMode = "mirror" | "anchor" | "breath" | "grounding" | "companion";

interface HealingModeInfo {
  mode: HealingMode;
  title: string;
  description: string;
  durationHint: string;
}

interface HealingMessage {
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  crisis?: boolean;
}

interface HealingSession {
  id: string;
  mode: HealingMode;
  title: string;
  status: "active" | "completed" | "abandoned";
  transcript: HealingMessage[];
  checkInBefore?: number;
  checkInAfter?: number;
  createdAt: string;
  updatedAt: string;
}

interface HealingOverview {
  access: {
    allowed: boolean;
    plan: string;
    proOnly: boolean;
    trialOpen: boolean;
    reason: string | null;
  };
  noticeAccepted: boolean;
  modes: HealingModeInfo[];
  currentSession: HealingSession | null;
  sessions: HealingSession[];
  stats: {
    totalSessions: number;
    completedSessions: number;
    mirrorTurns: number;
    exerciseCount: number;
    lastUsedAt: string | null;
    averageAfterRating: number | null;
  };
}

interface HealingPanelProps {
  charName: string;
  locale: Locale;
  t: Translate;
  onClose: () => void;
  onToast: (message: string) => void;
}

const MODE_ACCENTS: Record<HealingMode, string> = {
  mirror: "border-sky-400/40 bg-sky-500/10",
  anchor: "border-emerald-400/40 bg-emerald-500/10",
  breath: "border-cyan-400/40 bg-cyan-500/10",
  grounding: "border-amber-400/40 bg-amber-500/10",
  companion: "border-violet-400/40 bg-violet-500/10",
};

export function HealingPanel({ charName, locale, t, onClose, onToast }: HealingPanelProps) {
  const [overview, setOverview] = useState<HealingOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startingMode, setStartingMode] = useState<HealingMode | null>(null);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState("");
  const [checkInBefore, setCheckInBefore] = useState(3);
  const [checkInAfter, setCheckInAfter] = useState(3);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [breathIndex, setBreathIndex] = useState(0);
  const [groundingDone, setGroundingDone] = useState<string[]>([]);

  const currentSession = overview?.currentSession || null;
  const anchorPhrases = useMemo(
    () => [
      t("healing.anchor_phrase_1"),
      t("healing.anchor_phrase_2"),
      t("healing.anchor_phrase_3"),
      t("healing.anchor_phrase_4"),
    ],
    [t]
  );
  const breathSteps = useMemo(
    () => [
      { label: t("healing.breath_inhale"), seconds: 4 },
      { label: t("healing.breath_hold"), seconds: 7 },
      { label: t("healing.breath_exhale"), seconds: 8 },
    ],
    [t]
  );
  const groundingSteps = useMemo(
    () => [
      t("healing.grounding_5"),
      t("healing.grounding_4"),
      t("healing.grounding_3"),
      t("healing.grounding_2"),
      t("healing.grounding_1"),
    ],
    [t]
  );

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/healing?locale=${locale}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("healing.load_failed"));
      setOverview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("healing.load_failed"));
    } finally {
      setLoading(false);
    }
  }, [locale, t]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchOverview();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchOverview]);

  useEffect(() => {
    if (!timerRunning || timerSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setTimerSeconds((seconds) => {
        const nextSeconds = Math.max(0, seconds - 1);
        if (nextSeconds === 0) {
          window.setTimeout(() => setTimerRunning(false), 0);
        }
        return nextSeconds;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [timerRunning, timerSeconds]);

  const anchorPhrase = useMemo(() => {
    const minute = Math.floor(timerSeconds / 60);
    return anchorPhrases[minute % anchorPhrases.length];
  }, [anchorPhrases, timerSeconds]);

  const acceptNotice = async () => {
    setError(null);
    try {
      const res = await fetch("/api/healing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept_notice" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("healing.notice_failed"));
      setOverview((prev) => prev ? { ...prev, noticeAccepted: data.noticeAccepted } : prev);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("healing.notice_failed"));
    }
  };

  const startSession = async (mode: HealingMode) => {
    setStartingMode(mode);
    setError(null);
    setTimerSeconds(0);
    setTimerRunning(false);
    setBreathIndex(0);
    setGroundingDone([]);
    try {
      const res = await fetch("/api/healing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", mode, checkInBefore, locale }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("healing.start_failed"));
      setOverview((prev) => prev ? { ...prev, currentSession: data.session, sessions: [data.session, ...prev.sessions] } : prev);
      onToast(t("healing.started"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("healing.start_failed"));
    } finally {
      setStartingMode(null);
    }
  };

  const sendMirrorMessage = async () => {
    const message = input.trim();
    if (!currentSession || !message || sending) return;

    setSending(true);
    setInput("");
    setError(null);
    try {
      const res = await fetch("/api/healing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "message", sessionId: currentSession.id, message, locale }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("healing.send_failed"));
      setOverview((prev) => prev ? { ...prev, currentSession: data.session } : prev);
      if (data.crisis) onToast(t("healing.crisis_detected"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("healing.send_failed"));
    } finally {
      setSending(false);
    }
  };

  const completeSession = async (bridge?: string) => {
    if (!currentSession) return;
    setError(null);
    try {
      const res = await fetch("/api/healing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete",
          sessionId: currentSession.id,
          checkInAfter,
          realWorldBridge: bridge || t("healing.bridge_default"),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("healing.complete_failed"));
      setOverview((prev) => prev ? {
        ...prev,
        currentSession: null,
        sessions: prev.sessions.map((session) => session.id === data.session.id ? data.session : session),
      } : prev);
      onToast(t("healing.completed"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("healing.complete_failed"));
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return `${minutes}:${String(rest).padStart(2, "0")}`;
  };

  const renderNotice = () => (
    <div className="p-4 bg-card-bg rounded-lg border border-amber-400/40 space-y-3">
      <div className="flex items-start gap-2">
        <ShieldCheck size={18} className="text-amber-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold">{t("healing.notice_title")}</p>
          <p className="text-xs text-muted leading-relaxed mt-1">{t("healing.notice_body")}</p>
        </div>
      </div>
      <button onClick={acceptNotice} className="w-full py-2 rounded-lg bg-primary text-white text-sm hover:opacity-90 transition-opacity">
        {t("healing.notice_accept")}
      </button>
    </div>
  );

  const renderModePicker = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            onClick={() => setCheckInBefore(rating)}
            className={`py-2 rounded-lg border text-xs ${checkInBefore === rating ? "border-primary bg-primary/15 text-primary" : "border-card-border bg-card-bg text-muted"}`}
          >
            {rating}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-muted -mt-2">{t("healing.before_hint")}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {overview?.modes.map((mode) => (
          <button
            key={mode.mode}
            onClick={() => startSession(mode.mode)}
            disabled={Boolean(startingMode)}
            className={`p-3 rounded-lg border text-left transition-colors hover:border-primary/50 ${MODE_ACCENTS[mode.mode]}`}
          >
            <div className="flex items-center gap-2 mb-1">
              {startingMode === mode.mode ? <Loader2 size={15} className="animate-spin text-primary" /> : <HeartHandshake size={15} className="text-primary" />}
              <span className="text-xs font-semibold">{mode.title}</span>
              <span className="text-[10px] text-muted ml-auto">{mode.durationHint}</span>
            </div>
            <p className="text-[11px] text-muted leading-relaxed">{mode.description}</p>
          </button>
        ))}
      </div>
    </div>
  );

  const renderMirrorSession = () => (
    <div className="space-y-3">
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {currentSession?.transcript.map((message, index) => (
          <div key={`${message.createdAt}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed whitespace-pre-wrap ${message.role === "user" ? "bg-primary text-white" : message.crisis ? "bg-amber-500/10 border border-amber-400/40" : "bg-card-bg border border-card-border"}`}>
              {message.content}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-end gap-2">
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          rows={2}
          placeholder={t("healing.mirror_placeholder", { name: charName })}
          className="flex-1 px-3 py-2 bg-input-bg border border-card-border rounded-lg text-sm resize-none focus:outline-none focus:border-primary"
        />
        <button onClick={sendMirrorMessage} disabled={!input.trim() || sending} className="w-10 h-10 rounded-lg bg-primary text-white flex items-center justify-center disabled:opacity-40">
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );

  const renderAnchorSession = () => (
    <div className="text-center space-y-4">
      <div className="mx-auto w-28 h-28 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center animate-pulse-soft">
        <HeartHandshake size={34} className="text-primary" />
      </div>
      <p className="text-sm text-muted">{anchorPhrase}</p>
      <p className="text-3xl font-semibold tabular-nums">{formatTime(timerSeconds)}</p>
      <div className="flex justify-center gap-2">
        {[5, 15, 30].map((minutes) => (
          <button key={minutes} onClick={() => { setTimerSeconds(minutes * 60); setTimerRunning(true); }} className="px-3 py-2 rounded-lg bg-card-bg border border-card-border text-xs hover:border-primary/50">
            {minutes}m
          </button>
        ))}
        <button onClick={() => setTimerRunning((running) => !running)} disabled={timerSeconds === 0} className="px-3 py-2 rounded-lg bg-primary text-white text-xs disabled:opacity-40">
          {timerRunning ? <Pause size={14} /> : <Play size={14} />}
        </button>
      </div>
    </div>
  );

  const renderBreathSession = () => {
    const step = breathSteps[breathIndex % breathSteps.length];
    const round = Math.floor(breathIndex / breathSteps.length) + 1;
    return (
      <div className="text-center space-y-4">
        <div className="mx-auto w-32 h-32 rounded-full bg-cyan-500/10 border border-cyan-400/40 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold">{step.seconds}s</span>
          <span className="text-sm text-muted">{step.label}</span>
        </div>
        <p className="text-xs text-muted">{t("healing.breath_round", { n: String(Math.min(round, 4)) })}</p>
        <button onClick={() => setBreathIndex((index) => index + 1)} className="px-4 py-2 rounded-lg bg-primary text-white text-sm">
          {t("healing.next_step")}
        </button>
      </div>
    );
  };

  const renderGroundingSession = () => (
    <div className="space-y-2">
      {groundingSteps.map((step) => {
        const done = groundingDone.includes(step);
        return (
          <button
            key={step}
            onClick={() => setGroundingDone((items) => done ? items.filter((item) => item !== step) : [...items, step])}
            className={`w-full p-3 rounded-lg border text-left text-sm flex items-center gap-2 ${done ? "bg-primary/10 border-primary/30" : "bg-card-bg border-card-border"}`}
          >
            <CheckCircle2 size={15} className={done ? "text-primary" : "text-muted"} />
            {step}
          </button>
        );
      })}
    </div>
  );

  const renderCompanionSession = () => (
    <div className="text-center space-y-4">
      <Timer size={38} className="mx-auto text-primary" />
      <p className="text-sm text-muted leading-relaxed">{t("healing.companion_body", { name: charName })}</p>
      <div className="flex justify-center gap-2">
        {[10, 25].map((minutes) => (
          <button key={minutes} onClick={() => { setTimerSeconds(minutes * 60); setTimerRunning(true); }} className="px-4 py-2 rounded-lg bg-card-bg border border-card-border text-xs hover:border-primary/50">
            {minutes}m
          </button>
        ))}
      </div>
      <p className="text-3xl font-semibold tabular-nums">{formatTime(timerSeconds)}</p>
    </div>
  );

  const renderActiveSession = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">{currentSession?.title}</p>
          <p className="text-[11px] text-muted">{t("healing.no_rewards")}</p>
        </div>
        <button onClick={() => completeSession()} className="text-xs text-primary hover:underline">{t("healing.finish")}</button>
      </div>

      {currentSession?.mode === "mirror" && renderMirrorSession()}
      {currentSession?.mode === "anchor" && renderAnchorSession()}
      {currentSession?.mode === "breath" && renderBreathSession()}
      {currentSession?.mode === "grounding" && renderGroundingSession()}
      {currentSession?.mode === "companion" && renderCompanionSession()}

      <div className="pt-3 border-t border-card-border/70 space-y-2">
        <p className="text-[11px] text-muted">{t("healing.after_hint")}</p>
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((rating) => (
            <button key={rating} onClick={() => setCheckInAfter(rating)} className={`py-2 rounded-lg border text-xs ${checkInAfter === rating ? "border-primary bg-primary/15 text-primary" : "border-card-border bg-card-bg text-muted"}`}>
              {rating}
            </button>
          ))}
        </div>
        <button onClick={() => completeSession(t("healing.bridge_default"))} className="w-full py-2 rounded-lg bg-card-bg border border-card-border text-xs hover:border-primary/50">
          {t("healing.finish_with_bridge")}
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-4 bg-surface rounded-xl border border-card-border max-h-[34rem] overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <HeartHandshake size={14} className="text-primary" />
          {t("healing.title")}
        </h3>
        <button onClick={onClose} className="text-muted hover:text-foreground" title={t("healing.close")}>
          <X size={14} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 gap-2 text-muted">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm">{t("healing.loading")}</span>
        </div>
      ) : error ? (
        <div className="p-3 bg-card-bg rounded-lg border border-card-border text-sm text-muted">{error}</div>
      ) : overview && !overview.access.allowed ? (
        <div className="p-3 bg-card-bg rounded-lg border border-card-border text-sm text-muted">{t("healing.locked")}</div>
      ) : overview ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-[10px]">
              <Sparkles size={11} />
              {overview.access.trialOpen ? t("healing.trial_badge") : t("healing.pro_badge")}
            </span>
            {overview.stats.completedSessions > 0 && (
              <span className="text-[10px] text-muted">{t("healing.stats", { n: String(overview.stats.completedSessions) })}</span>
            )}
          </div>

          {!overview.noticeAccepted ? renderNotice() : currentSession ? renderActiveSession() : renderModePicker()}

          <div className="flex items-start gap-2 text-[11px] text-muted bg-card-bg/70 border border-card-border/60 rounded-lg p-3">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <p>{t("healing.footer_safety")}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
