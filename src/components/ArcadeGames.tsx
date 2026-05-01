"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
type ArcadeGameType = "match_three" | "memory_match" | "photo_puzzle" | "gomoku";

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
  "gomoku",
];

const MATCH_SIZE = 5;
const PUZZLE_SIZE = 3;
const GOMOKU_SIZE = 9;
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
  gomoku: Grid3X3,
};

/* ─── Particle burst effect ─── */
interface BurstParticle {
  id: number;
  x: number;
  y: number;
  emoji: string;
  angle: number;
  dist: number;
  scale: number;
}

function BurstEffect({ particles }: { particles: BurstParticle[] }) {
  return (
    <span className="pointer-events-none absolute inset-0 overflow-visible" aria-hidden>
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute animate-match-burst"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            fontSize: `${14 * p.scale}px`,
            transform: `translate(-50%,-50%) rotate(${p.angle}rad)`,
            opacity: 0,
          }}
        >
          {p.emoji}
        </span>
      ))}
    </span>
  );
}

function createBurstParticles(tileIndices: number[], symbols: string[]): BurstParticle[] {
  const particles: BurstParticle[] = [];
  let id = 0;
  const sparkles = ["✨", "💫", "⭐", "🌟", "💥"];
  for (const idx of tileIndices) {
    const row = Math.floor(idx / MATCH_SIZE);
    const col = idx % MATCH_SIZE;
    const cx = (col + 0.5) * (100 / MATCH_SIZE);
    const cy = (row + 0.5) * (100 / MATCH_SIZE);
    const symbol = symbols[idx];
    // Main symbol burst
    particles.push({ id: id++, x: cx, y: cy, emoji: symbol, angle: Math.random() * Math.PI * 2, dist: 20 + Math.random() * 30, scale: 0.8 + Math.random() * 0.5 });
    // Sparkle particles
    for (let i = 0; i < 3; i++) {
      particles.push({
        id: id++,
        x: cx,
        y: cy,
        emoji: sparkles[Math.floor(Math.random() * sparkles.length)],
        angle: (Math.PI * 2 * i) / 3 + Math.random() * 0.8,
        dist: 15 + Math.random() * 40,
        scale: 0.5 + Math.random() * 0.4,
      });
    }
  }
  return particles;
}

/* ─── Utility functions ─── */
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

/* ─── Gomoku AI ─── */
type GomokuCell = 0 | 1 | 2; // 0=empty, 1=player(black), 2=AI(white)

function createGomokuBoard(): GomokuCell[] {
  return Array(GOMOKU_SIZE * GOMOKU_SIZE).fill(0) as GomokuCell[];
}

const GOMOKU_DIRS = [
  [0, 1], [1, 0], [1, 1], [1, -1],
];

function checkGomokuWin(board: GomokuCell[], player: GomokuCell): boolean {
  for (let r = 0; r < GOMOKU_SIZE; r++) {
    for (let c = 0; c < GOMOKU_SIZE; c++) {
      if (board[r * GOMOKU_SIZE + c] !== player) continue;
      for (const [dr, dc] of GOMOKU_DIRS) {
        let count = 1;
        for (let i = 1; i < 5; i++) {
          const nr = r + dr * i;
          const nc = c + dc * i;
          if (nr < 0 || nr >= GOMOKU_SIZE || nc < 0 || nc >= GOMOKU_SIZE) break;
          if (board[nr * GOMOKU_SIZE + nc] !== player) break;
          count++;
        }
        if (count >= 5) return true;
      }
    }
  }
  return false;
}

function isBoardFull(board: GomokuCell[]): boolean {
  return board.every((cell) => cell !== 0);
}

function scoreGomokuLine(count: number, openEnds: number): number {
  if (count >= 5) return 100000;
  if (count === 4) {
    if (openEnds === 2) return 50000;
    if (openEnds === 1) return 8000;
  }
  if (count === 3) {
    if (openEnds === 2) return 4000;
    if (openEnds === 1) return 800;
  }
  if (count === 2) {
    if (openEnds === 2) return 400;
    if (openEnds === 1) return 80;
  }
  if (count === 1) {
    if (openEnds === 2) return 40;
    if (openEnds === 1) return 8;
  }
  return 0;
}

