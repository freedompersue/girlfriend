import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { generateGoodnight, type GoodnightType } from "@/lib/goodnight";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  if (!user.selectedCharacterId || !user.selectedCharacter) {
    return NextResponse.json({ error: "未选择角色" }, { status: 400 });
  }

  const { type = "whisper" } = await req.json();
  const validTypes: GoodnightType[] = ["story", "whisper", "lullaby"];
  const gnType = validTypes.includes(type) ? type : "whisper";

  const result = await generateGoodnight(
    user.id,
    user.selectedCharacter.systemPrompt,
    user.selectedCharacter.name,
    user.selectedCharacter.voiceId || "female-shaonv",
    gnType
  );

  return NextResponse.json(result);
}
