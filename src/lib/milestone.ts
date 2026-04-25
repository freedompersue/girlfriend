import { prisma } from "./prisma";

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

export async function checkMilestones(
  userId: string,
  characterId: string,
  characterName: string
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

    newMilestones.push({ type: def.type, title: def.title, content });
  }

  return newMilestones;
}

export async function getMilestones(userId: string, characterId: string) {
  return prisma.milestone.findMany({
    where: { userId, characterId },
    orderBy: { date: "asc" },
  });
}

export function getMilestonePromptHint(
  milestones: { type: string; title: string }[]
): string | null {
  if (milestones.length === 0) return null;
  const latest = milestones[milestones.length - 1];
  return `刚刚达成了一个里程碑：${latest.title}。可以在对话中自然地提及和庆祝这个里程碑。`;
}
