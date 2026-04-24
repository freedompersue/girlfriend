import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAffinity, AFFINITY_LEVELS } from "@/lib/affinity";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  if (!user.selectedCharacterId) {
    return NextResponse.json({ error: "未选择角色" }, { status: 400 });
  }

  const data = await getAffinity(user.id, user.selectedCharacterId);
  return NextResponse.json({ ...data, levels: AFFINITY_LEVELS });
}
