import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { canSendMessage } from "@/lib/billing";
import {
  abandonMiniGame,
  answerMiniGame,
  completeArcadeGame,
  getEngagementOverview,
  startMiniGame,
  type ArcadeGameType,
  type MiniGameType,
} from "@/lib/games";
import type { Locale } from "@/lib/i18n";

const GAME_TYPES: MiniGameType[] = [
  "truth",
  "deep_questions",
  "mood_guess",
  "story_chain",
];

const ARCADE_TYPES: ArcadeGameType[] = ["match_three", "memory_match", "photo_puzzle"];

function normalizeLocale(value: unknown): Locale {
  return value === "en" || value === "ja" || value === "zh" ? value : "zh";
}

function serializeMessage(message: {
  id: string;
  role: string;
  content: string;
  imageUrl?: string | null;
  audioUrl?: string | null;
  createdAt: Date;
}) {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    imageUrl: message.imageUrl || null,
    audioUrl: message.audioUrl || null,
    createdAt: message.createdAt,
  };
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  if (!user.selectedCharacterId || !user.selectedCharacter) {
    return NextResponse.json({ error: "未选择角色" }, { status: 400 });
  }

  try {
    const overview = await getEngagementOverview(
      user.id,
      user.selectedCharacterId,
      user.selectedCharacter.name
    );
    return NextResponse.json({ ...overview, locale: normalizeLocale(new URL(req.url).searchParams.get("locale")) });
  } catch (error) {
    console.error("[games GET error]", error);
    return NextResponse.json({ error: "互动数据暂时不可用" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });
  if (!user.selectedCharacterId || !user.selectedCharacter) {
    return NextResponse.json({ error: "未选择角色" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const action = String(body.action || "");
    const locale = normalizeLocale(body.locale);

    if (action === "start") {
      const gameType = GAME_TYPES.includes(body.gameType) ? body.gameType : "truth";
      const result = await startMiniGame({
        userId: user.id,
        character: user.selectedCharacter,
        gameType,
      });
      return NextResponse.json({
        session: result.session,
        message: serializeMessage(result.message),
        overview: result.overview,
      });
    }

    if (action === "answer") {
      const answer = String(body.answer || "").trim();
      const sessionId = String(body.sessionId || "");
      if (!answer) {
        return NextResponse.json({ error: "答案不能为空" }, { status: 400 });
      }
      if (!sessionId) {
        return NextResponse.json({ error: "缺少游戏会话" }, { status: 400 });
      }

      const msgCheck = await canSendMessage(user.id);
      if (!msgCheck.allowed) {
        return NextResponse.json(
          {
            error: "今日消息已用完，升级会员可解锁无限消息",
            code: "MESSAGE_LIMIT",
            remaining: 0,
            plan: msgCheck.plan,
          },
          { status: 403 }
        );
      }

      const result = await answerMiniGame({
        userId: user.id,
        character: user.selectedCharacter,
        sessionId,
        answer,
        locale,
      });
      return NextResponse.json({
        session: result.session,
        userMessage: serializeMessage(result.userMessage),
        message: serializeMessage(result.message),
        completedTasks: result.completedTasks,
        heartMoment: result.heartMoment,
        gameReward: result.gameReward,
        levelUp: result.levelUp,
        affinity: result.affinity,
        overview: result.overview,
      });
    }

    if (action === "abandon") {
      const sessionId = String(body.sessionId || "");
      if (!sessionId) {
        return NextResponse.json({ error: "缺少游戏会话" }, { status: 400 });
      }
      const overview = await abandonMiniGame({
        userId: user.id,
        characterId: user.selectedCharacterId,
        characterName: user.selectedCharacter.name,
        sessionId,
      });
      return NextResponse.json({ overview });
    }

    if (action === "arcade_complete") {
      const gameType = ARCADE_TYPES.includes(body.gameType) ? body.gameType : null;
      if (!gameType) {
        return NextResponse.json({ error: "无效的小游戏类型" }, { status: 400 });
      }

      const result = await completeArcadeGame({
        userId: user.id,
        characterId: user.selectedCharacterId,
        characterName: user.selectedCharacter.name,
        gameType,
        score: Number(body.score || 0),
        stars: Number(body.stars || 1),
      });

      return NextResponse.json({
        record: result.record,
        message: serializeMessage(result.message),
        completedTasks: result.completedTasks,
        heartMoment: result.heartMoment,
        gameReward: result.gameReward,
        rewardCapped: result.rewardCapped,
        levelUp: result.levelUp,
        affinity: result.affinity,
        overview: result.overview,
      });
    }

    return NextResponse.json({ error: "无效的互动操作" }, { status: 400 });
  } catch (error) {
    console.error("[games POST error]", error);
    return NextResponse.json({ error: "互动服务暂时不可用，请稍后重试" }, { status: 500 });
  }
}
