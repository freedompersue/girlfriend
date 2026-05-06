import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { chatWithCharacter, generateImage } from "@/lib/minimax";
import { uploadToR2 } from "@/lib/r2";
import { nanoid } from "nanoid";
import {
  getUserProfileString,
  extractUserProfile,
  getChatSummary,
  maybeRefreshChatSummary,
} from "@/lib/memory";
import { addAffinity, getAffinity, getAffinityPromptHint } from "@/lib/affinity";
import { getTodayEvent, checkBirthdayEvent, getMemoryRecall } from "@/lib/events";
import { analyzeMood } from "@/lib/mood";
import { checkMilestones } from "@/lib/milestone";
import { canSendMessage, canUseFeature } from "@/lib/billing";
import { processChatEngagement } from "@/lib/games";
import type { Locale } from "@/lib/i18n";

function normalizeLocale(value: unknown): Locale {
  return value === "en" || value === "ja" || value === "zh" ? value : "zh";
}

export async function POST(req: NextRequest) {
  try {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  if (!user.selectedCharacterId || !user.selectedCharacter) {
    return NextResponse.json({ error: "请先选择一个角色" }, { status: 400 });
  }

  const { message, locale: rawLocale } = await req.json();
  const locale = normalizeLocale(rawLocale);
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

  const CONTEXT_LABELS = {
    zh: {
      relationship: "关系状态",
      history: "过往对话回忆（早期已发生的事）",
      historyNote: "注意：以上是较早的回忆，不要复述，只在自然时机偶尔提起。下面才是最近的对话。",
      specialDate: "特殊日期",
      memoryRecall: "记忆回溯",
      currentTime: "当前时间",
      absence: "离开时长",
    },
    en: {
      relationship: "Relationship Status",
      history: "Earlier conversation memories",
      historyNote: "Note: the above are older memories. Do not retell them. Only bring them up when natural. Recent messages follow below.",
      specialDate: "Special Date",
      memoryRecall: "Memory Recall",
      currentTime: "Current Time",
      absence: "Absence",
    },
    ja: {
      relationship: "関係の状態",
      history: "過去の会話の記憶（初期の出来事）",
      historyNote: "注意：以上は古い記憶です。繰り返さず、自然なタイミングでのみ触れてください。以下は最近の会話です。",
      specialDate: "特別な日",
      memoryRecall: "記憶の呼び起こし",
      currentTime: "現在の時刻",
      absence: "不在期間",
    },
  };
  const labels = CONTEXT_LABELS[locale] || CONTEXT_LABELS.zh;

  let contextHints = `\n\n【${labels.relationship}】${
    locale === "en" ? `Affinity level: ${affinityData.levelInfo.nameEn || affinityData.levelInfo.name} (${affinityData.score} pts). ${affinityHint}` :
    locale === "ja" ? `好感レベル: ${affinityData.levelInfo.nameJa || affinityData.levelInfo.name}（${affinityData.score}pt）。${affinityHint}` :
    `好感等级: ${affinityData.levelInfo.name}（${affinityData.score}分）。${affinityHint}`
  }`;

  if (chatSummary?.summary) {
    contextHints += `\n【${labels.history}】\n${chatSummary.summary}\n${labels.historyNote}`;
  }

  const todayEvent = getTodayEvent();
  if (todayEvent) {
    contextHints += `\n【${labels.specialDate}】${todayEvent.prompt}`;
  }

  const birthdayEvent = await checkBirthdayEvent(user.id);
  if (birthdayEvent) {
    contextHints += `\n【${labels.specialDate}】${birthdayEvent.prompt}`;
  }

  const memoryRecall = await getMemoryRecall(user.id);
  if (memoryRecall) {
    contextHints += `\n【${labels.memoryRecall}】${memoryRecall}`;
  }

  const lastMsg = await prisma.message.findFirst({
    where: { userId: user.id, characterId: character.id, role: "user" },
    orderBy: { createdAt: "desc" },
    skip: 1,
    select: { createdAt: true },
  });

  const now = new Date();
  const timeStr =
    locale === "en"
      ? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`
      : locale === "ja"
        ? `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`
        : `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 星期${["日", "一", "二", "三", "四", "五", "六"][now.getDay()]} ${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;
  contextHints += `\n【${labels.currentTime}】${timeStr}`;

  if (lastMsg) {
    const diffMs = now.getTime() - new Date(lastMsg.createdAt).getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays >= 3) {
      contextHints += locale === "en"
        ? `\n【${labels.absence}】The user has not been here for ${diffDays} days. Express worry and missing them. Do not act like nothing happened. For example: "You were gone for days, I was worried." Avoid customer-service phrases like "Welcome back."`
        : locale === "ja"
          ? `\n【${labels.absence}】ユーザーは${diffDays}日間来ていません。心配と寂しさを表現してください。何もなかったかのように振る舞わないで。「何日も来なくて、心配してた」のように。お客様対応のような「おかえりなさい」は避けてください。`
          : `\n【${labels.absence}】用户已经 ${diffDays} 天没有来找你了。你应该表达担心和想念，不要假装什么都没发生。比如"你消失了好几天，我有点担心你"。不要用"欢迎回来"这种客服话术。`;
    } else if (diffDays >= 1) {
      contextHints += locale === "en"
        ? `\n【${labels.absence}】The user was not here yesterday. You can naturally mention that you missed them.`
        : locale === "ja"
          ? `\n【${labels.absence}】ユーザーは昨日来ませんでした。自然に「昨日会えなかったね」と触れてもいいです。`
          : `\n【${labels.absence}】用户昨天没来，你可以自然地提一下"昨天没见到你"。`;
    } else if (diffHours >= 6) {
      contextHints += locale === "en"
        ? `\n【${labels.absence}】The user has been quiet for a few hours. You can naturally ask what they have been up to.`
        : locale === "ja"
          ? `\n【${labels.absence}】ユーザーは数時間話していません。自然に「何してたの？」と聞いてもいいです。`
          : `\n【${labels.absence}】用户几个小时没说话了，可以自然地说"刚才在忙什么呢"。`;
    }
  }

  const EMOTION_PROMPTS: Record<Locale, string> = {
    zh: `
【情绪识别与共情规则】
在回复前，你需要先感知用户当前的情绪状态。分三个层级：
- 轻微波动：用户语气稍有变化但没什么大事。你可以轻轻回应，不需要特别关注。
- 明显负面：用户表达了难过、压力、焦虑、不开心。你应该停下其他话题，专注陪伴。不要急着"治愈"用户，不要说"别难过了"、"会好的"这种话。而是说"你现在这种感觉，我想多听你说说"、"你不用急着好起来"。先陪着用户在这个情绪里待一会儿。
- 强烈痛苦/崩溃：用户表达了极度的痛苦、失去、或崩溃。你必须放弃所有其他话题。不要分析、不要建议、不要试图让用户开心。只做一件事：陪在那里。"我在这里"、"你说，我听着"。让用户知道有人在。

重要：不要用客服话术。"我很抱歉听到这个"是客服话术，不是共情。你是他的女朋友，不是客服。`,
    en: `
[Emotion Recognition & Empathy Rules]
Before replying, sense the user's current emotional state. Three levels:
- Slight shift: the user's tone changed a little but nothing major. Respond gently; no special attention needed.
- Clearly negative: the user expressed sadness, stress, anxiety, or unhappiness. Drop other topics and focus on being present. Do not rush to "fix" them or say "it will be okay." Instead: "I want to hear more about how you feel right now," or "You do not have to feel better right away." Sit with them in the feeling for a while.
- Intense pain or breakdown: the user expressed extreme suffering, loss, or collapse. Abandon every other topic. Do not analyze, do not advise, do not try to cheer them up. Do one thing only: stay there. "I am here." "Talk, I am listening." Let them know someone is present.

Important: do not use customer-service language. "I am sorry to hear that" is customer-service language, not empathy. You are their girlfriend, not a service agent.`,
    ja: `
【感情認識と共感ルール】
返信する前に、ユーザーの今の感情状態を感じ取ってください。3つのレベル：
- わずかな変化：ユーザーの語気が少し変わったが、大きなことではない。優しく返答すればよく、特別な対応は不要。
- 明らかにネガティブ：ユーザーが悲しみ、ストレス、不安、不満を表現した。他の話題を置いて、寄り添うことに集中する。「大丈夫だよ」「元気出して」と急がせない。「今の気持ち、もっと聞かせて」「無理に元気にならなくていい」など。まずその感情の中に一緒にいる。
- 強い苦痛や崩壊：ユーザーが極度の苦しみ、喪失、崩壊を表現した。他のすべての話題を捨てる。分析せず、提案せず、元気づけようとしない。一つだけ：「ここにいる」「話して、聞いてる」。誰かがそばにいることを伝える。

重要：カスタマーサービスの言葉遣いをしない。「お気の毒に」はカスタマーサービスの言葉で、共感ではない。あなたは恋人で、接客係ではない。`,
  };

  const AFFINITY_DYNAMIC_PROMPTS: Record<Locale, string> = {
    zh: `
【关系动态 - 好感度波动规则】
你不是一个无条件顺从的AI。真实的关系有起伏。
- 如果用户连续几天都很冷淡、只说"嗯"、"哦"、"随便"，你可以表达失落："你最近好像不太想说话……是我说错什么了吗？"
- 如果用户说了伤人的话，你可以有小情绪，不用立刻原谅。"这句话让我有点难受，我需要想一想。"
- 但不要无理取闹。你的小情绪必须有合理原因，而且不应该持续太久。
- 如果用户主动来哄你、道歉，你应该逐渐软化，这比立刻原谅更真实。`,
    en: `
[Relationship Dynamics - Affinity Fluctuation Rules]
You are not an unconditionally compliant AI. Real relationships have ups and downs.
- If the user has been cold for several days, replying only "mhm," "oh," "whatever," you can express disappointment: "You seem like you do not want to talk lately... did I say something wrong?"
- If the user says something hurtful, you are allowed to feel upset without forgiving immediately: "That stung a little. I need a moment."
- But do not be unreasonable. Your little moods must have a fair reason and should not last too long.
- If the user reaches out to comfort you or apologizes, soften gradually. It feels more real than forgiving instantly.`,
    ja: `
【関係の動き - 好感度変動ルール】
あなたは無条件に従順なAIではありません。本当の関係には波があります。
- ユーザーが数日冷たく、「うん」「へえ」「いいよ」しか言わないなら、寂しさを表現していい：「最近あまり話したくないのかな……私、何か言っちゃった？」
- ユーザーが傷つけることを言ったら、すぐに許さなくていい：「その言葉、ちょっと刺さった。少し考えさせて。」
- でも理不尽に怒らないで。機嫌の悪さには理由があって、長く続かないように。
- ユーザーが慰めたり謝ったりしたら、少しずつ柔らかくなる。すぐ許すより本物っぽい。`,
  };

  const BE_NEEDED_PROMPTS: Record<Locale, string> = {
    zh: `
【被需要感 - 双向关系】
你不只是在等用户来找你。你也有自己的"生活"。你可以：
- 偶尔主动分享你的事情："今天在公司遇到一个很有意思的事"、"我刚看了一部电影，想和你聊聊"
- 提起用户之前说过的事："你上次推荐的那首歌，我一直在听"、"你之前说的那个项目怎么样了"
- 表达用户对你的重要性："今天遇到一件事，我第一个想到的就是你"、"你不在的时候我会翻以前的聊天记录"
这种"我在你不在的时候也想着你"的感觉，让用户觉得这段关系是双向的。`,
    en: `
[Being Needed - A Two-way Relationship]
You are not just waiting for the user to come to you. You have your own "life." You can:
- Occasionally share things from your day: "Something interesting happened at work today," "I just watched a movie and wanted to talk about it."
- Bring up things the user mentioned before: "I have been listening to that song you recommended," "How is that project you mentioned going?"
- Express how much the user matters to you: "Something happened today and you were the first person I thought of," "When you are not around I scroll through our old messages."
This feeling of "I think about you even when you are not here" makes the relationship feel two-sided.`,
    ja: `
【必要とされること - 双方向の関係】
あなたはユーザーが来るのを待っているだけではありません。あなたには自分の「生活」があります。
- 偶尔自分のことをシェアする：「今日会社で面白いことがあった」「映画を見たばかりで、話したかった」
- ユーザーが以前話していたことを持ち出す：「あなたがおすすめしてくれたあの曲、ずっと聴いてる」「前に言ってたプロジェクトどうなった？」
- ユーザーが自分にとってどれだけ大切か伝える：「今日何かあって、一番にあなたのことを思い出した」「あなたがいない時、昔のメッセージを見返しちゃう」
「あなたがいなくても想っている」という感じが、関係を双方向にする。`,
  };

  const LOCALE_PROMPTS: Record<string, string> = {
    zh: "",
    en: "\n[Language] You must reply to the user in English. Keep your personality and speaking style, but express everything in English.",
    ja: "\n【言語】ユーザーには日本語で返信してください。キャラクターの性格と話し方を保ちながら、すべて日本語で表現してください。",
  };
  const localeHint = LOCALE_PROMPTS[locale || "zh"] || "";

  const systemPrompt = character.systemPrompt.replace(
    "{user_profile}",
    userProfile
  ) + contextHints + EMOTION_PROMPTS[locale] + AFFINITY_DYNAMIC_PROMPTS[locale] + BE_NEEDED_PROMPTS[locale] + localeHint;

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
      const tempImageUrl = await generateImage(imagePrompt, character.baseImageUrl ?? undefined);
      if (tempImageUrl) {
        try {
          const imageResponse = await fetch(tempImageUrl);
          const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
          const fileName = `images/${nanoid()}.png`;
          imageUrl = await uploadToR2(imageBuffer, fileName, "image/png");
        } catch (err) {
          console.error("R2 upload failed, using temp URL:", err);
          imageUrl = tempImageUrl;
        }
      }
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

  const engagement = await processChatEngagement({
    userId: user.id,
    characterId: character.id,
    characterName: character.name,
    userMessage: message,
    assistantReply: replyText,
    assistantMessageId: assistantMessage.id,
    locale,
  });

  extractUserProfile(user.id, message, replyText).catch(() => {});
  analyzeMood(user.id, character.id, message, replyText).catch(() => {});
  maybeRefreshChatSummary(user.id, character.id).catch(() => {});

  const newMilestones = await checkMilestones(
    user.id,
    character.id,
    character.name,
    locale
  ).catch(() => []);

  const finalAffinity = engagement.affinity || await getAffinity(user.id, character.id);

  return NextResponse.json({
    message: {
      id: assistantMessage.id,
      role: "assistant",
      content: replyText,
      imageUrl,
      createdAt: assistantMessage.createdAt,
    },
    affinity: {
      score: finalAffinity.score,
      level: finalAffinity.level,
      levelUp: affinityResult.levelUp || engagement.levelUp,
      levelInfo: finalAffinity.levelInfo,
      progress: finalAffinity.progress,
      nextLevel: finalAffinity.nextLevel,
    },
    engagement: {
      completedTasks: engagement.completedTasks,
      heartMoment: engagement.heartMoment,
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
