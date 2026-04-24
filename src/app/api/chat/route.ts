import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { chatWithCharacter, generateImage } from "@/lib/minimax";
import { getUserProfileString, extractUserProfile } from "@/lib/memory";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  if (!user.selectedCharacterId || !user.selectedCharacter) {
    return NextResponse.json({ error: "请先选择一个角色" }, { status: 400 });
  }

  const { message } = await req.json();
  if (!message?.trim()) {
    return NextResponse.json({ error: "消息不能为空" }, { status: 400 });
  }

  const character = user.selectedCharacter;

  await prisma.message.create({
    data: {
      role: "user",
      content: message,
      userId: user.id,
      characterId: character.id,
    },
  });

  const history = await prisma.message.findMany({
    where: { userId: user.id, characterId: character.id },
    orderBy: { createdAt: "asc" },
    take: 40,
  });

  const userProfile = await getUserProfileString(user.id);

  const systemPrompt = character.systemPrompt.replace(
    "{user_profile}",
    userProfile
  );

  const chatMessages = history.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const replyRaw = await chatWithCharacter(systemPrompt, chatMessages);

  let replyText = replyRaw;
  let imageUrl: string | null = null;

  const photoMatch = replyRaw.match(/\[SEND_PHOTO:\s*(.+?)\]/);
  if (photoMatch) {
    replyText = replyRaw.replace(/\[SEND_PHOTO:\s*.+?\]/, "").trim();
    const sceneDesc = photoMatch[1];
    const imagePrompt = `${character.appearance}，${sceneDesc}，真实摄影风格，高清，自然光线`;
    imageUrl = await generateImage(imagePrompt);
  }

  const assistantMessage = await prisma.message.create({
    data: {
      role: "assistant",
      content: replyText,
      imageUrl,
      userId: user.id,
      characterId: character.id,
    },
  });

  extractUserProfile(user.id, message, replyText).catch(() => {});

  return NextResponse.json({
    message: {
      id: assistantMessage.id,
      role: "assistant",
      content: replyText,
      imageUrl,
      createdAt: assistantMessage.createdAt,
    },
  });
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  if (!user.selectedCharacterId) {
    return NextResponse.json({ messages: [] });
  }

  const url = new URL(req.url);
  const cursor = url.searchParams.get("cursor");
  const limit = 30;

  const messages = await prisma.message.findMany({
    where: {
      userId: user.id,
      characterId: user.selectedCharacterId,
      ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
    },
    select: {
      id: true,
      role: true,
      content: true,
      imageUrl: true,
      audioUrl: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
  });

  const hasMore = messages.length > limit;
  if (hasMore) messages.pop();

  const cleaned = messages.reverse().map((m) => ({
    ...m,
    content: m.content.replace(/<think>[\s\S]*?<\/think>\s*/g, "").trim(),
  }));

  return NextResponse.json({
    messages: cleaned,
    hasMore,
    nextCursor: hasMore ? messages[0]?.createdAt?.toISOString() : null,
  });
}
