import { prisma } from "./prisma";
import { llmClient } from "./minimax";

const MOOD_LABELS: Record<string, { zh: string; en: string; ja: string; color: string }> = {
  happy:    { zh: "开心", en: "Happy", ja: "嬉しい", color: "#22c55e" },
  excited:  { zh: "兴奋", en: "Excited", ja: "ワクワク", color: "#f59e0b" },
  calm:     { zh: "平静", en: "Calm", ja: "穏やか", color: "#3b82f6" },
  loved:    { zh: "被爱", en: "Loved", ja: "愛されてる", color: "#ec4899" },
  sad:      { zh: "难过", en: "Sad", ja: "悲しい", color: "#6366f1" },
  anxious:  { zh: "焦虑", en: "Anxious", ja: "不安", color: "#ef4444" },
  tired:    { zh: "疲惫", en: "Tired", ja: "疲れた", color: "#8b5cf6" },
  angry:    { zh: "生气", en: "Angry", ja: "怒り", color: "#dc2626" },
  neutral:  { zh: "一般", en: "Neutral", ja: "普通", color: "#9ca3af" },
  lonely:   { zh: "孤独", en: "Lonely", ja: "寂しい", color: "#64748b" },
};

export { MOOD_LABELS };

export async function analyzeMood(
  userId: string,
  characterId: string,
  userMessage: string,
  assistantReply: string
) {
  try {
    const response = await llmClient.chat.completions.create({
      model: process.env.LLM_MODEL || "minimax/minimax-m1",
      messages: [
        {
          role: "system",
          content: `你是一个情绪分析助手。分析用户的消息，判断用户当前的情绪状态。
返回 JSON 格式：{"score": 数字1-10, "label": "情绪标签", "summary": "一句话总结"}
score: 1表示非常消极，5表示中性，10表示非常积极。
label 只能是以下之一: happy, excited, calm, loved, sad, anxious, tired, angry, neutral, lonely
summary: 用温暖的语气，一句话描述用户今天的心情状态。
只返回 JSON，不要其他内容。`,
        },
        {
          role: "user",
          content: `用户说: "${userMessage}"\n回复: "${assistantReply}"`,
        },
      ],
      max_tokens: 256,
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content || "{}";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return;

    const result = JSON.parse(jsonMatch[0]) as {
      score: number;
      label: string;
      summary: string;
    };

    if (!result.score || !result.label) return;

    const today = new Date().toISOString().slice(0, 10);

    await prisma.moodEntry.upsert({
      where: {
        userId_characterId_date: { userId, characterId, date: today },
      },
      update: {
        score: Math.max(1, Math.min(10, result.score)),
        label: result.label,
        summary: result.summary || "",
      },
      create: {
        userId,
        characterId,
        date: today,
        score: Math.max(1, Math.min(10, result.score)),
        label: result.label,
        summary: result.summary || "",
      },
    });
  } catch (error) {
    console.error("Mood analysis failed:", error);
  }
}

export async function getMoodHistory(
  userId: string,
  characterId: string,
  days: number = 14
) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().slice(0, 10);

  const entries = await prisma.moodEntry.findMany({
    where: {
      userId,
      characterId,
      date: { gte: sinceStr },
    },
    orderBy: { date: "asc" },
  });

  const avgScore =
    entries.length > 0
      ? Math.round(
          (entries.reduce((s, e) => s + e.score, 0) / entries.length) * 10
        ) / 10
      : 0;

  const moodCounts: Record<string, number> = {};
  for (const e of entries) {
    moodCounts[e.label] = (moodCounts[e.label] || 0) + 1;
  }
  const dominantMood =
    Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "neutral";

  return { entries, avgScore, dominantMood, totalDays: entries.length };
}
