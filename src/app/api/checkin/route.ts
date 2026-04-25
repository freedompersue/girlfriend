import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { doCheckIn, getCheckInStatus } from "@/lib/checkin";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  if (!user.selectedCharacterId) {
    return NextResponse.json({ error: "未选择角色" }, { status: 400 });
  }

  const result = await doCheckIn(user.id, user.selectedCharacterId);
  return NextResponse.json(result);
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  if (!user.selectedCharacterId) {
    return NextResponse.json({ checkedInToday: false, currentStreak: 0, totalDays: 0 });
  }

  const status = await getCheckInStatus(user.id, user.selectedCharacterId);
  return NextResponse.json(status);
}
