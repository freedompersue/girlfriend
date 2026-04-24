import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateTTS } from "@/lib/minimax";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { messageId } = await req.json();
  if (!messageId) {
    return NextResponse.json({ error: "消息ID不能为空" }, { status: 400 });
  }

  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: { character: true },
  });

  if (!message || message.userId !== user.id) {
    return NextResponse.json({ error: "消息不存在" }, { status: 404 });
  }

  if (message.audioUrl) {
    return NextResponse.json({ audioUrl: message.audioUrl });
  }

  const voiceId = message.character.voiceId || "female-shaonv";
  const audioUrl = await generateTTS(message.content, voiceId);

  if (!audioUrl) {
    return NextResponse.json({ error: "语音生成失败" }, { status: 500 });
  }

  await prisma.message.update({
    where: { id: messageId },
    data: { audioUrl },
  });

  return NextResponse.json({ audioUrl });
}
