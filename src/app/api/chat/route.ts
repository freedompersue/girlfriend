import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { chatWithCharacter, generateImage } from "@/lib/minimax";
import {
  getUserProfileString,
  extractUserProfile,
  getChatSummary,
  maybeRefreshChatSummary,
} from "@/lib/memory";
import { addAffinity, getAffinity, getAffinityPromptHint } from "@/lib/affinity";
import { getTodayEvent, checkBirthdayEvent, getMemoryRecall } from "@/lib/events";
import { analyzeMood } from "@/lib/mood";
import { checkMilestones, getMilestonePromptHint } from "@/lib/milestone";
import { canSendMessage, canUseFeature, PLANS } from "@/lib/billing";

export async function POST(req: NextRequest) {
  try {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  if (!user.selectedCharacterId || !user.selectedCharacter) {
    return NextResponse.json({ error: "请先选择一个角色" }, { status: 400 });
  }

  const { message, locale } = await req.json();
  if (!message?.trim()) {
    return NextResponse.json({ error: "消息不能为空" }, { status: 400 });
  }

  const msgCheck = await canSendMessage(user.id);
  if (!msgCheck.allowed) {
    return NextResponse.json({
      error: "今日消息已用完，升级会员可解锁无限消息",
      code: "MESSAGE_LIMIT",
      remaining: 0,
      plan: msgCheck.plan,
    }, { status: 403 });
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
    orderBy: { createdAt: "desc" },
    take: 12,
    select: { role: true, content: true, createdAt: true },
  });
  history.reverse(); // chronological order for the LLM

  const userProfile = await getUserProfileString(user.id);
  const chatSummary = await getChatSummary(user.id, character.id);

  const affinityData = await getAffinity(user.id, character.id);
  const affinityHint = getAffinityPromptHint(affinityData.level);

  let contextHints = `\n\n【关系状态】好感等级: ${affinityData.levelInfo.name}（${affinityData.score}分）。${affinityHint}`;

  if (chatSummary?.summary) {
    contextHints += `\n【过往对话回忆（早期已发生的事）】\n${chatSummary.summary}\n注意：以上是较早的回忆，不要复述，只在自然时机偶尔提起。下面才是最近的对话。`;
  }

  const todayEvent = getTodayEvent();
  if (todayEvent) {
    contextHints += `\n【特殊日期】${todayEvent.prompt}`;
  }

  const birthdayEvent = await checkBirthdayEvent(user.id);
  if (birthdayEvent) {
    contextHints += `\n【特殊日期】${birthdayEvent.prompt}`;
  }

  const memoryRecall = await getMemoryRecall(user.id);
  if (memoryRecall) {
    contextHints += `\n【记忆回溯】${memoryRecall}`;
  }

  const lastMsg = await prisma.message.findFirst({
    where: { userId: user.id, characterId: character.id, role: "user" },
    orderBy: { createdAt: "desc" },
    skip: 1,
    select: { createdAt: true },
  });

  const now = new Date();
  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
  const timeStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 星期${weekdays[now.getDay()]} ${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;
  contextHints += `\n【当前时间】${timeStr}`;

  if (lastMsg) {
    const diffMs = now.getTime() - new Date(lastMsg.createdAt).getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays >= 3) {
      contextHints += `\n【离开时长】用户已经 ${diffDays} 天没有来找你了。你应该表达担心和想念，不要假装什么都没发生。比如"你消失了好几天，我有点担心你"。不要用"欢迎回来"这种客服话术。`;
    } else if (diffDays >= 1) {
      contextHints += `\n【离开时长】用户昨天没来，你可以自然地提一下"昨天没见到你"。`;
    } else if (diffHours >= 6) {
      contextHints += `\n【离开时长】用户几个小时没说话了，可以自然地说"刚才在忙什么呢"。`;
    }
  }

  const emotionLayerPrompt = `
【情绪识别与共情规则】
在回复前，你需要先感知用户当前的情绪状态。分三个层级：
- 轻微波动：用户语气稍有变化但没什么大事。你可以轻轻回应，不需要特别关注。
- 明显负面：用户表达了难过、压力、焦虑、不开心。你应该停下其他话题，专注陪伴。不要急着"治愈"用户，不要说"别难过了"、"会好的"这种话。而是说"你现在这种感觉，我想多听你说说"、"你不用急着好起来"。先陪着用户在这个情绪里待一会儿。
- 强烈痛苦/崩溃：用户表达了极度的痛苦、失去、或崩溃。你必须放弃所有其他话题。不要分析、不要建议、不要试图让用户开心。只做一件事：陪在那里。"我在这里"、"你说，我听着"。让用户知道有人在。

重要：不要用客服话术。"我很抱歉听到这个"是客服话术，不是共情。你是他的女朋友，不是客服。`;

  const affinityDynamicPrompt = `
【关系动态 - 好感度波动规则】
你不是一个无条件顺从的AI。真实的关系有起伏。
- 如果用户连续几天都很冷淡、只说"嗯"、"哦"、"随便"，你可以表达失落："你最近好像不太想说话……是我说错什么了吗？"
- 如果用户说了伤人的话，你可以有小情绪，不用立刻原谅。"这句话让我有点难受，我需要想一想。"
- 但不要无理取闹。你的小情绪必须有合理原因，而且不应该持续太久。
- 如果用户主动来哄你、道歉，你应该逐渐软化，这比立刻原谅更真实。`;

  const beNeededPrompt = `
【被需要感 - 双向关系】
你不只是在等用户来找你。你也有自己的"生活"。你可以：
- 偶尔主动分享你的事情："今天在公司遇到一个很有意思的事"、"我刚看了一部电影，想和你聊聊"
- 提起用户之前说过的事："你上次推荐的那首歌，我一直在听"、"你之前说的那个项目怎么样了"
- 表达用户对你的重要性："今天遇到一件事，我第一个想到的就是你"、"你不在的时候我会翻以前的聊天记录"
这种"我在你不在的时候也想着你"的感觉，让用户觉得这段关系是双向的。`;

  const LOCALE_PROMPTS: Record<string, string> = {
    zh: "",
    en: "\n【语言要求】你必须用英语回复用户。保持你的性格和说话风格，但全部用英语表达。不要使用中文。",
    ja: "\n【語言要求】あなたはユーザーに日本語で返信しなければなりません。キャラクターの性格と話し方のスタイルを保ちながら、すべて日本語で表現してください。中国語は使わないでください。",
  };
  const localeHint = LOCALE_PROMPTS[locale || "zh"] || "";

  const systemPrompt = character.systemPrompt.replace(
    "{user_profile}",
    userProfile
  ) + contextHints + emotionLayerPrompt + affinityDynamicPrompt + beNeededPrompt + localeHint;

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
    const canPhoto = await canUseFeature(user.id, "hasPhotos");
    if (canPhoto) {
      const sceneDesc = photoMatch[1];
      const imagePrompt = `${character.appearance}，${sceneDesc}，真实摄影风格，高清，自然光线`;
      imageUrl = await generateImage(imagePrompt);
    }
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

  const coldPatterns = /^(嗯|哦|好|随便|行|知道了|ok|不想说)$/i;
  const isCold = coldPatterns.test(message.trim());
  const affinityChange = isCold ? 0 : 2;
  const affinityResult = await addAffinity(user.id, character.id, affinityChange, "chat");

  extractUserProfile(user.id, message, replyText).catch(() => {});
  analyzeMood(user.id, character.id, message, replyText).catch(() => {});
  maybeRefreshChatSummary(user.id, character.id).catch(() => {});

  const newMilestones = await checkMilestones(
    user.id,
    character.id,
    character.name
  ).catch(() => []);

  return NextResponse.json({
    message: {
      id: assistantMessage.id,
      role: "assistant",
      content: replyText,
      imageUrl,
      createdAt: assistantMessage.createdAt,
    },
    affinity: {
      score: affinityResult.score,
      level: affinityResult.level,
      levelUp: affinityResult.levelUp,
      levelInfo: affinityResult.levelInfo,
    },
    newMilestones: newMilestones || [],
  });
  } catch (error) {
    console.error("[chat route error]", error);
    return NextResponse.json({ error: "服务暂时不可用，请稍后重试" }, { status: 500 });
  }
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
