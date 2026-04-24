import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { chatWithCharacter } from "@/lib/minimax";
import { getTodayEvent, checkBirthdayEvent } from "@/lib/events";
import { getUserProfileString } from "@/lib/memory";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const activeUsers = await prisma.user.findMany({
    where: {
      selectedCharacterId: { not: null },
      messages: { some: { createdAt: { gte: threeDaysAgo } } },
    },
    include: { selectedCharacter: true },
  });

  let processed = 0;
  const todayEvent = getTodayEvent();

  for (const user of activeUsers) {
    if (!user.selectedCharacter) continue;

    const alreadySent = await prisma.notification.findFirst({
      where: {
        userId: user.id,
        type: "greeting",
        createdAt: { gte: new Date(new Date().toISOString().slice(0, 10)) },
      },
    });
    if (alreadySent) continue;

    try {
      const userProfile = await getUserProfileString(user.id);
      const hour = new Date().getHours();
      let timeHint = "早上好";
      if (hour >= 12 && hour < 18) timeHint = "下午好";
      else if (hour >= 18) timeHint = "晚上好";

      let eventHint = "";
      if (todayEvent) {
        eventHint = `\n今天是${todayEvent.name}，${todayEvent.prompt}`;
      }

      const birthdayEvent = await checkBirthdayEvent(user.id);
      if (birthdayEvent) {
        eventHint += `\n${birthdayEvent.prompt}`;
      }

      const greetingPrompt = `你是${user.selectedCharacter.name}。现在给用户发一条${timeHint}的问候消息。
要求：1-2句话，自然温馨，符合你的性格。${eventHint}
用户信息：${userProfile}`;

      const greeting = await chatWithCharacter(
        user.selectedCharacter.systemPrompt.replace("{user_profile}", userProfile),
        [{ role: "user", content: greetingPrompt }]
      );

      const title = todayEvent
        ? `${user.selectedCharacter.name}的${todayEvent.name}问候`
        : `${user.selectedCharacter.name}想你了`;

      await prisma.notification.create({
        data: {
          type: birthdayEvent ? "birthday" : todayEvent ? "holiday" : "greeting",
          title,
          content: greeting,
          userId: user.id,
          characterId: user.selectedCharacter.id,
        },
      });

      processed++;
    } catch (e) {
      console.error(`Failed to generate greeting for user ${user.id}:`, e);
    }
  }

  return NextResponse.json({ ok: true, processed });
}
