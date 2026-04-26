import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUserPlan, canSendMessage, getCredits, PLANS } from "@/lib/billing";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const plan = await getUserPlan(user.id);
  const config = PLANS[plan];
  const msgStatus = await canSendMessage(user.id);
  const credits = await getCredits(user.id);

  const sub = await prisma.subscription.findUnique({ where: { userId: user.id } });

  return NextResponse.json({
    plan,
    planConfig: config,
    messagesRemaining: msgStatus.remaining,
    canSendMessage: msgStatus.allowed,
    credits,
    subscription: sub ? {
      status: sub.status,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      currentPeriodEnd: sub.currentPeriodEnd,
    } : null,
  });
}