function evaluateGomokuPosition(board: GomokuCell[], player: GomokuCell): number {
  const opponent: GomokuCell = player === 1 ? 2 : 1;
  let score = 0;

  for (let r = 0; r < GOMOKU_SIZE; r++) {
    for (let c = 0; c < GOMOKU_SIZE; c++) {
      for (const [dr, dc] of GOMOKU_DIRS) {
        const er = r + dr * 4;
        const ec = c + dc * 4;
        if (er < 0 || er >= GOMOKU_SIZE || ec < 0 || ec >= GOMOKU_SIZE) continue;

        let pCount = 0, oCount = 0;
        for (let i = 0; i < 5; i++) {
          const cell = board[(r + dr * i) * GOMOKU_SIZE + (c + dc * i)];
          if (cell === player) pCount++;
          else if (cell === opponent) oCount++;
        }

        if (oCount === 0 && pCount > 0) {
          let openEnds = 0;
          // Check before
          const br = r - dr, bc = c - dc;
          if (br >= 0 && br < GOMOKU_SIZE && bc >= 0 && bc < GOMOKU_SIZE && board[br * GOMOKU_SIZE + bc] === 0) openEnds++;
          // Check after
          const ar = r + dr * 5, ac = c + dc * 5;
          if (ar >= 0 && ar < GOMOKU_SIZE && ac >= 0 && ac < GOMOKU_SIZE && board[ar * GOMOKU_SIZE + ac] === 0) openEnds++;
          score += scoreGomokuLine(pCount, openEnds);
        }
      }
    }
  }
  return score;
}

function getGomokuAIMove(board: GomokuCell[]): number {
  // If board is empty, play center
  if (board.every((c) => c === 0)) {
    return Math.floor(GOMOKU_SIZE / 2) * GOMOKU_SIZE + Math.floor(GOMOKU_SIZE / 2);
  }

  let bestScore = -1;
  let bestMoves: number[] = [];

  // Only consider cells adjacent to existing stones
  const candidates = new Set<number>();
  for (let i = 0; i < board.length; i++) {
    if (board[i] === 0) continue;
    const r = Math.floor(i / GOMOKU_SIZE);
    const c = i % GOMOKU_SIZE;
    for (let dr = -2; dr <= 2; dr++) {
      for (let dc = -2; dc <= 2; dc++) {
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nr >= GOMOKU_SIZE || nc < 0 || nc >= GOMOKU_SIZE) continue;
        const ni = nr * GOMOKU_SIZE + nc;
        if (board[ni] === 0) candidates.add(ni);
      }
    }
  }

  if (candidates.size === 0) return board.indexOf(0);

  for (const pos of candidates) {
    // Score for AI playing here (offensive)
    board[pos] = 2;
    const attackScore = evaluateGomokuPosition(board, 2);
    board[pos] = 0;

    // Score for blocking player (defensive)
    board[pos] = 1;
    const defendScore = evaluateGomokuPosition(board, 1);
    board[pos] = 0;

    const totalScore = attackScore * 1.1 + defendScore;
    if (totalScore > bestScore) {
      bestScore = totalScore;
      bestMoves = [pos];
    } else if (totalScore === bestScore) {
      bestMoves.push(pos);
    }
  }

  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

