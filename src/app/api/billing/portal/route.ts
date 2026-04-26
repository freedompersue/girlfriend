import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const sub = await prisma.subscription.findUnique({ where: { userId: user.id } });
  if (!sub?.stripeCustomerId) {
    return NextResponse.json({ error: "未找到订阅信息" }, { status: 400 });
  }

  const baseUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${baseUrl}/pricing`,
  });

  return NextResponse.json({ url: session.url });
}
