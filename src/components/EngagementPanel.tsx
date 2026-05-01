"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Gamepad2,
  Heart,
  Loader2,
  MessageCircleQuestion,
  PenLine,
  Send,
  Smile,
  Sparkles,
  X,
} from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { ArcadeGames } from "@/components/ArcadeGames";

type Translate = (key: string, params?: Record<string, string>) => string;

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUrl?: string | null;
  audioUrl?: string | null;
  createdAt: string;
}

interface AffinityPayload {
  score: number;
  level: number;
  levelInfo: { name: string; nameEn: string; nameJa: string; icon: string };
  progress?: { current: number; needed: number; percent: number };
  nextLevel?: { name: string; nameEn: string; nameJa: string; minScore: number } | null;
}

interface GameCatalogItem {
  type: "truth" | "deep_questions" | "mood_guess" | "story_chain";
  title: string;
  description: string;
  reward: number;
}

interface ArcadeCatalogItem {
  type: "match_three" | "memory_match" | "photo_puzzle";
  title: string;
  description: string;
  reward: number;
  durationHint: string;
}

interface DailyTask {
  id: string;
  type: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  reward: number;
  completed: boolean;
  completedAt?: string;
}

interface HeartMoment {
  id: string;
  title: string;
  quote: string;
  context: string;
  intensity: number;
  createdAt: string;
}

interface MiniGameSession {
  id: string;
  gameType: GameCatalogItem["type"];
  title: string;
  status: "active" | "completed" | "abandoned";
  turn: number;
  score: number;
  prompt: string;
  options?: string[];
  reward: number;
  updatedAt: string;
}

interface EngagementOverview {
  games: GameCatalogItem[];
  arcadeGames: ArcadeCatalogItem[];
  tasks: DailyTask[];
  currentSession: MiniGameSession | null;
  sessions: MiniGameSession[];
  moments: HeartMoment[];
}

interface EngagementPanelProps {
  charName: string;
  charAvatarUrl: string;
  locale: Locale;
  t: Translate;
  refreshSignal: number;
  onClose: () => void;
  onAppendMessages: (messages: ChatMessage[]) => void;
  onAffinityUpdate: (affinity: AffinityPayload) => void;
  onLevelUp: (levelName: string) => void;
  onToast: (message: string) => void;
  onMessageLimit: () => void;
}

const GAME_ICONS: Record<GameCatalogItem["type"], typeof MessageCircleQuestion> = {
  truth: MessageCircleQuestion,
  deep_questions: Heart,
  mood_guess: Smile,
  story_chain: PenLine,
};

