import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { chatWithCharacter } from "@/lib/minimax";
import { CHARACTER_DATA } from "@/lib/characters";
import {
  getUserProfileString,
  extractUserProfile,
  getChatSummary,
  maybeRefreshChatSummary,
} from "@/lib/memory";
import { addAffinity } from "@/lib/affinity";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";

async function sendTelegramMessage(chatId: string, text: string) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
  });
}

export async function POST(req: NextRequest) {
  if (!TELEGRAM_BOT_TOKEN) {
    return NextResponse.json({ ok: false, error: "Bot not configured" });
  }

  const body = await req.json();
  const message = body.message;
  if (!message?.text || !message.chat?.id) {
    return NextResponse.json({ ok: true });
  }

  const chatId = String(message.chat.id);
  const text = message.text.trim();

  if (text.startsWith("/start")) {
    const parts = text.split(" ");
    const linkCode = parts[1];

    if (linkCode) {
      const link = await prisma.externalLink.findUnique({ where: { linkCode } });
      if (link && link.platform === "telegram") {
        await prisma.externalLink.update({
          where: { id: link.id },
          data: { externalId: chatId, active: true },
        });
        const user = await prisma.user.findUnique({ where: { id: link.userId } });
        await sendTelegramMessage(chatId,
          `✅ 绑定成功！\n\n欢迎回来，${user?.name || ""}！你现在可以直接在 Telegram 和她聊天了。\n\n输入任何消息开始对话。`
        );
      } else {
        await sendTelegramMessage(chatId, "❌ 无效的绑定码，请在网页端重新生成。");
      }
    } else {
      await sendTelegramMessage(chatId,
        "👋 欢迎使用「她在」Telegram 版！\n\n请先在网页端的「集成设置」中获取绑定链接。"
      );
    }
    return NextResponse.json({ ok: true });
  }

  const link = await prisma.externalLink.findFirst({
    where: { platform: "telegram", externalId: chatId, active: true },
  });

  if (!link) {
    await sendTelegramMessage(chatId, "⚠️ 你还没有绑定账号。请先在网页端完成绑定。");
    return NextResponse.json({ ok: true });
  }

  const user = await prisma.user.findUnique({
    where: { id: link.userId },
    include: { selectedCharacter: true },
  });

  if (!user?.selectedCharacter) {
    await sendTelegramMessage(chatId, "⚠️ 你还没有选择角色。请先在网页端选择一位。");
    return NextResponse.json({ ok: true });
  }

  const charData = CHARACTER_DATA.find((c) => c.name === user.selectedCharacter!.name);
  if (!charData) {
    await sendTelegramMessage(chatId, "⚠️ 角色数据异常，请重新选择。");
    return NextResponse.json({ ok: true });
  }

  const history = await prisma.message.findMany({
    where: { userId: user.id, characterId: user.selectedCharacter.id },
    orderBy: { createdAt: "desc" },
    take: 12,
    select: { role: true, content: true },
  });

  const msgs = history.reverse().map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));
  msgs.push({ role: "user", content: text });

  const profileStr = await getUserProfileString(user.id);
  const chatSummary = await getChatSummary(user.id, user.selectedCharacter.id);
  let systemPrompt = charData.systemPrompt.replace("{user_profile}", profileStr);
  if (chatSummary?.summary) {
    systemPrompt += `\n\n【过往对话回忆（早期已发生的事）】\n${chatSummary.summary}`;
  }

  try {
    const reply = await chatWithCharacter(systemPrompt, msgs);
    const cleanReply = reply.replace(/\[SEND_PHOTO:.*?\]/g, "").trim();

    await prisma.message.createMany({
      data: [
        { userId: user.id, characterId: user.selectedCharacter.id, role: "user", content: text },
        { userId: user.id, characterId: user.selectedCharacter.id, role: "assistant", content: cleanReply },
      ],
    });

    await sendTelegramMessage(chatId, cleanReply);

    // Background memory + affinity work, parity with web chat.
    extractUserProfile(user.id, text, cleanReply).catch(() => {});
    maybeRefreshChatSummary(user.id, user.selectedCharacter.id).catch(() => {});
    addAffinity(user.id, user.selectedCharacter.id, 2, "telegram").catch(() => {});
  } catch (error) {
    console.error("Telegram chat error:", error);
    await sendTelegramMessage(chatId, "😵 发生了一些问题，请稍后再试。");
  }

  return NextResponse.json({ ok: true });
}
