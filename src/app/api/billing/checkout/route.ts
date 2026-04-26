import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { PLANS, CREDIT_PACKS, type PlanType } from "@/lib/billing";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { type, planId, packId } = await req.json();
  const baseUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe 未配置" }, { status: 500 });
  }

  try {
    let sub = await prisma.subscription.findUnique({ where: { userId: user.id } });

    let customerId = sub?.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        name: user.name || undefined,
        metadata: { userId: user.id },
      });
      customerId = customer.id;

      if (sub) {
        await prisma.subscription.update({ where: { userId: user.id }, data: { stripeCustomerId: customerId } });
      } else {
        sub = await prisma.subscription.create({
          data: { userId: user.id, plan: "free", status: "active", stripeCustomerId: customerId },
        });
      }
    }

    if (type === "subscription") {
      const plan = PLANS[planId as PlanType];
      if (!plan || !plan.stripePriceId) {
        return NextResponse.json({ error: "无效的套餐" }, { status: 400 });
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        line_items: [{ price: plan.stripePriceId, quantity: 1 }],
        success_url: `${baseUrl}/pricing?success=true`,
        cancel_url: `${baseUrl}/pricing?canceled=true`,
        metadata: { userId: user.id, planId },
      });

      return NextResponse.json({ url: session.url });
    }

    if (type === "credits") {
      const pack = CREDIT_PACKS.find((p) => p.id === packId);
      if (!pack || !pack.stripePriceId) {
        return NextResponse.json({ error: "无效的积分包" }, { status: 400 });
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "payment",
        line_items: [{ price: pack.stripePriceId, quantity: 1 }],
        success_url: `${baseUrl}/pricing?credits_success=true`,
        cancel_url: `${baseUrl}/pricing?canceled=true`,
        metadata: { userId: user.id, packId, credits: String(pack.credits) },
      });

      return NextResponse.json({ url: session.url });
    }

    return NextResponse.json({ error: "无效的请求类型" }, { status: 400 });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "创建支付失败" }, { status: 500 });
  }
}
