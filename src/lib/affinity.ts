import { prisma } from "./prisma";

export interface AffinityLevel {
  level: number;
  name: string;
  nameEn: string;
  nameJa: string;
  minScore: number;
  icon: string;
  perks: string[];
}

export const AFFINITY_LEVELS: AffinityLevel[] = [
  { level: 1, name: "初识", nameEn: "Stranger", nameJa: "初対面", minScore: 0, icon: "🌱", perks: [] },
  { level: 2, name: "熟悉", nameEn: "Familiar", nameJa: "顔見知り", minScore: 100, icon: "🌿", perks: ["unlock_casual_tone"] },
  { level: 3, name: "亲密", nameEn: "Close", nameJa: "親密", minScore: 300, icon: "🌸", perks: ["unlock_photos", "unlock_nicknames"] },
  { level: 4, name: "深爱", nameEn: "In Love", nameJa: "深愛", minScore: 600, icon: "💕", perks: ["unlock_memories", "unlock_voice_notes"] },
  { level: 5, name: "灵魂伴侣", nameEn: "Soulmate", nameJa: "ソウルメイト", minScore: 1000, icon: "💎", perks: ["unlock_all"] },
];

export function getLevelForScore(score: number): AffinityLevel {
  for (let i = AFFINITY_LEVELS.length - 1; i >= 0; i--) {
    if (score >= AFFINITY_LEVELS[i].minScore) return AFFINITY_LEVELS[i];
  }
  return AFFINITY_LEVELS[0];
}

export function getNextLevel(currentLevel: number): AffinityLevel | null {
  return AFFINITY_LEVELS.find((l) => l.level === currentLevel + 1) || null;
}

export function getProgressToNext(score: number): { current: number; needed: number; percent: number } {
  const level = getLevelForScore(score);
  const next = getNextLevel(level.level);
  if (!next) return { current: score, needed: score, percent: 100 };
  const rangeTotal = next.minScore - level.minScore;
  const rangeCurrent = score - level.minScore;
  return {
    current: rangeCurrent,
    needed: rangeTotal,
    percent: Math.min(100, Math.round((rangeCurrent / rangeTotal) * 100)),
  };
}

export async function addAffinity(
  userId: string,
  characterId: string,
  points: number,
  reason?: string
): Promise<{ score: number; level: number; levelUp: boolean; levelInfo: AffinityLevel }> {
  const affinity = await prisma.affinity.upsert({
    where: { userId_characterId: { userId, characterId } },
    update: { score: { increment: points } },
    create: { userId, characterId, score: 50 + points },
  });

  const newLevel = getLevelForScore(affinity.score);
  const levelUp = newLevel.level > affinity.level;

  if (levelUp) {
    await prisma.affinity.update({
      where: { id: affinity.id },
      data: { level: newLevel.level },
    });
  }

  return { score: affinity.score, level: newLevel.level, levelUp, levelInfo: newLevel };
}

export async function getAffinity(userId: string, characterId: string) {
  const affinity = await prisma.affinity.findUnique({
    where: { userId_characterId: { userId, characterId } },
  });
  const score = affinity?.score ?? 50;
  const levelInfo = getLevelForScore(score);
  const progress = getProgressToNext(score);
  const next = getNextLevel(levelInfo.level);
  return { score, level: levelInfo.level, levelInfo, progress, nextLevel: next };
}

export function getAffinityPromptHint(level: number): string {
  switch (level) {
    case 1: return "你们刚认识，保持礼貌和好奇。";
    case 2: return "你们已经比较熟悉了，可以更自然、随意地聊天。";
    case 3: return "你们关系亲密，可以撒娇、用昵称、偶尔发照片。";
    case 4: return "你们深深相爱，可以非常亲密、说甜蜜情话、分享内心想法。";
    case 5: return "你们是灵魂伴侣，完全信任和了解彼此，可以无话不谈。";
    default: return "";
  }
}
