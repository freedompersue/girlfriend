import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCreemCustomerPortalLink } from "@/lib/creem";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  if (!process.env.CREEM_API_KEY) {
    return NextResponse.json({ error: "Creem 未配置" }, { status: 500 });
  }

  const sub = await prisma.subscription.findUnique({
    where: { userId: user.id },
    select: { creemCustomerId: true },
  });

  if (!sub?.creemCustomerId) {
    return NextResponse.json({ error: "未找到订阅信息" }, { status: 400 });
  }

  try {
    const session = await getCreemCustomerPortalLink(sub.creemCustomerId);
    return NextResponse.json({ url: session.customer_portal_link });
  } catch (error) {
    console.error("Creem portal error:", error);
    return NextResponse.json({ error: "打开账单中心失败" }, { status: 500 });
  }
}
