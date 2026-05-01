import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUserPlan } from "@/lib/billing";
import {
  acceptHealingNotice,
  canAccessHealing,
  completeHealingSession,
  getHealingOverview,
  sendHealingMessage,
  startHealingSession,
  type HealingMode,
} from "@/lib/healing";
import type { Locale } from "@/lib/i18n";

const HEALING_MODES: HealingMode[] = ["mirror", "anchor", "breath", "grounding", "companion"];

function normalizeLocale(value: unknown): Locale {
  return value === "en" || value === "ja" || value === "zh" ? value : "zh";
}

function normalizeRating(value: unknown) {
  const rating = Number(value);
  if (!Number.isFinite(rating)) return undefined;
  return Math.max(1, Math.min(5, Math.round(rating)));
}

async function getAuthedHealingContext() {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "未登录" }, { status: 401 }) };
  if (!user.selectedCharacterId || !user.selectedCharacter) {
    return { error: NextResponse.json({ error: "未选择角色" }, { status: 400 }) };
  }

  const plan = await getUserPlan(user.id);
  if (!canAccessHealing(plan)) {
    return {
      error: NextResponse.json(
        { error: "疗愈模式是 Pro 专属功能", code: "HEALING_PRO_ONLY", plan },
        { status: 403 }
      ),
    };
  }

  return { user, plan };
}

export async function GET() {
  const context = await getAuthedHealingContext();
  if (context.error) return context.error;

  try {
    const overview = await getHealingOverview({
      userId: context.user.id,
      characterId: context.user.selectedCharacterId!,
      plan: context.plan,
    });
    return NextResponse.json(overview);
  } catch (error) {
    console.error("[healing GET error]", error);
    return NextResponse.json({ error: "疗愈模式暂时不可用" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const context = await getAuthedHealingContext();
  if (context.error) return context.error;

  try {
    const body = await req.json();
    const action = String(body.action || "");
    const locale = normalizeLocale(body.locale);

    if (action === "accept_notice") {
      const noticeAccepted = await acceptHealingNotice(
        context.user.id,
        context.user.selectedCharacterId!
      );
      return NextResponse.json({ noticeAccepted });
    }

    if (action === "start") {
      const mode = HEALING_MODES.includes(body.mode) ? body.mode : "mirror";
      const session = await startHealingSession({
        userId: context.user.id,
        characterId: context.user.selectedCharacterId!,
        mode,
        checkInBefore: normalizeRating(body.checkInBefore),
      });
      return NextResponse.json({ session });
    }

    if (action === "message") {
      const sessionId = String(body.sessionId || "");
      const message = String(body.message || "").trim();
      if (!sessionId) return NextResponse.json({ error: "缺少疗愈会话" }, { status: 400 });
      if (!message) return NextResponse.json({ error: "内容不能为空" }, { status: 400 });

      const result = await sendHealingMessage({
        userId: context.user.id,
        character: context.user.selectedCharacter!,
        sessionId,
        message,
        locale,
      });
      return NextResponse.json(result);
    }

    if (action === "complete") {
      const sessionId = String(body.sessionId || "");
      if (!sessionId) return NextResponse.json({ error: "缺少疗愈会话" }, { status: 400 });

      const session = await completeHealingSession({
        userId: context.user.id,
        characterId: context.user.selectedCharacterId!,
        sessionId,
        checkInAfter: normalizeRating(body.checkInAfter),
        realWorldBridge: typeof body.realWorldBridge === "string" ? body.realWorldBridge.slice(0, 160) : undefined,
      });
      return NextResponse.json({ session });
    }

    return NextResponse.json({ error: "无效的疗愈操作" }, { status: 400 });
  } catch (error) {
    console.error("[healing POST error]", error);
    return NextResponse.json({ error: "疗愈模式暂时不可用，请稍后重试" }, { status: 500 });
  }
}
