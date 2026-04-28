import { prisma } from "./prisma";
import { llmClient } from "./minimax";

const SUMMARY_KEY_PREFIX = "__summary_";

export async function extractUserProfile(
  userId: string,
  userMessage: string,
  assistantReply: string
) {
  try {
    const response = await llmClient.chat.completions.create({
      model: process.env.LLM_MODEL || "minimax/minimax-m1",
      messages: [
        {
          role: "system",
          content: `你是一个信息提取助手。分析用户的对话，提取用户透露的关键个人信息。
只提取明确提到的信息，不要推测。
返回 JSON 数组格式，每个元素包含 key 和 value。
可提取的信息类型包括：name(姓名), birthday(生日), age(年龄), occupation(职业), hobby(爱好), location(所在地), pet(宠物), food_preference(饮食偏好), relationship_status(感情状态), recent_event(近期事件), mood(心情状态), study(学业), work_situation(工作情况), music_preference(音乐偏好), dream(梦想/人生目标), family(家庭情况), health(健康状况), travel(旅行经历或计划), personality(性格特点), schedule(日常日程/作息)。
如果没有可提取的信息，返回空数组 []。
只返回 JSON，不要其他内容。`,
        },
        {
          role: "user",
          content: `用户说："${userMessage}"\n角色回复："${assistantReply}"`,
        },
      ],
      max_tokens: 512,
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content || "[]";
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return;

    const items = JSON.parse(jsonMatch[0]) as {
      key: string;
      value: string;
    }[];

    for (const item of items) {
      if (!item.key || !item.value) continue;
      // Avoid clobbering reserved internal keys (e.g. chat summary slots).
      if (item.key.startsWith("__")) continue;
      await prisma.userProfile.upsert({
        where: { userId_key: { userId, key: item.key } },
        update: { value: item.value, source: userMessage.slice(0, 100) },
        create: {
          userId,
          key: item.key,
          value: item.value,
          source: userMessage.slice(0, 100),
        },
      });
    }
  } catch (error) {
    console.error("Profile extraction failed:", error);
  }
}

export async function getUserProfileString(userId: string): Promise<string> {
  const items = await prisma.userProfile.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });

  // Filter out internal/reserved keys (chat summaries, etc.)
  const visible = items.filter((i) => !i.key.startsWith("__"));
  if (visible.length === 0) return "暂无用户信息记录。";

  return visible.map((item) => `- ${item.key}: ${item.value}`).join("\n");
}

// =====================================================================
// Long-term chat summary (rolling)
// Keeps prompt size bounded by compressing older messages into a short
// narrative note, while the most recent N messages are still passed
// verbatim. Stored on UserProfile with a reserved key so it's
// character-scoped and needs no schema migration.
// =====================================================================

interface SummaryMeta {
  summary: string;
  upToMessageId: string;
  messagesCovered: number;
  updatedAt: string;
}

function summaryKey(characterId: string) {
  return `${SUMMARY_KEY_PREFIX}${characterId}`;
}

export async function getChatSummary(
  userId: string,
  characterId: string
): Promise<SummaryMeta | null> {
  const row = await prisma.userProfile.findUnique({
    where: { userId_key: { userId, key: summaryKey(characterId) } },
  });
  if (!row) return null;
  try {
    return JSON.parse(row.value) as SummaryMeta;
  } catch {
    return null;
  }
}

async function setChatSummary(
  userId: string,
  characterId: string,
  meta: SummaryMeta
) {
  await prisma.userProfile.upsert({
    where: { userId_key: { userId, key: summaryKey(characterId) } },
    update: { value: JSON.stringify(meta), source: "chat-summary" },
    create: {
      userId,
      key: summaryKey(characterId),
      value: JSON.stringify(meta),
      source: "chat-summary",
    },
  });
}

/**
 * Refresh the rolling summary when there are enough new messages outside
 * the recent window. No-op if everything still fits in recent + summary.
 */
export async function maybeRefreshChatSummary(
  userId: string,
  characterId: string,
  recentWindow: number = 12,
  refreshEvery: number = 8
) {
  try {
    const total = await prisma.message.count({
      where: { userId, characterId },
    });
    if (total <= recentWindow + 4) return;

    const olderCount = total - recentWindow;
    const existing = await getChatSummary(userId, characterId);
    if (existing && olderCount - existing.messagesCovered < refreshEvery) {
      return;
    }

    const olderMessages = await prisma.message.findMany({
      where: { userId, characterId },
      orderBy: { createdAt: "asc" },
      take: olderCount,
      select: { id: true, role: true, content: true },
    });
    if (olderMessages.length === 0) return;

    const transcript = olderMessages
      .map(
        (m) => `${m.role === "user" ? "用户" : "她"}：${m.content.slice(0, 400)}`
      )
      .join("\n");

    const previousSummary = existing?.summary || "";

    const prompt = `你是一个对话记忆助手。任务：把下面用户和她（AI 女友）之间的早期对话，压缩成一段供"她"以后回忆使用的简短笔记。

要求：
- 用第三人称、过去时叙述（"用户提到…"、"她回应了…"）。
- 保留：用户透露的关键事实、情感事件、双方关系的转折、未完成的话题、用户当时的心境。
- 删除：寒暄、重复、不重要的日常。
- 中文，控制在 250 字以内。
- 直接输出摘要文本，不要任何额外说明、不要 Markdown。

${previousSummary ? `【已有的旧摘要，可作为基础整合】\n${previousSummary}\n` : ""}【需要压缩的对话】
${transcript}`;

    const resp = await llmClient.chat.completions.create({
      model: process.env.LLM_MODEL || "minimax/minimax-m1",
      messages: [{ role: "system", content: prompt }],
      max_tokens: 600,
      temperature: 0.3,
    });

    const summary = (resp.choices[0]?.message?.content || "").trim();
    if (!summary) return;

    await setChatSummary(userId, characterId, {
      summary,
      upToMessageId: olderMessages[olderMessages.length - 1].id,
      messagesCovered: olderMessages.length,
      updatedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error("maybeRefreshChatSummary failed:", e);
  }
}
