import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getMoodHistory, MOOD_LABELS } from "@/lib/mood";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  if (!user.selectedCharacterId) {
    return NextResponse.json({ error: "未选择角色" }, { status: 400 });
  }

  const url = new URL(req.url);
  const days = parseInt(url.searchParams.get("days") || "14");

  const data = await getMoodHistory(
    user.id,
    user.selectedCharacterId,
    Math.min(days, 90)
  );

  return NextResponse.json({ ...data, labels: MOOD_LABELS });
}
