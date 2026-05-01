import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getMilestones } from "@/lib/milestone";
import type { Locale } from "@/lib/i18n";

function normalizeLocale(value: unknown): Locale {
  return value === "en" || value === "ja" || value === "zh" ? value : "zh";
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  if (!user.selectedCharacterId) {
    return NextResponse.json({ error: "未选择角色" }, { status: 400 });
  }

  const locale = normalizeLocale(new URL(req.url).searchParams.get("locale"));
  const milestones = await getMilestones(
    user.id,
    user.selectedCharacterId,
    locale,
    user.selectedCharacter?.name
  );
  return NextResponse.json({ milestones });
}
