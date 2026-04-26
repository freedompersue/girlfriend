import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getCredits, useCredits, CREDIT_COSTS } from "@/lib/billing";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const balance = await getCredits(user.id);
  return NextResponse.json({ balance, costs: CREDIT_COSTS });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { action, amount } = await req.json();

  const cost = CREDIT_COSTS[action as keyof typeof CREDIT_COSTS];
  if (!cost) {
    return NextResponse.json({ error: "无效的操作" }, { status: 400 });
  }

  const finalAmount = amount || cost;
  const success = await useCredits(user.id, finalAmount, `使用: ${action}`);

  if (!success) {
    return NextResponse.json({ error: "积分不足", code: "INSUFFICIENT_CREDITS" }, { status: 402 });
  }

  const newBalance = await getCredits(user.id);
  return NextResponse.json({ success: true, balance: newBalance });
}
