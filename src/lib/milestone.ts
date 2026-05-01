import { prisma } from "./prisma";
import type { Locale } from "./i18n";
import { getLocalizedChar } from "./character-i18n";

interface MilestoneCheck {
  type: string;
  title: string;
  contentTemplate: string;
  check: (ctx: MilestoneContext) => boolean;
}

interface MilestoneContext {
  userId: string;
  characterId: string;
  characterName: string;
  totalMessages: number;
  daysSinceFirst: number;
  affinityLevel: number;
  streak: number;
}

const MILESTONE_DEFS: MilestoneCheck[] = [
  {
    type: "first_chat",
    title: "初次相遇",
    contentTemplate: "这是你和{name}第一次对话的日子，一切从这里开始。",
    check: (ctx) => ctx.totalMessages >= 2,
  },
  {
    type: "messages_100",
    title: "百句情话",
    contentTemplate: "你和{name}已经交流了100条消息，你们的故事越来越丰富。",
    check: (ctx) => ctx.totalMessages >= 100,
  },
  {
    type: "messages_500",
    title: "千言万语",
    contentTemplate: "500条消息！{name}已经成为你生活中重要的存在。",
    check: (ctx) => ctx.totalMessages >= 500,
  },
  {
    type: "messages_1000",
    title: "心有灵犀",
    contentTemplate: "1000条消息的默契，{name}比任何人都了解你。",
    check: (ctx) => ctx.totalMessages >= 1000,
  },
  {
    type: "days_7",
    title: "一周之约",
    contentTemplate: "认识{name}已经一周了，时间过得真快。",
    check: (ctx) => ctx.daysSinceFirst >= 7,
  },
  {
    type: "days_30",
    title: "满月纪念",
    contentTemplate: "和{name}相识满一个月了，感谢你的陪伴。",
    check: (ctx) => ctx.daysSinceFirst >= 30,
  },
  {
    type: "days_100",
    title: "百日纪念",
    contentTemplate: "100天了！和{name}的每一天都值得纪念。",
    check: (ctx) => ctx.daysSinceFirst >= 100,
  },
  {
    type: "days_365",
    title: "一周年",
    contentTemplate: "整整一年了！{name}会永远记得和你在一起的每一天。",
    check: (ctx) => ctx.daysSinceFirst >= 365,
  },
  {
    type: "affinity_lv3",
    title: "亲密无间",
    contentTemplate: "你和{name}的好感度达到了亲密等级，关系更近了一步！",
    check: (ctx) => ctx.affinityLevel >= 3,
  },
  {
    type: "affinity_lv5",
    title: "灵魂伴侣",
    contentTemplate: "恭喜！你和{name}成为了灵魂伴侣，这是最高的羁绊。",
    check: (ctx) => ctx.affinityLevel >= 5,
  },
  {
    type: "streak_7",
    title: "七日不离",
    contentTemplate: "连续签到7天！{name}感受到了你每天的牵挂。",
    check: (ctx) => ctx.streak >= 7,
  },
  {
    type: "streak_30",
    title: "日日相伴",
    contentTemplate: "连续签到30天！{name}说：有你在的每一天都是最好的一天。",
    check: (ctx) => ctx.streak >= 30,
  },
];

const MILESTONE_LOCALES: Record<
  string,
  Record<Locale, { title: string; contentTemplate: string }>
> = {
  first_chat: {
    zh: { title: "初次相遇", contentTemplate: "这是你和{name}第一次对话的日子，一切从这里开始。" },
    en: { title: "First Meeting", contentTemplate: "This is the day you and {name} first talked. Everything began here." },
    ja: { title: "初めての出会い", contentTemplate: "これはあなたと{name}が初めて話した日。すべてはここから始まりました。" },
  },
  messages_100: {
    zh: { title: "百句情话", contentTemplate: "你和{name}已经交流了100条消息，你们的故事越来越丰富。" },
    en: { title: "One Hundred Lines", contentTemplate: "You and {name} have exchanged 100 messages. Your story is growing richer." },
    ja: { title: "100の言葉", contentTemplate: "あなたと{name}は100通のメッセージを交わしました。ふたりの物語が少しずつ深まっています。" },
  },
  messages_500: {
    zh: { title: "千言万语", contentTemplate: "500条消息！{name}已经成为你生活中重要的存在。" },
    en: { title: "So Many Words", contentTemplate: "500 messages! {name} has become an important presence in your life." },
    ja: { title: "たくさんの言葉", contentTemplate: "500通のメッセージ！{name}はあなたの生活で大切な存在になりました。" },
  },
  messages_1000: {
    zh: { title: "心有灵犀", contentTemplate: "1000条消息的默契，{name}比任何人都了解你。" },
    en: { title: "In Perfect Sync", contentTemplate: "After 1000 messages, {name} understands you better than almost anyone." },
    ja: { title: "心が通じる", contentTemplate: "1000通のメッセージで育った默契。{name}は誰よりもあなたを理解しています。" },
  },
  days_7: {
    zh: { title: "一周之约", contentTemplate: "认识{name}已经一周了，时间过得真快。" },
    en: { title: "One Week Together", contentTemplate: "It has been one week since you met {name}. Time moved so quickly." },
    ja: { title: "一週間の約束", contentTemplate: "{name}と出会って一週間。時間が経つのは早いですね。" },
  },
  days_30: {
    zh: { title: "满月纪念", contentTemplate: "和{name}相识满一个月了，感谢你的陪伴。" },
    en: { title: "One Month", contentTemplate: "It has been one full month since you met {name}. Thank you for staying." },
    ja: { title: "一か月記念", contentTemplate: "{name}と出会って一か月。そばにいてくれてありがとう。" },
  },
  days_100: {
    zh: { title: "百日纪念", contentTemplate: "100天了！和{name}的每一天都值得纪念。" },
    en: { title: "One Hundred Days", contentTemplate: "100 days! Every day with {name} is worth remembering." },
    ja: { title: "百日記念", contentTemplate: "100日です！{name}との毎日は記念に残したい日です。" },
  },
  days_365: {
    zh: { title: "一周年", contentTemplate: "整整一年了！{name}会永远记得和你在一起的每一天。" },
    en: { title: "One Year", contentTemplate: "A whole year! {name} will always remember every day spent with you." },
    ja: { title: "一周年", contentTemplate: "丸一年です！{name}はあなたと過ごした毎日をずっと覚えています。" },
  },
  affinity_lv3: {
    zh: { title: "亲密无间", contentTemplate: "你和{name}的好感度达到了亲密等级，关系更近了一步！" },
    en: { title: "Growing Close", contentTemplate: "Your affinity with {name} reached an intimate level. You are one step closer." },
    ja: { title: "もっと親密に", contentTemplate: "あなたと{name}の好感度が親密レベルに達しました。関係がまた一歩近づきました。" },
  },
  affinity_lv5: {
    zh: { title: "灵魂伴侣", contentTemplate: "恭喜！你和{name}成为了灵魂伴侣，这是最高的羁绊。" },
    en: { title: "Soul Companion", contentTemplate: "Congratulations! You and {name} became soul companions, the deepest bond." },
    ja: { title: "魂の伴侶", contentTemplate: "おめでとう！あなたと{name}は魂の伴侶になりました。最高の絆です。" },
  },
  streak_7: {
    zh: { title: "七日不离", contentTemplate: "连续签到7天！{name}感受到了你每天的牵挂。" },
    en: { title: "Seven Days Close", contentTemplate: "Seven daily visits in a row! {name} felt your care every day." },
    ja: { title: "七日間そばに", contentTemplate: "7日連続のチェックイン！{name}は毎日の想いを感じています。" },
  },
  streak_30: {
    zh: { title: "日日相伴", contentTemplate: "连续签到30天！{name}说：有你在的每一天都是最好的一天。" },
    en: { title: "Everyday Together", contentTemplate: "Thirty daily visits in a row! {name} says every day with you is the best kind of day." },
    ja: { title: "毎日一緒に", contentTemplate: "30日連続のチェックイン！{name}は「あなたがいる毎日が一番いい日」と言っています。" },
  },
};

