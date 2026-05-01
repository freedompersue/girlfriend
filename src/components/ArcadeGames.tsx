"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Grid3X3,
  ImageIcon,
  Loader2,
  RotateCcw,
  Sparkles,
  Trophy,
} from "lucide-react";
import type { Locale } from "@/lib/i18n";

type Translate = (key: string, params?: Record<string, string>) => string;
type ArcadeGameType = "match_three" | "memory_match" | "photo_puzzle";

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

interface ArcadeCatalogItem {
  type: ArcadeGameType;
  title: string;
  description: string;
  reward: number;
  durationHint: string;
}

interface DailyTask {
  id: string;
  type: string;
  title: string;
  reward: number;
  completed: boolean;
}

interface ArcadeCompleteResult {
  message?: ChatMessage;
  completedTasks?: DailyTask[];
  heartMoment?: unknown;
  gameReward?: number;
  rewardCapped?: boolean;
  levelUp?: boolean;
  affinity?: AffinityPayload | null;
  overview?: unknown;
}

interface ArcadeGamesProps {
  charName: string;
  charAvatarUrl: string;
  locale: Locale;
  t: Translate;
  arcadeGames: ArcadeCatalogItem[];
  onComplete: (result: ArcadeCompleteResult) => void;
}

const FALLBACK_ARCADE_GAME_TYPES: ArcadeGameType[] = [
  "match_three",
  "memory_match",
  "photo_puzzle",
];

const MATCH_SIZE = 5;
const PUZZLE_SIZE = 3;
const MATCH_SYMBOLS = ["☕", "📚", "🌸", "🎵", "⭐", "💌"];
const SYMBOL_STYLES: Record<string, string> = {
  "☕": "bg-gradient-to-br from-amber-500/25 to-amber-700/10 border-amber-500/40",
  "📚": "bg-gradient-to-br from-blue-500/25 to-blue-700/10 border-blue-500/40",
  "🌸": "bg-gradient-to-br from-pink-500/25 to-pink-700/10 border-pink-500/40",
  "🎵": "bg-gradient-to-br from-purple-500/25 to-purple-700/10 border-purple-500/40",
  "⭐": "bg-gradient-to-br from-yellow-500/25 to-yellow-700/10 border-yellow-500/40",
  "💌": "bg-gradient-to-br from-rose-500/25 to-rose-700/10 border-rose-500/40",
};
const MEMORY_SYMBOLS: Record<Locale, string[]> = {
  zh: ["咖啡", "书页", "花", "音符", "星星", "信"],
  en: ["Coffee", "Page", "Flower", "Note", "Star", "Letter"],
  ja: ["珈琲", "本", "花", "音符", "星", "手紙"],
};
const EMPTY_TILE = PUZZLE_SIZE * PUZZLE_SIZE - 1;

const GAME_ICONS: Record<ArcadeGameType, typeof Grid3X3> = {
  match_three: Grid3X3,
  memory_match: Sparkles,
  photo_puzzle: ImageIcon,
};

function shuffle<T>(items: T[]) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function randomMatchSymbol(excluded: string[] = []) {
  const options = MATCH_SYMBOLS.filter((symbol) => !excluded.includes(symbol));
  return options[Math.floor(Math.random() * options.length)] || MATCH_SYMBOLS[0];
}

function createMatchBoard() {
  const board: string[] = [];
  for (let index = 0; index < MATCH_SIZE * MATCH_SIZE; index += 1) {
    const excluded: string[] = [];
    const col = index % MATCH_SIZE;
    const row = Math.floor(index / MATCH_SIZE);
    if (col >= 2 && board[index - 1] === board[index - 2]) excluded.push(board[index - 1]);
    if (row >= 2 && board[index - MATCH_SIZE] === board[index - MATCH_SIZE * 2]) {
      excluded.push(board[index - MATCH_SIZE]);
    }
    board.push(randomMatchSymbol(excluded));
  }
  return board;
}

