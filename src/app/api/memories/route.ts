import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MEMORY_CATEGORIES: Record<string, { zh: string; en: string; ja: string; icon: string }> = {
  name:                { zh: "姓名", en: "Name", ja: "名前", icon: "👤" },
  birthday:            { zh: "生日", en: "Birthday", ja: "誕生日", icon: "🎂" },
  age:                 { zh: "年龄", en: "Age", ja: "年齢", icon: "📅" },
  occupation:          { zh: "职业", en: "Occupation", ja: "職業", icon: "💼" },
  hobby:               { zh: "爱好", en: "Hobby", ja: "趣味", icon: "🎯" },
  location:            { zh: "所在地", en: "Location", ja: "所在地", icon: "📍" },
  pet:                 { zh: "宠物", en: "Pet", ja: "ペット", icon: "🐾" },
  food_preference:     { zh: "饮食偏好", en: "Food", ja: "食の好み", icon: "🍽️" },
  relationship_status: { zh: "感情状态", en: "Relationship", ja: "恋愛状況", icon: "💝" },
  recent_event:        { zh: "近期事件", en: "Recent Event", ja: "最近の出来事", icon: "📌" },
  mood:                { zh: "心情", en: "Mood", ja: "気分", icon: "🌈" },
  study:               { zh: "学业", en: "Study", ja: "学業", icon: "📚" },
  work_situation:      { zh: "工作状况", en: "Work", ja: "仕事状況", icon: "🏢" },
  music_preference:    { zh: "音乐偏好", en: "Music", ja: "音楽の好み", icon: "🎵" },
  dream:               { zh: "梦想", en: "Dream", ja: "夢", icon: "⭐" },
  family:              { zh: "家庭", en: "Family", ja: "家族", icon: "👨‍👩‍👧" },
  health:              { zh: "健康", en: "Health", ja: "健康", icon: "💊" },
  travel:              { zh: "旅行", en: "Travel", ja: "旅行", icon: "✈️" },
  personality:         { zh: "性格", en: "Personality", ja: "性格", icon: "🧠" },
  schedule:            { zh: "日程", en: "Schedule", ja: "スケジュール", icon: "📋" },
};

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const items = await prisma.userProfile.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });

  const memories = items.map((item) => ({
    id: item.id,
    key: item.key,
    value: item.value,
    source: item.source,
    updatedAt: item.updatedAt,
    category: MEMORY_CATEGORIES[item.key] || {
      zh: item.key,
      en: item.key,
      ja: item.key,
      icon: "💭",
    },
  }));

  return NextResponse.json({ memories, categories: MEMORY_CATEGORIES, total: memories.length });
}
