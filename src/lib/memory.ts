import { prisma } from "./prisma";
import { llmClient } from "./minimax";

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

  if (items.length === 0) return "暂无用户信息记录。";

  return items.map((item) => `- ${item.key}: ${item.value}`).join("\n");
}