function findMatches(board: string[]) {
  const matches = new Set<number>();

  for (let row = 0; row < MATCH_SIZE; row += 1) {
    let runStart = 0;
    for (let col = 1; col <= MATCH_SIZE; col += 1) {
      const current = col < MATCH_SIZE ? board[row * MATCH_SIZE + col] : null;
      const previous = board[row * MATCH_SIZE + col - 1];
      if (current !== previous) {
        if (col - runStart >= 3) {
          for (let run = runStart; run < col; run += 1) matches.add(row * MATCH_SIZE + run);
        }
        runStart = col;
      }
    }
  }

  for (let col = 0; col < MATCH_SIZE; col += 1) {
    let runStart = 0;
    for (let row = 1; row <= MATCH_SIZE; row += 1) {
      const current = row < MATCH_SIZE ? board[row * MATCH_SIZE + col] : null;
      const previous = board[(row - 1) * MATCH_SIZE + col];
      if (current !== previous) {
        if (row - runStart >= 3) {
          for (let run = runStart; run < row; run += 1) matches.add(run * MATCH_SIZE + col);
        }
        runStart = row;
      }
    }
  }

  return matches;
}

function collapseBoard(board: string[], matches: Set<number>) {
  const next = [...board];
  for (let col = 0; col < MATCH_SIZE; col += 1) {
    const kept: string[] = [];
    for (let row = MATCH_SIZE - 1; row >= 0; row -= 1) {
      const index = row * MATCH_SIZE + col;
      if (!matches.has(index)) kept.push(next[index]);
    }
    for (let row = MATCH_SIZE - 1; row >= 0; row -= 1) {
      const value = kept.shift() || randomMatchSymbol();
      next[row * MATCH_SIZE + col] = value;
    }
  }
  return next;
}

function resolveMatchBoard(board: string[]) {
  let next = [...board];
  let cleared = 0;
  for (let guard = 0; guard < 8; guard += 1) {
    const matches = findMatches(next);
    if (matches.size === 0) break;
    cleared += matches.size;
    next = collapseBoard(next, matches);
  }
  return { board: next, cleared };
}

function isAdjacent(first: number, second: number, size: number) {
  const firstRow = Math.floor(first / size);
  const firstCol = first % size;
  const secondRow = Math.floor(second / size);
  const secondCol = second % size;
  return Math.abs(firstRow - secondRow) + Math.abs(firstCol - secondCol) === 1;
}

function swapItems<T>(items: T[], first: number, second: number) {
  const next = [...items];
  [next[first], next[second]] = [next[second], next[first]];
  return next;
}

function createMemoryCards(symbols: string[] = MEMORY_SYMBOLS.zh) {
  return shuffle([...symbols, ...symbols]).map((symbol, index) => ({
    id: `${symbol}-${index}-${Math.random().toString(36).slice(2)}`,
    symbol,
    matched: false,
    revealed: false,
  }));
}

function createPuzzleBoard() {
  let board = Array.from({ length: PUZZLE_SIZE * PUZZLE_SIZE }, (_, index) => index);
  let emptyIndex = EMPTY_TILE;
  for (let step = 0; step < 80; step += 1) {
    const candidates = board
      .map((_, index) => index)
      .filter((index) => isAdjacent(index, emptyIndex, PUZZLE_SIZE));
    const target = candidates[Math.floor(Math.random() * candidates.length)];
    board = swapItems(board, emptyIndex, target);
    emptyIndex = target;
  }
  return board;
}

function puzzleSolved(board: number[]) {
  return board.every((tile, index) => tile === index);
}

function starText(stars: number) {
  return "★".repeat(stars) + "☆".repeat(3 - stars);
}

