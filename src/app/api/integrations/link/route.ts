import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verify } from "jsonwebtoken";
import { randomBytes } from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key";

function getUserId(req: NextRequest): string | null {
  const cookie = req.cookies.get("token");
  if (!cookie) return null;
  try {
    const decoded = verify(cookie.value, JWT_SECRET) as { userId: string };
    return decoded.userId;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const links = await prisma.externalLink.findMany({
    where: { userId },
    select: { id: true, platform: true, externalId: true, linkCode: true, active: true, createdAt: true },
  });

  return NextResponse.json({ links });
}

export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { platform } = await req.json();
  if (!["telegram", "qq"].includes(platform)) {
    return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
  }

  const existing = await prisma.externalLink.findFirst({
    where: { userId, platform },
  });
  if (existing) {
    return NextResponse.json({ linkCode: existing.linkCode, alreadyExists: true });
  }

  const linkCode = randomBytes(4).toString("hex");
  const link = await prisma.externalLink.create({
    data: { userId, platform, externalId: "", linkCode },
  });

  return NextResponse.json({ linkCode: link.linkCode });
}

export async function DELETE(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { platform } = await req.json();
  await prisma.externalLink.deleteMany({ where: { userId, platform } });

  return NextResponse.json({ ok: true });
}