export function EngagementPanel({
  charName,
  charAvatarUrl,
  locale,
  t,
  refreshSignal,
  onClose,
  onAppendMessages,
  onAffinityUpdate,
  onLevelUp,
  onToast,
  onMessageLimit,
}: EngagementPanelProps) {
  const [overview, setOverview] = useState<EngagementOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState<GameCatalogItem["type"] | null>(null);
  const [answering, setAnswering] = useState(false);
  const [answer, setAnswer] = useState("");

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/games?locale=${locale}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("games.load_failed"));
      setOverview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("games.load_failed"));
    } finally {
      setLoading(false);
    }
  }, [locale, t]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchOverview();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchOverview, refreshSignal]);

  const currentSession = overview?.currentSession || null;
  const completedCount = useMemo(
    () => overview?.tasks.filter((task) => task.completed).length || 0,
    [overview?.tasks]
  );

  const startGame = async (gameType: GameCatalogItem["type"]) => {
    if (starting) return;
    setStarting(gameType);
    setError(null);
    try {
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", gameType, locale }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("games.start_failed"));
      if (data.message) onAppendMessages([data.message]);
      if (data.overview) setOverview(data.overview);
      setAnswer("");
      onToast(t("games.started"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("games.start_failed"));
    } finally {
      setStarting(null);
    }
  };

  const submitAnswer = async (value?: string) => {
    const finalAnswer = (value ?? answer).trim();
    if (!currentSession || !finalAnswer || answering) return;

    setAnswering(true);
    setError(null);
    try {
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "answer",
          sessionId: currentSession.id,
          answer: finalAnswer,
          locale,
        }),
      });
      const data = await res.json();
      if (res.status === 403 && data.code === "MESSAGE_LIMIT") {
        onMessageLimit();
        return;
      }
      if (!res.ok) throw new Error(data.error || t("games.answer_failed"));

      const newMessages = [data.userMessage, data.message].filter(Boolean);
      if (newMessages.length > 0) onAppendMessages(newMessages);
      if (data.affinity) {
        onAffinityUpdate(data.affinity);
        if (data.levelUp) onLevelUp(data.affinity.levelInfo.name);
      }
      if (data.completedTasks?.length > 0) {
        const task = data.completedTasks[0] as DailyTask;
        onToast(`${task.title} +${task.reward}`);
      } else if (data.gameReward > 0) {
        onToast(t("games.reward", { points: String(data.gameReward) }));
      }
      if (data.heartMoment) {
        onToast(t("games.heart_saved"));
      }
      if (data.overview) setOverview(data.overview);
      setAnswer("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("games.answer_failed"));
    } finally {
      setAnswering(false);
    }
  };

  const abandonCurrent = async () => {
    if (!currentSession) return;
    setError(null);
    try {
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "abandon", sessionId: currentSession.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("games.abandon_failed"));
      if (data.overview) setOverview(data.overview);
      setAnswer("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("games.abandon_failed"));
    }
  };

  const handleArcadeComplete = (data: {
    message?: ChatMessage;
    completedTasks?: { title: string; reward: number }[];
    heartMoment?: unknown;
    gameReward?: number;
    rewardCapped?: boolean;
    levelUp?: boolean;
    affinity?: AffinityPayload | null;
    overview?: unknown;
  }) => {
    if (data.message) onAppendMessages([data.message]);
    if (data.affinity) {
      onAffinityUpdate(data.affinity);
      if (data.levelUp) onLevelUp(data.affinity.levelInfo.name);
    }
    if (data.overview) setOverview(data.overview as EngagementOverview);

    if (data.rewardCapped) {
      onToast(t("games.arcade_reward_limited"));
      return;
    }
    const completedTask = data.completedTasks?.[0];
    if (completedTask) {
      onToast(`${completedTask.title} +${completedTask.reward}`);
    } else if (data.gameReward && data.gameReward > 0) {
      onToast(t("games.arcade_completed", { points: String(data.gameReward) }));
    }
  };

  return (
    <div className="p-4 bg-surface rounded-xl border border-card-border max-h-[32rem] overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Gamepad2 size={14} className="text-primary" />
          {t("games.title")}
        </h3>
        <button onClick={onClose} className="text-muted hover:text-foreground" title={t("games.close")}>
          <X size={14} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 gap-2 text-muted">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm">{t("games.loading")}</span>
        </div>
      ) : error ? (
        <div className="p-3 bg-card-bg rounded-lg border border-card-border text-sm text-muted">
          {error}
        </div>
      ) : overview ? (
        <div className="space-y-4">
          <section>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold flex items-center gap-1.5">
                <Sparkles size={13} className="text-amber-500" />
                {t("games.daily_tasks")}
              </h4>
              <span className="text-[10px] text-muted">
                {completedCount}/{overview.tasks.length}
              </span>
            </div>
            <div className="space-y-2">
              {overview.tasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-3 rounded-lg border ${
                    task.completed
                      ? "bg-primary/10 border-primary/25"
                      : "bg-card-bg border-card-border/70"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {task.completed ? (
                      <CheckCircle2 size={15} className="text-primary mt-0.5 shrink-0" />
                    ) : (
                      <Clock3 size={15} className="text-muted mt-0.5 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium truncate">{task.title}</p>
                        <span className="text-[10px] text-primary shrink-0">+{task.reward}</span>
                      </div>
                      <p className="text-[11px] text-muted mt-0.5 leading-relaxed">{task.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {currentSession && (
            <section className="p-3 bg-card-bg rounded-lg border border-primary/30">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate">{currentSession.title}</p>
                  <p className="text-[10px] text-muted">
                    {t("games.turn", { n: String(currentSession.turn + 1) })}
                  </p>
                </div>
                <button onClick={abandonCurrent} className="text-[10px] text-muted hover:text-foreground">
                  {t("games.abandon")}
                </button>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap mb-3">{currentSession.prompt}</p>
              {currentSession.options?.length ? (
                <div className="grid grid-cols-2 gap-2">
                  {currentSession.options.map((option) => (
                    <button
                      key={option}
                      onClick={() => submitAnswer(option)}
                      disabled={answering}
                      className="px-3 py-2 rounded-lg bg-surface border border-card-border text-xs hover:border-primary/50 disabled:opacity-50 transition-colors"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-end gap-2">
                  <textarea
                    value={answer}
                    onChange={(event) => setAnswer(event.target.value)}
                    rows={2}
                    placeholder={t("games.answer_placeholder", { name: charName })}
                    className="flex-1 px-3 py-2 bg-input-bg border border-card-border rounded-lg text-sm resize-none focus:outline-none focus:border-primary"
                  />
                  <button
                    onClick={() => submitAnswer()}
                    disabled={!answer.trim() || answering}
                    className="w-10 h-10 rounded-lg bg-primary text-white flex items-center justify-center disabled:opacity-40"
                    title={t("games.send_answer")}
                  >
                    {answering ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </div>
              )}
            </section>
          )}

          <ArcadeGames
            charName={charName}
            charAvatarUrl={charAvatarUrl}
            locale={locale}
            t={t}
            arcadeGames={overview.arcadeGames || []}
            onComplete={handleArcadeComplete}
          />

          <section>
            <h4 className="text-xs font-semibold mb-2">{t("games.choose_game")}</h4>
            <div className="grid grid-cols-2 gap-2">
              {overview.games.map((game) => {
                const Icon = GAME_ICONS[game.type];
                return (
                  <button
                    key={game.type}
                    onClick={() => startGame(game.type)}
                    disabled={Boolean(starting)}
                    className="p-3 bg-card-bg rounded-lg border border-card-border/70 text-left hover:border-primary/50 transition-colors disabled:opacity-60"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {starting === game.type ? (
                        <Loader2 size={15} className="animate-spin text-primary" />
                      ) : (
                        <Icon size={15} className="text-primary" />
                      )}
                      <span className="text-xs font-semibold truncate">{game.title}</span>
                      <span className="text-[10px] text-primary ml-auto">+{game.reward}</span>
                    </div>
                    <p className="text-[11px] text-muted leading-relaxed line-clamp-2">{game.description}</p>
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold flex items-center gap-1.5">
                <Heart size={13} className="text-accent-pink" />
                {t("games.heart_moments")}
              </h4>
              <span className="text-[10px] text-muted">{overview.moments.length}</span>
            </div>
            {overview.moments.length === 0 ? (
              <p className="text-xs text-muted text-center py-4 bg-card-bg rounded-lg border border-card-border/60">
                {t("games.no_moments")}
              </p>
            ) : (
              <div className="space-y-2">
                {overview.moments.slice(0, 3).map((moment) => (
                  <div key={moment.id} className="p-3 bg-card-bg rounded-lg border border-card-border/70">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-xs font-medium truncate">{moment.title}</p>
                      <span className="text-[10px] text-muted shrink-0">
                        {new Date(moment.createdAt).toLocaleDateString("zh-CN", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted leading-relaxed">“{moment.quote}”</p>
                    <p className="text-[11px] text-muted/70 leading-relaxed mt-1 line-clamp-2">{moment.context}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