/* ─── Main Component ─── */
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
  const [burstParticles, setBurstParticles] = useState<BurstParticle[]>([]);

  const [memoryCards, setMemoryCards] = useState(() => createMemoryCards(memorySymbols));
  const [firstCard, setFirstCard] = useState<string | null>(null);
  const [memoryMoves, setMemoryMoves] = useState(0);
  const [memoryLocked, setMemoryLocked] = useState(false);
  const [memoryDone, setMemoryDone] = useState(false);

  const [puzzleBoard, setPuzzleBoard] = useState(createPuzzleBoard);
  const [puzzleMoves, setPuzzleMoves] = useState(0);
  const [puzzleDone, setPuzzleDone] = useState(false);

  // Gomoku state
  const [gomokuBoard, setGomokuBoard] = useState(createGomokuBoard);
  const [gomokuTurn, setGomokuTurn] = useState<1 | 2>(1); // 1=player, 2=AI
  const [gomokuWinner, setGomokuWinner] = useState<0 | 1 | 2 | 3>(0); // 0=none, 1=player, 2=AI, 3=draw
  const [gomokuLastMove, setGomokuLastMove] = useState<number | null>(null);
  const gomokuAIRef = useRef(false);

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

  // Gomoku AI effect
  useEffect(() => {
    if (activeGame !== "gomoku" || gomokuTurn !== 2 || gomokuWinner !== 0 || gomokuAIRef.current) return;
    gomokuAIRef.current = true;

    const timer = window.setTimeout(() => {
      setGomokuBoard((prev) => {
        const move = getGomokuAIMove(prev);
        const next = [...prev] as GomokuCell[];
        next[move] = 2;
        setGomokuLastMove(move);

        if (checkGomokuWin(next, 2)) {
          setGomokuWinner(2);
          setGomokuTurn(1);
        } else if (isBoardFull(next)) {
          setGomokuWinner(3);
          setGomokuTurn(1);
        } else {
          setGomokuTurn(1);
        }
        gomokuAIRef.current = false;
        return next;
      });
    }, 400);
    return () => {
      window.clearTimeout(timer);
      gomokuAIRef.current = false;
    };
  }, [activeGame, gomokuTurn, gomokuWinner]);

  const completeArcade = useCallback(async (gameType: ArcadeGameType, score: number, stars: number) => {
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
  }, [rewarding, locale, t, onComplete]);

  const resetMatchThree = () => {
    setMatchBoard(createMatchBoard());
    setSelectedTile(null);
    setMatchMoves(15);
    setMatchScore(0);
    setMatchDone(false);
    setMatchedTiles(null);
    setScorePopup(null);
    setBurstParticles([]);
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

  const resetGomoku = () => {
    setGomokuBoard(createGomokuBoard());
    setGomokuTurn(1);
    setGomokuWinner(0);
    setGomokuLastMove(null);
    gomokuAIRef.current = false;
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

    // Highlight matched tiles + burst particles
    setMatchedTiles(immediateMatches);
    setBurstParticles(createBurstParticles([...immediateMatches], swapped));
    const capturedScore = matchScore;
    window.setTimeout(() => {
      const resolved = resolveMatchBoard(swapped);
      const earnedPoints = resolved.cleared * 80 + Math.max(0, resolved.cleared - 3) * 25;
      const nextScore = capturedScore + earnedPoints;
      setMatchBoard(resolved.board);
      setMatchScore(nextScore);
      setMatchedTiles(null);
      setBurstParticles([]);
      setScorePopup({ points: earnedPoints, key: Date.now() });
      window.setTimeout(() => setScorePopup(null), 800);
      if (nextScore >= 1200 || nextMoves === 0) {
        const stars = getMatchStars(nextScore);
        setMatchDone(true);
        void completeArcade("match_three", nextScore, stars);
      }
    }, 380);
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

  const handleGomokuClick = (index: number) => {
    if (gomokuTurn !== 1 || gomokuWinner !== 0 || rewarding === "gomoku") return;
    if (gomokuBoard[index] !== 0) return;

    const next = [...gomokuBoard] as GomokuCell[];
    next[index] = 1;
    setGomokuBoard(next);
    setGomokuLastMove(index);

    if (checkGomokuWin(next, 1)) {
      setGomokuWinner(1);
      const stars = 3;
      void completeArcade("gomoku", 1500, stars);
    } else if (isBoardFull(next)) {
      setGomokuWinner(3);
      const stars = 2;
      void completeArcade("gomoku", 800, stars);
    } else {
      setGomokuTurn(2);
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
        <div className="relative grid grid-cols-5 gap-1 mx-auto" style={{ maxWidth: "15rem" }}>
          {matchBoard.map((symbol, index) => {
            const isMatched = matchedTiles?.has(index);
            const isSelected = selectedTile === index;
            return (
              <button
                key={`${symbol}-${index}`}
                onClick={() => handleTileClick(index)}
                disabled={matchDone || rewarding === "match_three" || Boolean(matchedTiles)}
                className={`aspect-square rounded-lg border text-sm flex items-center justify-center transition-all duration-200 touch-manipulation ${
                  isMatched
                    ? "scale-0 opacity-0 animate-match-shrink"
                    : isSelected
                      ? "scale-[0.92] ring-2 ring-primary shadow-[0_0_12px_rgba(168,85,247,0.35)] border-primary"
                      : `${SYMBOL_STYLES[symbol] || "border-card-border bg-card-bg"} hover:scale-105 hover:shadow-md`
                }`}
                title={symbol}
              >
                {symbol}
              </button>
            );
          })}
          {burstParticles.length > 0 && <BurstEffect particles={burstParticles} />}
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

  const renderGomoku = () => {
    const statusText =
      gomokuWinner === 1 ? t("games.gomoku_you_win", { name: charName }) :
      gomokuWinner === 2 ? t("games.gomoku_ai_wins", { name: charName }) :
      gomokuWinner === 3 ? t("games.gomoku_draw") :
      gomokuTurn === 1 ? t("games.gomoku_your_turn") :
      t("games.gomoku_thinking", { name: charName });

    return (
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <span className={`font-medium ${gomokuWinner === 1 ? "text-green-400" : gomokuWinner === 2 ? "text-amber-400" : gomokuWinner === 3 ? "text-muted" : "text-muted"}`}>
            {statusText}
          </span>
          {gomokuWinner !== 0 && (
            <span className="text-primary tracking-normal">{starText(gomokuWinner === 1 ? 3 : 2)}</span>
          )}
        </div>
        <div className="mx-auto" style={{ maxWidth: "18rem" }}>
          <div
            className="grid gap-0 mx-auto bg-amber-900/20 border border-amber-800/30 rounded-lg p-1"
            style={{
              gridTemplateColumns: `repeat(${GOMOKU_SIZE}, 1fr)`,
              aspectRatio: "1",
            }}
          >
            {gomokuBoard.map((cell, index) => {
              const row = Math.floor(index / GOMOKU_SIZE);
              const col = index % GOMOKU_SIZE;
              const isLast = gomokuLastMove === index;
              const isEdge = row === 0 || row === GOMOKU_SIZE - 1 || col === 0 || col === GOMOKU_SIZE - 1;
              // Intersection dot for star points
              const isStarPoint =
                (row === 2 && col === 2) || (row === 2 && col === 6) ||
                (row === 6 && col === 2) || (row === 6 && col === 6) ||
                (row === 4 && col === 4);

              return (
                <button
                  key={`g-${index}`}
                  onClick={() => handleGomokuClick(index)}
                  disabled={gomokuTurn !== 1 || gomokuWinner !== 0 || cell !== 0}
                  className="relative flex items-center justify-center transition-colors touch-manipulation"
                  style={{ aspectRatio: "1" }}
                >
                  {/* Grid lines */}
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="absolute bg-amber-800/25" style={{
                      height: "1px",
                      left: isEdge && col === 0 ? "50%" : 0,
                      right: isEdge && col === GOMOKU_SIZE - 1 ? "50%" : 0,
                      top: "50%",
                    }} />
                    <span className="absolute bg-amber-800/25" style={{
                      width: "1px",
                      top: isEdge && row === 0 ? "50%" : 0,
                      bottom: isEdge && row === GOMOKU_SIZE - 1 ? "50%" : 0,
                      left: "50%",
                    }} />
                    {isStarPoint && cell === 0 && (
                      <span className="absolute w-1.5 h-1.5 bg-amber-700/40 rounded-full" />
                    )}
                  </span>
                  {/* Stone */}
                  {cell !== 0 && (
                    <span
                      className={`relative z-10 rounded-full transition-all duration-200 ${
                        cell === 1
                          ? "bg-gradient-to-br from-gray-700 to-gray-900 shadow-md border border-gray-600/50"
                          : "bg-gradient-to-br from-white to-gray-200 shadow-md border border-gray-300/50"
                      } ${isLast ? "ring-2 ring-primary/70" : ""}`}
                      style={{
                        width: "72%",
                        height: "72%",
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-muted leading-relaxed">
            {t("games.gomoku_hint", { name: charName })}
          </p>
          <button onClick={resetGomoku} className="shrink-0 p-2 rounded-lg bg-card-bg border border-card-border hover:border-primary/50" title={t("games.restart")}>
            <RotateCcw size={14} />
          </button>
        </div>
      </div>
    );
  };

  const isGameDone = (type: ArcadeGameType) => {
    if (type === "match_three") return matchDone;
    if (type === "memory_match") return memoryDone;
    if (type === "photo_puzzle") return puzzleDone;
    if (type === "gomoku") return gomokuWinner !== 0;
    return false;
  };

  // Grid columns: 4 games → grid-cols-4 on bigger screens, 2 cols on mobile
  const gameCount = games.length;

  return (
    <>
      <style>{`
        @keyframes match-burst {
          0% { opacity: 1; transform: translate(-50%,-50%) scale(1); }
          50% { opacity: 1; }
          100% { opacity: 0; transform: translate(-50%,-50%) scale(0.3); }
        }
        .animate-match-burst {
          animation: match-burst 0.5s ease-out forwards;
        }
        @keyframes match-shrink {
          0% { transform: scale(1); opacity: 1; }
          40% { transform: scale(1.15) rotate(5deg); opacity: 0.8; }
          100% { transform: scale(0) rotate(20deg); opacity: 0; }
        }
        .animate-match-shrink {
          animation: match-shrink 0.35s ease-in forwards;
        }
      `}</style>
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

        <div className={`grid gap-1.5 ${gameCount <= 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4"}`}>
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
              {isGameDone(activeGame) ? (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-[10px] shrink-0">
                  <CheckCircle2 size={11} />
                  {t("games.complete_local")}
                </span>
              ) : null}
            </div>

            {activeGame === "match_three" && renderMatchThree()}
            {activeGame === "memory_match" && renderMemoryMatch()}
            {activeGame === "photo_puzzle" && renderPhotoPuzzle()}
            {activeGame === "gomoku" && renderGomoku()}
          </div>
        ) : null}

        {error ? <p className="text-xs text-amber-500 leading-relaxed">{error}</p> : null}
      </section>
    </>
  );
}
