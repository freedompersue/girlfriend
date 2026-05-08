import { prisma } from "./prisma";
import { PLANS, type PlanType, type PlanConfig } from "./billing-plans";

export { PLANS, CREDIT_PACKS, CREDIT_COSTS, type PlanType, type PlanConfig } from "./billing-plans";

export async function getUserPlan(userId: string): Promise<PlanType> {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub) return "free";
  if (sub.currentPeriodEnd && sub.currentPeriodEnd < new Date()) return "free";

  const activeStatuses = new Set(["active", "trialing", "past_due", "canceled", "scheduled_cancel"]);
  if (!activeStatuses.has(sub.status)) return "free";

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

export async function canUseFeature(userId: string, feature: keyof Pick<PlanConfig, "hasVoice" | "hasPhotos" | "hasMoodDiary" | "hasGoodnight" | "hasMemory" | "hasExternalLink" | "hasHealing">): Promise<boolean> {
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

export async function addCredits(
  userId: string,
  amount: number,
  description: string,
  payment?: {
    provider?: string;
    stripePaymentId?: string;
    creemCheckoutId?: string;
    creemOrderId?: string;
    creemTransactionId?: string;
    creemSubscriptionId?: string;
    status?: string;
  }
): Promise<void> {
  await prisma.$transaction([
    prisma.creditBalance.upsert({
      where: { userId },
      update: { balance: { increment: amount } },
      create: { userId, balance: amount },
    }),
    prisma.transaction.create({
      data: {
        userId,
        type: "credit_purchase",
        amount: 0,
        credits: amount,
        description,
        provider: payment?.provider,
        stripePaymentId: payment?.stripePaymentId,
        creemCheckoutId: payment?.creemCheckoutId,
        creemOrderId: payment?.creemOrderId,
        creemTransactionId: payment?.creemTransactionId,
        creemSubscriptionId: payment?.creemSubscriptionId,
        status: payment?.status || "completed",
      },
    }),
  ]);
}

export async function hasProcessedCreemCheckout(checkoutId: string): Promise<boolean> {
  const transaction = await prisma.transaction.findUnique({
    where: { creemCheckoutId: checkoutId },
    select: { id: true },
  });

  return Boolean(transaction);
}

export async function hasProcessedCreemTransaction(transactionId: string): Promise<boolean> {
  const transaction = await prisma.transaction.findUnique({
    where: { creemTransactionId: transactionId },
    select: { id: true },
  });

  return Boolean(transaction);
}

export async function recordCreemSubscriptionPayment(input: {
  userId: string;
  plan: PlanType;
  amount: number;
  description: string;
  checkoutId?: string | null;
  orderId?: string | null;
  transactionId?: string | null;
  subscriptionId?: string | null;
  status?: string;
}): Promise<void> {
  await prisma.transaction.create({
    data: {
      userId: input.userId,
      type: "subscription",
      amount: input.amount,
      description: input.description,
      provider: "creem",
      creemCheckoutId: input.checkoutId || undefined,
      creemOrderId: input.orderId || undefined,
      creemTransactionId: input.transactionId || undefined,
      creemSubscriptionId: input.subscriptionId || undefined,
      status: input.status || "completed",
    },
  });
}

export async function markCreemTransactionStatus(
  transactionId: string,
  status: string
): Promise<void> {
  await prisma.transaction.updateMany({
    where: { OR: [{ creemTransactionId: transactionId }, { creemOrderId: transactionId }] },
    data: { status },
  });
}

export async function markSubscriptionTransactionsStatus(
  subscriptionId: string,
  status: string
): Promise<void> {
  await prisma.transaction.updateMany({
    where: { creemSubscriptionId: subscriptionId },
    data: { status },
  });
}

export async function findUserIdByCreemCustomerId(customerId: string): Promise<string | null> {
  const sub = await prisma.subscription.findFirst({
    where: { creemCustomerId: customerId },
    select: { userId: true },
  });

  return sub?.userId || null;
}

export async function findUserIdByEmail(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  return user?.id || null;
}

export async function upsertSubscriptionRecord(input: {
  userId: string;
  plan: PlanType;
  status: string;
  creemCustomerId?: string | null;
  creemSubscriptionId?: string | null;
  creemProductId?: string | null;
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
  cancelAtPeriodEnd?: boolean;
}): Promise<void> {
  const existing = await prisma.subscription.findUnique({
    where: { userId: input.userId },
    select: { id: true },
  });

  if (existing) {
    await prisma.subscription.update({
      where: { userId: input.userId },
      data: {
        plan: input.plan,
        status: input.status,
        creemCustomerId: input.creemCustomerId || undefined,
        creemSubscriptionId: input.creemSubscriptionId || undefined,
        creemProductId: input.creemProductId || undefined,
        currentPeriodStart: input.currentPeriodStart,
        currentPeriodEnd: input.currentPeriodEnd,
        cancelAtPeriodEnd: input.cancelAtPeriodEnd ?? false,
      },
    });
    return;
  }

  await prisma.subscription.create({
    data: {
      userId: input.userId,
      plan: input.plan,
      status: input.status,
      creemCustomerId: input.creemCustomerId || undefined,
      creemSubscriptionId: input.creemSubscriptionId || undefined,
      creemProductId: input.creemProductId || undefined,
      currentPeriodStart: input.currentPeriodStart,
      currentPeriodEnd: input.currentPeriodEnd,
      cancelAtPeriodEnd: input.cancelAtPeriodEnd ?? false,
    },
  });
}
