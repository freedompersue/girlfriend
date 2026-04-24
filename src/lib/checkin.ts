import { prisma } from "./prisma";
import { addAffinity } from "./affinity";

function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function getYesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

const STREAK_REWARDS: Record<number, number> = {
  3: 10,
  7: 25,
  14: 50,
  30: 100,
};

export async function doCheckIn(userId: string, characterId: string) {
  const today = getTodayStr();

  const existing = await prisma.checkIn.findUnique({
    where: { userId_date: { userId, date: today } },
  });

  if (existing) {
    return { alreadyCheckedIn: true, streak: existing.streak, reward: 0 };
  }

  const yesterday = await prisma.checkIn.findUnique({
    where: { userId_date: { userId, date: getYesterdayStr() } },
  });

  const streak = yesterday ? yesterday.streak + 1 : 1;
  const baseReward = 5;
  const streakBonus = STREAK_REWARDS[streak] || Math.min(streak, 10);
  const totalReward = baseReward + streakBonus;

  await prisma.checkIn.create({
    data: { userId, date: today, streak, reward: totalReward },
  });

  const result = await addAffinity(userId, characterId, totalReward, "daily_checkin");

  return {
    alreadyCheckedIn: false,
    streak,
    reward: totalReward,
    affinityScore: result.score,
    levelUp: result.levelUp,
    levelInfo: result.levelInfo,
  };
}

export async function getCheckInStatus(userId: string) {
  const today = getTodayStr();
  const todayRecord = await prisma.checkIn.findUnique({
    where: { userId_date: { userId, date: today } },
  });

  const latest = await prisma.checkIn.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  const totalDays = await prisma.checkIn.count({ where: { userId } });

  return {
    checkedInToday: !!todayRecord,
    currentStreak: todayRecord?.streak ?? latest?.streak ?? 0,
    totalDays,
  };
}
