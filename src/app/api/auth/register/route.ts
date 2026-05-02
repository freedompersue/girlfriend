import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, username, password, name, turnstileToken } = await req.json();

    // 验证 Turnstile token
    if (!turnstileToken) {
      return NextResponse.json({ error: "请完成人机验证" }, { status: 403 });
    }
    const verifyResponse = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: process.env.TURNSTILE_SECRET_KEY,
          response: turnstileToken,
        }),
      }
    );
    const verifyResult = await verifyResponse.json();
    if (!verifyResult.success) {
      return NextResponse.json({ error: "人机验证失败，请重试" }, { status: 403 });
    }

    if (!username && !email) {
      return NextResponse.json({ error: "请输入用户名或邮箱" }, { status: 400 });
    }
    if (!password) {
      return NextResponse.json({ error: "密码不能为空" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "密码至少需要6个字符" }, { status: 400 });
    }

    if (username) {
      if (username.length < 2 || username.length > 20) {
        return NextResponse.json({ error: "用户名长度 2-20 个字符" }, { status: 400 });
      }
      if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(username)) {
        return NextResponse.json({ error: "用户名只能包含字母、数字、下划线或中文" }, { status: 400 });
      }
      const existingUser = await prisma.user.findUnique({ where: { username } });
      if (existingUser) {
        return NextResponse.json({ error: "该用户名已被注册" }, { status: 409 });
      }
    }

    if (email) {
      const existingEmail = await prisma.user.findUnique({ where: { email } });
      if (existingEmail) {
        return NextResponse.json({ error: "该邮箱已被注册" }, { status: 409 });
      }
    }

    const passwordHash = await hashPassword(password);
    const displayName = name || username || (email ? email.split("@")[0] : "用户");
    const user = await prisma.user.create({
      data: {
        email: email || null,
        username: username || null,
        passwordHash,
        name: displayName,
      },
    });

    const token = signToken(user.id);

    const response = NextResponse.json({
      user: { id: user.id, email: user.email, username: user.username, name: user.name },
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
    console.error("Registration error:", error);
    return NextResponse.json({ error: "注册失败" }, { status: 500 });
  }
}
