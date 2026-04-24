import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const characters = await prisma.character.findMany({
    select: {
      id: true,
      name: true,
      subtitle: true,
      tags: true,
      description: true,
      avatarUrl: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ characters });
}
