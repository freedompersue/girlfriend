import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { account, password } = await req.json();

    if (!account || !password) {
      return NextResponse.json({ error: "请输入用户名/邮箱和密码" }, { status: 400 });
    }

    const isEmail = account.includes("@");
    const user = isEmail
      ? await prisma.user.findUnique({ where: { email: account } })
      : await prisma.user.findUnique({ where: { username: account } });

    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: "账号或密码错误" }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "账号或密码错误" }, { status: 401 });
    }

    const token = signToken(user.id);

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        selectedCharacterId: user.selectedCharacterId,
      },
    });

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "登录失败" }, { status: 500 });
  }
}