export function ArcadeGames({
  charName,
  charAvatarUrl,
  locale,
  t,
  arcadeGames,
  onComplete,
}: ArcadeGamesProps) {
  const fallbackGames = useMemo<ArcadeCatalogItem[]>(
    () =>
      FALLBACK_ARCADE_GAME_TYPES.map((type) => ({
        type,
        title: t(`games.arcade.${type}.title`),
        description: t(`games.arcade.${type}.description`),
        reward: type === "match_three" ? 12 : type === "memory_match" ? 8 : 10,
        durationHint: t(`games.arcade.${type}.duration`),
      })),
    [t]
  );
  const games = arcadeGames.length > 0 ? arcadeGames : fallbackGames;
  const memorySymbols = useMemo(() => MEMORY_SYMBOLS[locale], [locale]);
  const [activeGame, setActiveGame] = useState<ArcadeGameType>(games[0]?.type || "match_three");
  const [rewarding, setRewarding] = useState<ArcadeGameType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [matchBoard, setMatchBoard] = useState(createMatchBoard);
  const [selectedTile, setSelectedTile] = useState<number | null>(null);
  const [matchMoves, setMatchMoves] = useState(15);
  const [matchScore, setMatchScore] = useState(0);
  const [matchDone, setMatchDone] = useState(false);
  const [matchedTiles, setMatchedTiles] = useState<Set<number> | null>(null);
  const [scorePopup, setScorePopup] = useState<{ points: number; key: number } | null>(null);

  const [memoryCards, setMemoryCards] = useState(() => createMemoryCards(memorySymbols));
  const [firstCard, setFirstCard] = useState<string | null>(null);
  const [memoryMoves, setMemoryMoves] = useState(0);
  const [memoryLocked, setMemoryLocked] = useState(false);
  const [memoryDone, setMemoryDone] = useState(false);

  const [puzzleBoard, setPuzzleBoard] = useState(createPuzzleBoard);
  const [puzzleMoves, setPuzzleMoves] = useState(0);
  const [puzzleDone, setPuzzleDone] = useState(false);

  const activeInfo = useMemo(
    () => games.find((game) => game.type === activeGame) || games[0],
    [activeGame, games]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMemoryCards(createMemoryCards(memorySymbols));
      setFirstCard(null);
      setMemoryMoves(0);
      setMemoryLocked(false);
      setMemoryDone(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [memorySymbols]);

  const completeArcade = async (gameType: ArcadeGameType, score: number, stars: number) => {
    if (rewarding) return;
    setRewarding(gameType);
    setError(null);
    try {
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "arcade_complete", gameType, score, stars, locale }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("games.arcade_failed"));
      onComplete(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("games.arcade_failed"));
    } finally {
      setRewarding(null);
    }
  };

  const resetMatchThree = () => {
    setMatchBoard(createMatchBoard());
    setSelectedTile(null);
    setMatchMoves(15);
    setMatchScore(0);
    setMatchDone(false);
    setMatchedTiles(null);
    setScorePopup(null);
    setError(null);
  };

  const resetMemoryMatch = () => {
    setMemoryCards(createMemoryCards(memorySymbols));
    setFirstCard(null);
    setMemoryMoves(0);
    setMemoryLocked(false);
    setMemoryDone(false);
    setError(null);
  };

  const resetPuzzle = () => {
    setPuzzleBoard(createPuzzleBoard());
    setPuzzleMoves(0);
    setPuzzleDone(false);
    setError(null);
  };

  const getMatchStars = (score: number) => {
    if (score >= 1200) return 3;
    if (score >= 700) return 2;
    return 1;
  };

  const handleTileClick = (index: number) => {
    if (matchDone || rewarding === "match_three" || matchedTiles) return;
    if (selectedTile === null) {
      setSelectedTile(index);
      return;
    }
    if (selectedTile === index) {
      setSelectedTile(null);
      return;
    }
    if (!isAdjacent(selectedTile, index, MATCH_SIZE)) {
      setSelectedTile(index);
      return;
    }

    const swapped = swapItems(matchBoard, selectedTile, index);
    const immediateMatches = findMatches(swapped);
    const nextMoves = Math.max(0, matchMoves - 1);
    setSelectedTile(null);
    setMatchMoves(nextMoves);

    if (immediateMatches.size === 0) {
      if (nextMoves === 0) {
        const stars = getMatchStars(matchScore);
        setMatchDone(true);
        void completeArcade("match_three", matchScore, stars);
      }
      return;
    }

    // Highlight matched tiles first, then resolve after a short delay
    setMatchedTiles(immediateMatches);
    const capturedScore = matchScore;
    window.setTimeout(() => {
      const resolved = resolveMatchBoard(swapped);
      const earnedPoints = resolved.cleared * 80 + Math.max(0, resolved.cleared - 3) * 25;
      const nextScore = capturedScore + earnedPoints;
      setMatchBoard(resolved.board);
      setMatchScore(nextScore);
      setMatchedTiles(null);
      setScorePopup({ points: earnedPoints, key: Date.now() });
      window.setTimeout(() => setScorePopup(null), 800);
      if (nextScore >= 1200 || nextMoves === 0) {
        const stars = getMatchStars(nextScore);
        setMatchDone(true);
        void completeArcade("match_three", nextScore, stars);
      }
    }, 320);
  };

  const getMemoryStars = (moves: number) => {
    if (moves <= 8) return 3;
    if (moves <= 12) return 2;
    return 1;
  };

  const handleCardClick = (cardId: string) => {
    if (memoryLocked || memoryDone || rewarding === "memory_match") return;
    const card = memoryCards.find((item) => item.id === cardId);
    if (!card || card.matched || card.revealed) return;

    const revealedCards = memoryCards.map((item) =>
      item.id === cardId ? { ...item, revealed: true } : item
    );

    if (!firstCard) {
      setMemoryCards(revealedCards);
      setFirstCard(cardId);
      return;
    }

    const first = revealedCards.find((item) => item.id === firstCard);
    const nextMoves = memoryMoves + 1;
    setMemoryMoves(nextMoves);
    setFirstCard(null);

    if (first?.symbol === card.symbol) {
      const matchedCards = revealedCards.map((item) =>
        item.symbol === card.symbol ? { ...item, matched: true, revealed: true } : item
      );
      const completed = matchedCards.every((item) => item.matched);
      setMemoryCards(matchedCards);
      if (completed) {
        const stars = getMemoryStars(nextMoves);
        const score = Math.max(300, 1600 - nextMoves * 90);
        setMemoryDone(true);
        void completeArcade("memory_match", score, stars);
      }
      return;
    }

    setMemoryCards(revealedCards);
    setMemoryLocked(true);
    window.setTimeout(() => {
      setMemoryCards((items) =>
        items.map((item) =>
          item.id === cardId || item.id === firstCard ? { ...item, revealed: false } : item
        )
      );
      setMemoryLocked(false);
    }, 650);
  };

  const getPuzzleStars = (moves: number) => {
    if (moves <= 35) return 3;
    if (moves <= 60) return 2;
    return 1;
  };

  const handlePuzzleClick = (index: number) => {
    if (puzzleDone || rewarding === "photo_puzzle") return;
    const emptyIndex = puzzleBoard.indexOf(EMPTY_TILE);
    if (!isAdjacent(index, emptyIndex, PUZZLE_SIZE)) return;
    const nextBoard = swapItems(puzzleBoard, index, emptyIndex);
    const nextMoves = puzzleMoves + 1;
    setPuzzleBoard(nextBoard);
    setPuzzleMoves(nextMoves);
    if (puzzleSolved(nextBoard)) {
      const stars = getPuzzleStars(nextMoves);
      const score = Math.max(300, 1800 - nextMoves * 20);
      setPuzzleDone(true);
      void completeArcade("photo_puzzle", score, stars);
    }
  };

  const renderHeader = (score: number, moves: number, stars?: number) => (
    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted">
      <div className="flex items-center gap-2">
        <span>{t("games.score", { n: String(score) })}</span>
        <span>{t("games.moves", { n: String(moves) })}</span>
      </div>
      {stars ? <span className="text-primary tracking-normal">{starText(stars)}</span> : null}
    </div>
  );

  const renderMatchThree = () => {
    const stars = matchDone ? getMatchStars(matchScore) : undefined;
    return (
      <div className="space-y-2.5">
        <div className="relative">
          {renderHeader(matchScore, matchMoves, stars)}
          {scorePopup && (
            <span key={scorePopup.key} className="absolute top-0 right-0 text-sm font-bold text-primary animate-bounce">
              +{scorePopup.points}
            </span>
          )}
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {matchBoard.map((symbol, index) => {
            const isMatched = matchedTiles?.has(index);
            const isSelected = selectedTile === index;
            return (
              <button
                key={`${symbol}-${index}`}
                onClick={() => handleTileClick(index)}
                disabled={matchDone || rewarding === "match_three" || Boolean(matchedTiles)}
                className={`aspect-square rounded-xl border text-lg sm:text-xl flex items-center justify-center transition-all duration-200 touch-manipulation ${
                  isMatched
                    ? "scale-90 opacity-60 ring-2 ring-primary/60 animate-pulse"
                    : isSelected
                      ? "scale-[0.92] ring-2 ring-primary shadow-[0_0_12px_rgba(168,85,247,0.35)] border-primary"
                      : `${SYMBOL_STYLES[symbol] || "border-card-border bg-card-bg"} hover:scale-105 hover:shadow-md`
                }`}
                style={isMatched ? { transition: "transform 0.3s, opacity 0.3s" } : undefined}
                title={symbol}
              >
                {symbol}
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-muted leading-relaxed">{t("games.match_three_hint")}</p>
          <button onClick={resetMatchThree} className="shrink-0 p-2 rounded-lg bg-card-bg border border-card-border hover:border-primary/50" title={t("games.restart")}>
            <RotateCcw size={14} />
          </button>
        </div>
      </div>
    );
  };

  const renderMemoryMatch = () => {
    const stars = memoryDone ? getMemoryStars(memoryMoves) : undefined;
    const matchedPairs = memoryCards.filter((card) => card.matched).length / 2;
    return (
      <div className="space-y-2.5">
        {renderHeader(Math.max(0, 1600 - memoryMoves * 90), memoryMoves, stars)}
        <div className="grid grid-cols-4 gap-2">
          {memoryCards.map((card) => {
            const faceUp = card.revealed || card.matched;
            return (
              <button
                key={card.id}
                onClick={() => handleCardClick(card.id)}
                disabled={memoryLocked || memoryDone || rewarding === "memory_match"}
                className={`aspect-[4/3] rounded-xl border text-xs font-medium flex items-center justify-center transition-all duration-300 touch-manipulation ${
                  card.matched
                    ? "border-primary/50 bg-primary/10 text-primary scale-95 opacity-80"
                    : faceUp
                      ? "border-primary/30 bg-surface text-foreground shadow-sm"
                      : "border-card-border bg-gradient-to-br from-violet-500/15 to-fuchsia-500/10 text-muted/60 hover:border-primary/40 hover:from-violet-500/20 hover:to-fuchsia-500/15"
                }`}
                style={{ transformStyle: "preserve-3d" }}
              >
                {faceUp ? card.symbol : "?"}
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted">{matchedPairs}/{memorySymbols.length}</span>
            <div className="w-20 h-1.5 bg-card-bg rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-accent-pink rounded-full transition-all duration-300"
                style={{ width: `${memorySymbols.length > 0 ? (matchedPairs / memorySymbols.length) * 100 : 0}%` }}
              />
            </div>
          </div>
          <button onClick={resetMemoryMatch} className="p-2 rounded-lg bg-card-bg border border-card-border hover:border-primary/50" title={t("games.restart")}>
            <RotateCcw size={14} />
          </button>
        </div>
      </div>
    );
  };

  const renderPhotoPuzzle = () => {
    const stars = puzzleDone ? getPuzzleStars(puzzleMoves) : undefined;
    const imageUrl = charAvatarUrl || "/avatars/hanmushu.jpg";
    return (
      <div className="space-y-2.5">
        {renderHeader(Math.max(0, 1800 - puzzleMoves * 20), puzzleMoves, stars)}
        <div className="grid grid-cols-3 gap-1.5 max-w-[16rem] mx-auto">
          {puzzleBoard.map((tile, index) => {
            const isEmpty = tile === EMPTY_TILE;
            const row = Math.floor(tile / PUZZLE_SIZE);
            const col = tile % PUZZLE_SIZE;
            return (
              <button
                key={`${tile}-${index}`}
                onClick={() => handlePuzzleClick(index)}
                disabled={isEmpty || puzzleDone || rewarding === "photo_puzzle"}
                className={`aspect-square rounded-xl border overflow-hidden transition-all duration-150 touch-manipulation ${
                  isEmpty
                    ? "border-dashed border-card-border/60 bg-card-bg/30"
                    : "border-card-border bg-card-bg hover:border-primary/50 hover:shadow-md active:scale-95"
                }`}
                style={
                  isEmpty
                    ? undefined
                    : {
                        backgroundImage: `url(${imageUrl})`,
                        backgroundSize: `${PUZZLE_SIZE * 100}% ${PUZZLE_SIZE * 100}%`,
                        backgroundPosition: `${(col / (PUZZLE_SIZE - 1)) * 100}% ${(row / (PUZZLE_SIZE - 1)) * 100}%`,
                      }
                }
                aria-label={isEmpty ? "empty" : `${charName} ${tile + 1}`}
              />
            );
          })}
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-muted leading-relaxed">{t("games.photo_puzzle_hint", { name: charName })}</p>
          <button onClick={resetPuzzle} className="shrink-0 p-2 rounded-lg bg-card-bg border border-card-border hover:border-primary/50" title={t("games.restart")}>
            <RotateCcw size={14} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <section className="p-3 bg-card-bg rounded-lg border border-card-border/70 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-xs font-semibold flex items-center gap-1.5">
            <Trophy size={13} className="text-amber-500" />
            {t("games.arcade_title")}
          </h4>
          <p className="text-[11px] text-muted mt-1 leading-relaxed">
            {t("games.arcade_subtitle", { name: charName })}
          </p>
        </div>
        {rewarding ? <Loader2 size={15} className="animate-spin text-primary shrink-0" /> : null}
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {games.map((game) => {
          const Icon = GAME_ICONS[game.type];
          return (
            <button
              key={game.type}
              onClick={() => setActiveGame(game.type)}
              className={`min-h-16 px-2 py-2 rounded-lg border text-left transition-colors ${
                activeGame === game.type
                  ? "border-primary bg-primary/10"
                  : "border-card-border bg-surface hover:border-primary/40"
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Icon size={13} className="text-primary" />
                <span className="text-[11px] font-semibold truncate">{game.title}</span>
              </div>
              <p className="text-[10px] text-muted truncate">+{game.reward} · {game.durationHint}</p>
            </button>
          );
        })}
      </div>

      {activeInfo ? (
        <div className="rounded-lg border border-card-border/70 bg-surface p-3 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold">{activeInfo.title}</p>
              <p className="text-[11px] text-muted leading-relaxed mt-0.5">{activeInfo.description}</p>
            </div>
            {(matchDone && activeGame === "match_three") || (memoryDone && activeGame === "memory_match") || (puzzleDone && activeGame === "photo_puzzle") ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-[10px] shrink-0">
                <CheckCircle2 size={11} />
                {t("games.complete_local")}
              </span>
            ) : null}
          </div>

          {activeGame === "match_three" && renderMatchThree()}
          {activeGame === "memory_match" && renderMemoryMatch()}
          {activeGame === "photo_puzzle" && renderPhotoPuzzle()}
        </div>
      ) : null}

      {error ? <p className="text-xs text-amber-500 leading-relaxed">{error}</p> : null}
    </section>
  );
}
