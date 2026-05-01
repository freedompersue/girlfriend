import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json(
      { error: "未登录" },
      {
        status: 401,
        headers: {
          "Cache-Control": "private, no-store",
          Vary: "Cookie",
        },
      }
    );
  }
  return NextResponse.json(
    { user },
    {
      headers: {
        "Cache-Control": "private, no-store",
        Vary: "Cookie",
      },
    }
  );
}
