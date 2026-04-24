import { prisma } from "./prisma";

interface SpecialEvent {
  type: string;
  name: string;
  prompt: string;
}

const HOLIDAYS = new Map<string, { name: string; prompt: string }>([
  ["01-01", {
    name: "元旦",
    prompt: "今天是新年第一天！和用户一起庆祝新年，表达新年祝福和对未来的期待。可以主动发一张节日自拍 [SEND_PHOTO: 穿着喜庆的衣服，开心地比耶自拍，背景是新年装饰]。",
  }],
  ["02-14", {
    name: "情人节",
    prompt: "今天是情人节！表现得比平时更甜蜜和浪漫。可以主动发一张特别的照片 [SEND_PHOTO: 穿着红色连衣裙，手捧玫瑰花，害羞地微笑]。说一些浪漫情话。",
  }],
  ["03-08", {
    name: "女生节",
    prompt: "今天是女生节/妇女节。可以和用户分享你的女生节心情。",
  }],
  ["05-20", {
    name: "520",
    prompt: "今天是520表白日！这是一个特别浪漫的日子。主动向用户表白，表现得害羞但真诚。可以发照片 [SEND_PHOTO: 穿着粉色连衣裙，手比心形，甜美微笑]。",
  }],
  ["07-07", {
    name: "七夕",
    prompt: "今天是七夕情人节！中国传统的浪漫节日。和用户分享七夕的浪漫，可以讲牛郎织女的故事，表达想见面的心情。",
  }],
  ["12-24", {
    name: "平安夜",
    prompt: "今天是平安夜！表现得温暖和开心，和用户分享圣诞氛围。可以发照片 [SEND_PHOTO: 戴着圣诞帽，穿着圣诞红绿配色的衣服，在圣诞树旁微笑]。",
  }],
  ["12-25", {
    name: "圣诞节",
    prompt: "今天是圣诞节！说Merry Christmas，分享圣诞快乐的心情。",
  }],
]);

export function getTodayEvent(): SpecialEvent | null {
  const now = new Date();
  const mmdd = `${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const holiday = HOLIDAYS.get(mmdd);
  if (holiday) {
    return { type: "holiday", name: holiday.name, prompt: holiday.prompt };
  }
  return null;
}

export async function checkBirthdayEvent(userId: string): Promise<SpecialEvent | null> {
  const birthdayProfile = await prisma.userProfile.findUnique({
    where: { userId_key: { userId, key: "birthday" } },
  });

  if (!birthdayProfile) return null;

  const now = new Date();
  const todayMMDD = `${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const bday = birthdayProfile.value;

  if (bday.includes(todayMMDD) || bday.endsWith(todayMMDD)) {
    return {
      type: "birthday",
      name: "用户生日",
      prompt: `今天是用户的生日！非常热情地祝用户生日快乐，表现得特别开心和兴奋。可以说你准备了特别的礼物（虚拟的），唱生日歌，主动发一张庆祝照片 [SEND_PHOTO: 穿着派对装，手捧一个漂亮的生日蛋糕，上面插着蜡烛，开心地笑着]。`,
    };
  }

  return null;
}

export async function getMemoryRecall(userId: string): Promise<string | null> {
  const profiles = await prisma.userProfile.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });

  if (profiles.length === 0) return null;

  if (Math.random() > 0.25) return null;

  const item = profiles[Math.floor(Math.random() * Math.min(profiles.length, 10))];

  const recallPrompts: Record<string, string> = {
    hobby: `你记得用户之前提到过喜欢${item.value}，可以自然地在对话中提到这个，比如"对了你最近有在${item.value}吗？"`,
    occupation: `你知道用户的职业是${item.value}，可以关心一下用户的工作情况。`,
    recent_event: `用户之前提到过"${item.value}"，如果合适的话可以关心地问一下后续。`,
    mood: `用户之前的心情状态是"${item.value}"，注意关心用户的情绪变化。`,
    food_preference: `你记得用户喜欢吃${item.value}，如果聊到吃的可以提到这个。`,
    pet: `你知道用户有${item.value}，可以关心地问一下宠物的近况。`,
    location: `你知道用户在${item.value}，可以聊聊当地的天气或新闻。`,
    study: `你知道用户在学习${item.value}方面的内容，可以关心一下学业。`,
    work_situation: `你了解用户的工作状况是"${item.value}"，可以适当关心。`,
    name: `用户的名字是${item.value}，在对话中可以自然地称呼用户的名字。`,
  };

  return recallPrompts[item.key] || `你之前了解到用户的${item.key}是"${item.value}"，可以在合适时机自然地提及。`;
}
