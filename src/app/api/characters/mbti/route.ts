import { NextRequest, NextResponse } from "next/server";
import { CHARACTER_MBTI, getCharacterMatchScore, type MBTIType } from "@/lib/character-i18n";

const VALID_MBTI = [
  "INTJ", "INTP", "ENTJ", "ENTP",
  "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ",
  "ISTP", "ISFP", "ESTP", "ESFP",
];

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const mbti = (url.searchParams.get("mbti") || "").toUpperCase();

  if (!VALID_MBTI.includes(mbti)) {
    return NextResponse.json({ error: "Invalid MBTI type" }, { status: 400 });
  }

  const scores: Record<string, number> = {};
  for (const charName of Object.keys(CHARACTER_MBTI)) {
    scores[charName] = getCharacterMatchScore(mbti as MBTIType, charName);
  }

  return NextResponse.json({ mbti, scores });
}
