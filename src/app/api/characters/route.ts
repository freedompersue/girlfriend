import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CHARACTER_LOCALES, CHARACTER_MBTI } from "@/lib/character-i18n";
import type { Locale } from "@/lib/i18n";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const locale = (url.searchParams.get("locale") || "zh") as Locale;

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

  const localized = characters.map((c) => {
    const loc = CHARACTER_LOCALES[c.name]?.[locale];
    const mbti = CHARACTER_MBTI[c.name] || null;
    return {
      ...c,
      name: loc?.name || c.name,
      subtitle: loc?.subtitle || c.subtitle,
      description: loc?.description || c.description,
      tags: loc?.tags || c.tags,
      originalName: c.name,
      mbti,
    };
  });

  return NextResponse.json({ characters: localized });
}
