import { prisma } from "./prisma";
import { PLANS, CREDIT_COSTS, type PlanType, type PlanConfig } from "./billing-plans";

export { PLANS, CREDIT_PACKS, CREDIT_COSTS, type PlanType, type PlanConfig } from "./billing-plans";

export async function getUserPlan(userId: string): Promise<PlanType> {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub) return "free";
  if (sub.status !== "active") return "free";
  if (sub.currentPeriodEnd && sub.currentPeriodEnd < new Date()) return "free";
  return sub.plan as PlanType;
}

export async function getUserPlanConfig(userId: string): Promise<PlanConfig> {
  const plan = await getUserPlan(userId);
  return PLANS[plan];
}

export async function getDailyMessageCount(userId: string): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return prisma.message.count({
    where: {
      userId,
      role: "user",
      createdAt: { gte: today },
    },
  });
}

export async function canSendMessage(userId: string): Promise<{ allowed: boolean; remaining: number; plan: PlanType }> {
  const plan = await getUserPlan(userId);
  const config = PLANS[plan];

  if (config.dailyMessages === -1) {
    return { allowed: true, remaining: -1, plan };
  }

  const count = await getDailyMessageCount(userId);
  const remaining = Math.max(0, config.dailyMessages - count);
  return { allowed: remaining > 0, remaining, plan };
}

export async function canUseFeature(userId: string, feature: keyof Pick<PlanConfig, "hasVoice" | "hasPhotos" | "hasMoodDiary" | "hasGoodnight" | "hasMemory" | "hasExternalLink">): Promise<boolean> {
  const config = await getUserPlanConfig(userId);
  return config[feature];
}

export async function getCredits(userId: string): Promise<number> {
  const balance = await prisma.creditBalance.findUnique({ where: { userId } });
  return balance?.balance ?? 0;
}

export async function useCredits(userId: string, amount: number, description: string): Promise<boolean> {
  const balance = await prisma.creditBalance.findUnique({ where: { userId } });
  if (!balance || balance.balance < amount) return false;

  await prisma.$transaction([
    prisma.creditBalance.update({
      where: { userId },
      data: { balance: { decrement: amount }, totalUsed: { increment: amount } },
    }),
    prisma.transaction.create({
      data: { userId, type: "credit_use", amount: 0, credits: -amount, description, status: "completed" },
    }),
  ]);

  return true;
}

export async function addCredits(userId: string, amount: number, description: string, stripePaymentId?: string): Promise<void> {
  await prisma.$transaction([
    prisma.creditBalance.upsert({
      where: { userId },
      update: { balance: { increment: amount } },
      create: { userId, balance: amount },
    }),
    prisma.transaction.create({
      data: { userId, type: "credit_purchase", amount: 0, credits: amount, description, stripePaymentId, status: "completed" },
    }),
  ]);
}
