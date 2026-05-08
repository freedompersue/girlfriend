import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CREDIT_PACKS, type PlanType } from "@/lib/billing";
import {
  createCreemCheckout,
  getAppBaseUrl,
  getCreemProductIdForCreditPack,
  getCreemProductIdForPlan,
} from "@/lib/creem";

function buildSuccessUrl(type: "subscription" | "credits", selectionId: string) {
  const url = new URL("/api/billing/return", getAppBaseUrl());
  url.searchParams.set("type", type);

  if (type === "subscription") {
    url.searchParams.set("planId", selectionId);
  } else {
    url.searchParams.set("packId", selectionId);
  }

  return url.toString();
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  if (!process.env.CREEM_API_KEY) {
    return NextResponse.json({ error: "Creem 未配置" }, { status: 500 });
  }

  try {
    const { type, planId, packId } = await req.json();
    const existingSub = await prisma.subscription.findUnique({
      where: { userId: user.id },
      select: { creemCustomerId: true },
    });

    if (type === "subscription") {
      if (planId === "free") {
        return NextResponse.json({ error: "免费版无需支付" }, { status: 400 });
      }

      const productId = getCreemProductIdForPlan(planId as Exclude<PlanType, "free">);
      if (!productId) {
        return NextResponse.json({ error: "该会员套餐尚未配置 Creem 商品 ID" }, { status: 400 });
      }

      const checkout = await createCreemCheckout({
        productId,
        requestId: `subscription_${user.id}_${planId}_${Date.now()}`,
        successUrl: buildSuccessUrl("subscription", planId),
        customerId: existingSub?.creemCustomerId || undefined,
        customerEmail: user.email || undefined,
        metadata: {
          userId: user.id,
          type: "subscription",
          planId,
        },
      });

      return NextResponse.json({ url: checkout.checkout_url });
    }

    if (type === "credits") {
      const pack = CREDIT_PACKS.find((item) => item.id === packId);
      if (!pack) {
        return NextResponse.json({ error: "无效的积分包" }, { status: 400 });
      }

      const productId = getCreemProductIdForCreditPack(pack.id);
      if (!productId) {
        return NextResponse.json({ error: "该积分包尚未配置 Creem 商品 ID" }, { status: 400 });
      }

      const checkout = await createCreemCheckout({
        productId,
        requestId: `credits_${user.id}_${pack.id}_${Date.now()}`,
        successUrl: buildSuccessUrl("credits", pack.id),
        customerId: existingSub?.creemCustomerId || undefined,
        customerEmail: user.email || undefined,
        metadata: {
          userId: user.id,
          type: "credits",
          packId: pack.id,
          credits: pack.credits,
        },
      });

      return NextResponse.json({ url: checkout.checkout_url });
    }

    return NextResponse.json({ error: "无效的请求类型" }, { status: 400 });
  } catch (error) {
    console.error("Creem checkout error:", error);
    return NextResponse.json({ error: "创建支付失败" }, { status: 500 });
  }
}