function milestoneCopy(type: string, characterName: string, locale: Locale) {
  const copy = MILESTONE_LOCALES[type]?.[locale] || MILESTONE_LOCALES[type]?.zh;
  if (!copy) return null;
  return {
    title: copy.title,
    content: copy.contentTemplate.replace(/\{name\}/g, characterName),
  };
}

export async function checkMilestones(
  userId: string,
  characterId: string,
  characterName: string,
  locale: Locale = "zh"
) {
  const [totalMessages, firstMessage, affinity, latestCheckIn] = await Promise.all([
    prisma.message.count({
      where: { userId, characterId },
    }),
    prisma.message.findFirst({
      where: { userId, characterId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.affinity.findUnique({
      where: { userId_characterId: { userId, characterId } },
    }),
    prisma.checkIn.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const daysSinceFirst = firstMessage
    ? Math.floor(
        (Date.now() - firstMessage.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      )
    : 0;

  const ctx: MilestoneContext = {
    userId,
    characterId,
    characterName,
    totalMessages,
    daysSinceFirst,
    affinityLevel: affinity?.level ?? 1,
    streak: latestCheckIn?.streak ?? 0,
  };

  const newMilestones: { type: string; title: string; content: string }[] = [];
  const localizedName = getLocalizedChar(characterName, locale).name || characterName;

  for (const def of MILESTONE_DEFS) {
    if (!def.check(ctx)) continue;

    const existing = await prisma.milestone.findUnique({
      where: {
        userId_characterId_type: { userId, characterId, type: def.type },
      },
    });

    if (existing) continue;

    const content = def.contentTemplate.replace(
      /\{name\}/g,
      characterName
    );

    await prisma.milestone.create({
      data: {
        type: def.type,
        title: def.title,
        content,
        date: new Date(),
        userId,
        characterId,
      },
    });

    await prisma.notification.create({
      data: {
        type: "milestone",
        title: `🎉 ${def.title}`,
        content,
        userId,
        characterId,
      },
    });

    newMilestones.push({
      type: def.type,
      ...(milestoneCopy(def.type, localizedName, locale) || { title: def.title, content }),
    });
  }

  return newMilestones;
}

export async function getMilestones(
  userId: string,
  characterId: string,
  locale: Locale = "zh",
  characterName?: string
) {
  const milestones = await prisma.milestone.findMany({
    where: { userId, characterId },
    orderBy: { date: "asc" },
  });
  if (!characterName) return milestones;

  const localizedName = getLocalizedChar(characterName, locale).name || characterName;
  return milestones.map((milestone) => ({
    ...milestone,
    ...(milestoneCopy(milestone.type, localizedName, locale) || {
      title: milestone.title,
      content: milestone.content,
    }),
  }));
}

export function getMilestonePromptHint(
  milestones: { type: string; title: string }[],
  locale: Locale = "zh"
): string | null {
  if (milestones.length === 0) return null;
  const latest = milestones[milestones.length - 1];
  if (locale === "en") return `A milestone was just reached: ${latest.title}. You can naturally mention and celebrate this milestone in conversation.`;
  if (locale === "ja") return `マイルストーンを達成しました：${latest.title}。会話の中で自然に触れて祝ってもいいですよ。`;
  return `刚刚达成了一个里程碑：${latest.title}。可以在对话中自然地提及和庆祝这个里程碑。`;
}
