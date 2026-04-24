import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { characterId } = await req.json();
  if (!characterId) {
    return NextResponse.json({ error: "请选择一个角色" }, { status: 400 });
  }

  const character = await prisma.character.findUnique({
    where: { id: characterId },
  });
  if (!character) {
    return NextResponse.json({ error: "角色不存在" }, { status: 404 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { selectedCharacterId: characterId },
  });

  return NextResponse.json({ success: true, character });
}
