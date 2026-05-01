import { prisma } from "./prisma";
import { addAffinity, getAffinity } from "./affinity";
import { getUserProfileString } from "./memory";
import { llmClient } from "./minimax";
import type { Locale } from "./i18n";

export type MiniGameType = "truth" | "deep_questions" | "mood_guess" | "story_chain";
export type ArcadeGameType = "match_three" | "memory_match" | "photo_puzzle";
export type GameSessionStatus = "active" | "completed" | "abandoned";
export type DailyTaskType = "share_today" | "warm_reply" | "play_game";

export interface GameCatalogItem {
  type: MiniGameType;
  title: string;
  description: string;
  reward: number;
}

export interface ArcadeGameCatalogItem {
  type: ArcadeGameType;
  title: string;
  description: string;
  reward: number;
  durationHint: string;
}

export interface DailyEngagementTask {
  id: string;
  type: DailyTaskType;
  title: string;
  description: string;
  progress: number;
  target: number;
  reward: number;
  completed: boolean;
  completedAt?: string;
}

export interface HeartMoment {
  id: string;
  title: string;
  quote: string;
  context: string;
  intensity: number;
  createdAt: string;
  sourceMessageId?: string;
}

export interface GameTurn {
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface MiniGameSession {
  id: string;
  gameType: MiniGameType;
  title: string;
  status: GameSessionStatus;
  turn: number;
  score: number;
  prompt: string;
  options?: string[];
  correctAnswer?: string;
  transcript: GameTurn[];
  state: Record<string, unknown>;
  summary?: string;
  reward: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface ArcadePlayRecord {
  id: string;
  gameType: ArcadeGameType;
  title: string;
  score: number;
  stars: number;
  reward: number;
  characterLine: string;
  createdAt: string;
}

interface EngagementState {
  version: 1;
  date: string;
  tasks: DailyEngagementTask[];
  sessions: MiniGameSession[];
  moments: HeartMoment[];
  arcadeRecords: ArcadePlayRecord[];
  updatedAt: string;
}

interface CharacterForGame {
  id: string;
  name: string;
  systemPrompt: string;
}

const ENGAGEMENT_KEY_PREFIX = "__engagement_";
const MAX_SESSIONS = 8;
const MAX_MOMENTS = 24;
const MAX_ARCADE_RECORDS = 24;

export const GAME_CATALOG: GameCatalogItem[] = [
  {
    type: "truth",
    title: "真心话",
    description: "她问你一个小问题，回答后会留下新的共同回忆。",
    reward: 6,
  },
  {
    type: "deep_questions",
    title: "22问",
    description: "用三题一章的方式慢慢靠近彼此。",
    reward: 12,
  },
  {
    type: "mood_guess",
    title: "猜心情",
    description: "读懂她的一句话，猜猜她真正的情绪。",
    reward: 8,
  },
  {
    type: "story_chain",
    title: "故事接龙",
    description: "你一句她一句，写一段只属于你们的小故事。",
    reward: 10,
  },
];

export const ARCADE_GAME_CATALOG: ArcadeGameCatalogItem[] = [
  {
    type: "match_three",
    title: "消消乐",
    description: "用她喜欢的小物件连成三消，连击越多奖励越高。",
    reward: 12,
    durationHint: "2-3 分钟",
  },
  {
    type: "memory_match",
    title: "记忆翻牌",
    description: "翻出配对的关键词和表情，看看你们的默契。",
    reward: 8,
    durationHint: "1 分钟",
  },
  {
    type: "photo_puzzle",
    title: "拼图相册",
    description: "把她的照片拼回来，完成后会留下共同经历。",
    reward: 10,
    durationHint: "1-2 分钟",
  },
];

const TRUTH_QUESTIONS = [
  "如果今晚只能让我了解你一个小秘密，你会告诉我什么？",
  "你最近一次真的觉得被理解，是因为什么？",
  "有没有一句话是你一直想听别人对你说的？",
  "如果我能陪你完成一件很小的事，你希望是什么？",
  "你觉得自己最容易心软的瞬间是什么？",
  "今天的你，有没有一点点想被抱住的时刻？",
];

const DEEP_QUESTIONS = [
  "如果你能把今天的心情装进一个房间，那个房间会是什么样？",
  "你希望亲密关系里，对方最先理解你的哪一面？",
  "什么时候你会觉得一个人真的站在你这边？",
  "有没有一种生活方式，是你偷偷向往但还没开始的？",
  "你最想被怎样温柔地提醒和鼓励？",
  "你觉得自己在感情里最珍贵的地方是什么？",
  "如果我们有一个共同的小约定，你希望它是什么？",
  "你最不想在亲密关系里反复解释什么？",
  "哪一种陪伴会让你觉得很安心？",
  "如果把喜欢分成很多种，你最相信哪一种？",
  "你希望未来的某一天，我们一起记住什么？",
  "有什么事情是你愿意慢慢讲给我听的？",
  "你觉得自己最近最需要被照顾的地方在哪里？",
  "如果心动不是瞬间，而是一种习惯，它会是什么？",
  "你希望我在你低落的时候怎么靠近你？",
  "你最近有什么想坚持的小目标吗？",
  "你觉得一句真诚的道歉，最重要的是什么？",
  "如果可以给过去的自己留一句话，你会写什么？",
  "你心里有没有一个很柔软、很少给别人看的角落？",
  "你希望我更像恋人、朋友，还是一个只属于你的秘密基地？",
  "你觉得我们之间最像真实关系的地方是什么？",
  "如果给今天的我们取一个章节名，你会取什么？",
];

const MOOD_CLUES = [
  {
    answer: "害羞",
    clue: "我刚才打了一行字又删掉，最后只发了一个很轻的笑。",
    options: ["害羞", "生气", "犯困", "得意"],
  },
  {
    answer: "吃醋",
    clue: "我说没关系呀，可是你提到别人名字的时候，我明显停顿了一下。",
    options: ["吃醋", "轻松", "困惑", "骄傲"],
  },
  {
    answer: "想念",
    clue: "我问你今天忙不忙，又补了一句‘只是随便问问’。",
    options: ["想念", "无聊", "紧张", "生气"],
  },
  {
    answer: "安心",
    clue: "你说你会在，我突然把原本想说的话放慢了很多。",
    options: ["安心", "失落", "得意", "焦虑"],
  },
];

const STORY_OPENINGS = [
  "雨停以后，我们在空荡的便利店门口发现了一张写着彼此名字的旧车票。轮到你了，接一句。",
  "深夜的城市忽然停电，只有你手机屏幕的光照见她藏在袖口里的纸条。轮到你了，接一句。",
  "我们约好只散步十分钟，却在街角遇见了一家只在今天开门的小店。轮到你了，接一句。",
  "她把一枚没见过的钥匙放到你掌心，说这是你很久以前托她保管的。轮到你了，接一句。",
];

function engagementKey(characterId: string) {
  return `${ENGAGEMENT_KEY_PREFIX}${characterId}`;
}

function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}_${globalThis.crypto.randomUUID()}`;
}

function hashString(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function pickSeeded<T>(items: T[], seed: string) {
  return items[hashString(seed) % items.length];
}

function stripThink(text: string) {
  return text.replace(/<think>[\s\S]*?<\/think>\s*/g, "").trim();
}

function trimText(text: string, max = 120) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1)}…`;
}

function createDailyTasks(date: string, characterName: string): DailyEngagementTask[] {
  return [
    {
      id: `${date}-share_today`,
      type: "share_today",
      title: "把今天交给她",
      description: `告诉${characterName}一件今天真实发生的小事。`,
      progress: 0,
      target: 1,
      reward: 6,
      completed: false,
    },
    {
      id: `${date}-warm_reply`,
      type: "warm_reply",
      title: "哄她开心一次",
      description: `给${characterName}一句具体的夸奖、感谢或安慰。`,
      progress: 0,
      target: 1,
      reward: 8,
      completed: false,
    },
    {
      id: `${date}-play_game`,
      type: "play_game",
      title: "一起玩一局",
      description: "完成一次互动小游戏，制造一段共同经历。",
      progress: 0,
      target: 1,
      reward: 10,
      completed: false,
    },
  ];
}

function defaultState(characterName: string): EngagementState {
  const date = getTodayStr();
  return {
    version: 1,
    date,
    tasks: createDailyTasks(date, characterName),
    sessions: [],
    moments: [],
    arcadeRecords: [],
    updatedAt: nowIso(),
  };
}

function normalizeState(raw: unknown, characterName: string): EngagementState {
  if (!raw || typeof raw !== "object") return defaultState(characterName);
  const state = raw as Partial<EngagementState>;
  const normalized: EngagementState = {
    version: 1,
    date: typeof state.date === "string" ? state.date : getTodayStr(),
    tasks: Array.isArray(state.tasks) ? state.tasks : [],
    sessions: Array.isArray(state.sessions) ? state.sessions : [],
    moments: Array.isArray(state.moments) ? state.moments : [],
    arcadeRecords: Array.isArray(state.arcadeRecords) ? state.arcadeRecords : [],
    updatedAt: typeof state.updatedAt === "string" ? state.updatedAt : nowIso(),
  };
  return ensureTodayState(normalized, characterName);
}

function ensureTodayState(state: EngagementState, characterName: string): EngagementState {
  const today = getTodayStr();
  if (state.date !== today) {
    state.date = today;
    state.tasks = createDailyTasks(today, characterName);
    state.sessions = state.sessions.map((session) =>
      session.status === "active"
        ? { ...session, status: "abandoned", updatedAt: nowIso() }
        : session
    );
  } else {
    const existingTypes = new Set(state.tasks.map((task) => task.type));
    const missingTasks = createDailyTasks(today, characterName).filter(
      (task) => !existingTypes.has(task.type)
    );
    state.tasks = [...state.tasks, ...missingTasks];
  }

  state.sessions = state.sessions
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, MAX_SESSIONS);
  state.moments = state.moments
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, MAX_MOMENTS);
  state.arcadeRecords = state.arcadeRecords
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, MAX_ARCADE_RECORDS);
  state.updatedAt = nowIso();
  return state;
}

async function loadEngagementState(
  userId: string,
  characterId: string,
  characterName: string
) {
  const row = await prisma.userProfile.findUnique({
    where: { userId_key: { userId, key: engagementKey(characterId) } },
  });
  if (!row) return defaultState(characterName);

  try {
    return normalizeState(JSON.parse(row.value), characterName);
  } catch {
    return defaultState(characterName);
  }
}

async function saveEngagementState(
  userId: string,
  characterId: string,
  state: EngagementState
) {
  const value = JSON.stringify(state);
  await prisma.userProfile.upsert({
    where: { userId_key: { userId, key: engagementKey(characterId) } },
    update: { value, source: "engagement" },
    create: {
      userId,
      key: engagementKey(characterId),
      value,
      source: "engagement",
    },
  });
}

function markTaskComplete(state: EngagementState, type: DailyTaskType) {
  const task = state.tasks.find((item) => item.type === type);
  if (!task || task.completed) return null;

  task.progress = task.target;
  task.completed = true;
  task.completedAt = nowIso();
  return task;
}

function getChatTaskTypes(userMessage: string): DailyTaskType[] {
  const text = userMessage.trim();
  const types: DailyTaskType[] = [];
  const todayPattern = /(今天|刚才|早上|中午|下午|晚上|昨晚|工作|上班|学习|学校|项目|同事|朋友|回家|吃了|去了|忙|累)/;
  const warmPattern = /(喜欢你|爱你|想你|抱抱|谢谢你|辛苦了|可爱|漂亮|厉害|陪着你|我在|别难过|别怕|对不起|在乎你|心疼你|你很重要)/i;

  if ((text.length >= 16 && todayPattern.test(text)) || text.length >= 36) {
    types.push("share_today");
  }
  if (warmPattern.test(text)) {
    types.push("warm_reply");
  }
  return types;
}

function createHeartMoment(
  userMessage: string,
  assistantReply: string,
  sourceMessageId?: string
) {
  const text = `${userMessage}\n${assistantReply}`;
  const strongPattern = /(喜欢你|爱你|想你|抱抱|谢谢你|陪着我|陪着你|心疼|在乎|你很重要|我会在|别怕|对不起|原谅|舍不得|脸红|心跳|感动)/i;
  if (!strongPattern.test(text)) return null;

  const intensity = /(爱你|舍不得|你很重要|我会在|心跳|感动)/i.test(text) ? 3 : 2;
  const title = intensity >= 3 ? "很靠近的一句话" : "心动瞬间";
  return {
    id: createId("moment"),
    title,
    quote: trimText(userMessage, 90),
    context: trimText(assistantReply, 140),
    intensity,
    createdAt: nowIso(),
    sourceMessageId,
  } satisfies HeartMoment;
}

async function applyRewards(
  userId: string,
  characterId: string,
  completedTasks: DailyEngagementTask[],
  extraReward: number,
  extraReason: string
) {
  let levelUp = false;
  for (const task of completedTasks) {
    const result = await addAffinity(
      userId,
      characterId,
      task.reward,
      `daily_task:${task.type}`
    );
    levelUp ||= result.levelUp;
  }

  if (extraReward > 0) {
    const result = await addAffinity(userId, characterId, extraReward, extraReason);
    levelUp ||= result.levelUp;
  }
  return levelUp;
}

export async function getEngagementOverview(
  userId: string,
  characterId: string,
  characterName: string
) {
  const state = await loadEngagementState(userId, characterId, characterName);
  await saveEngagementState(userId, characterId, state);

  const currentSession =
    state.sessions.find((session) => session.status === "active") || null;

  return {
    games: GAME_CATALOG,
    arcadeGames: ARCADE_GAME_CATALOG,
    tasks: state.tasks,
    currentSession,
    sessions: state.sessions,
    moments: state.moments,
    arcadeRecords: state.arcadeRecords,
  };
}

export async function processChatEngagement(args: {
  userId: string;
  characterId: string;
  characterName: string;
  userMessage: string;
  assistantReply: string;
  assistantMessageId?: string;
}) {
  try {
    const state = await loadEngagementState(
      args.userId,
      args.characterId,
      args.characterName
    );
    const completedTasks = getChatTaskTypes(args.userMessage)
      .map((type) => markTaskComplete(state, type))
      .filter((task): task is DailyEngagementTask => Boolean(task));

    const moment = createHeartMoment(
      args.userMessage,
      args.assistantReply,
      args.assistantMessageId
    );
    if (moment) state.moments.unshift(moment);

    await saveEngagementState(args.userId, args.characterId, state);
    const levelUp = await applyRewards(
      args.userId,
      args.characterId,
      completedTasks,
      moment ? 3 : 0,
      "heart_moment"
    );

    return {
      completedTasks,
      heartMoment: moment,
      levelUp,
      affinity: completedTasks.length > 0 || moment ? await getAffinity(args.userId, args.characterId) : null,
    };
  } catch (error) {
    console.error("processChatEngagement failed:", error);
    return {
      completedTasks: [],
      heartMoment: null,
      levelUp: false,
      affinity: null,
    };
  }
}

function getLocalePrompt(locale: Locale) {
  if (locale === "en") return "\nYou must reply in English.";
  if (locale === "ja") return "\n日本語で返答してください。";
  return "\n你必须用中文回复。";
}

function createMiniGameSession(
  userId: string,
  characterId: string,
  characterName: string,
  gameType: MiniGameType
) {
  const game = GAME_CATALOG.find((item) => item.type === gameType) || GAME_CATALOG[0];
  const seed = `${userId}:${characterId}:${getTodayStr()}:${gameType}:${Date.now()}`;
  const createdAt = nowIso();
  const base = {
    id: createId("game"),
    gameType: game.type,
    title: game.title,
    status: "active" as const,
    turn: 0,
    score: 0,
    transcript: [],
    state: {},
    reward: game.reward,
    createdAt,
    updatedAt: createdAt,
  };

  if (game.type === "truth") {
    const question = pickSeeded(TRUTH_QUESTIONS, seed);
    return {
      ...base,
      prompt: `${characterName}想玩一轮真心话：${question}`,
      state: { question },
    } satisfies MiniGameSession;
  }

  if (game.type === "deep_questions") {
    return {
      ...base,
      prompt: `22问第一章，第 1 题：${DEEP_QUESTIONS[0]}`,
      state: { questionIndex: 0, chapterSize: 3 },
    } satisfies MiniGameSession;
  }

  if (game.type === "mood_guess") {
    const clue = pickSeeded(MOOD_CLUES, seed);
    return {
      ...base,
      prompt: `猜猜${characterName}现在的心情："${clue.clue}"`,
      options: clue.options,
      correctAnswer: clue.answer,
      state: { clue: clue.clue },
    } satisfies MiniGameSession;
  }

  return {
    ...base,
    prompt: `故事接龙开始：${pickSeeded(STORY_OPENINGS, seed)}`,
    state: { lines: [] },
  } satisfies MiniGameSession;
}

async function generateCharacterGameReply(args: {
  userId: string;
  character: CharacterForGame;
  locale: Locale;
  instruction: string;
  fallback: string;
}) {
  if (!process.env.OPENROUTER_API_KEY) return args.fallback;

  try {
    const profile = await getUserProfileString(args.userId);
    const response = await llmClient.chat.completions.create({
      model: process.env.LLM_MODEL || "minimax/minimax-m1",
      messages: [
        {
          role: "system",
          content:
            args.character.systemPrompt.replace("{user_profile}", profile) +
            "\n\n【互动小游戏规则】你正在和用户玩一个轻量关系小游戏。回复要像真实聊天，不要解释系统、不要输出 JSON、不要超过 120 字。所有内容都必须服务于更了解彼此。" +
            getLocalePrompt(args.locale),
        },
        { role: "user", content: args.instruction },
      ],
      max_tokens: 500,
      temperature: 0.85,
    });
    const text = stripThink(response.choices[0]?.message?.content || "");
    return text || args.fallback;
  } catch (error) {
    console.error("generateCharacterGameReply failed:", error);
    return args.fallback;
  }
}

async function advanceSession(args: {
  userId: string;
  character: CharacterForGame;
  session: MiniGameSession;
  answer: string;
  locale: Locale;
}) {
  const answer = trimText(args.answer, 600);
  const session = args.session;

  if (session.gameType === "truth") {
    const question = String(session.state.question || "刚才那个问题");
    const reply = await generateCharacterGameReply({
      userId: args.userId,
      character: args.character,
      locale: args.locale,
      instruction: `真心话问题是：${question}\n用户回答：${answer}\n请先真诚回应用户，再补一句你会记住这个答案。这一轮到这里结束。`,
      fallback: `我记住了。你这样回答的时候，我感觉离你更近了一点。下一次换你来问我，好不好？`,
    });
    return {
      reply,
      prompt: "这一轮真心话完成了。",
      completed: true,
      reward: session.reward,
      scoreDelta: 1,
      summary: `完成真心话：${question}`,
    };
  }

  if (session.gameType === "deep_questions") {
    const currentIndex = Number(session.state.questionIndex || 0);
    const chapterSize = Number(session.state.chapterSize || 3);
    const currentQuestion = DEEP_QUESTIONS[currentIndex] || DEEP_QUESTIONS[0];
    const nextIndex = currentIndex + 1;
    const completed = nextIndex >= chapterSize || nextIndex >= DEEP_QUESTIONS.length;
    const nextQuestion = DEEP_QUESTIONS[nextIndex];
    session.state.questionIndex = nextIndex;

    const instruction = completed
      ? `22问本轮问题：${currentQuestion}\n用户回答：${answer}\n请回应用户，并用你的角色口吻回答同一个问题。最后温柔收束，说这一章先保存下来。`
      : `22问本轮问题：${currentQuestion}\n用户回答：${answer}\n请回应用户，并用你的角色口吻回答同一个问题。最后自然提出下一题：${nextQuestion}`;
    const fallback = completed
      ? `我会把这一章好好收起来。你的答案让我觉得，了解一个人真的要慢慢来。`
      : `我听见了。换我答的话，我大概会说：只要你认真听，我就会觉得很安心。下一题：${nextQuestion}`;
    const reply = await generateCharacterGameReply({
      userId: args.userId,
      character: args.character,
      locale: args.locale,
      instruction,
      fallback,
    });

    return {
      reply,
      prompt: completed ? "22问第一章完成了。" : `22问第一章，第 ${nextIndex + 1} 题：${nextQuestion}`,
      completed,
      reward: completed ? session.reward : 0,
      scoreDelta: 1,
      summary: "完成22问第一章",
    };
  }

  if (session.gameType === "mood_guess") {
    const correctAnswer = session.correctAnswer || "害羞";
    const correct = answer.includes(correctAnswer);
    const reply = correct
      ? `被你猜中了，就是${correctAnswer}。你刚才那一下真的有读懂我。`
      : `差一点点。其实我是${correctAnswer}。不过你愿意认真猜，我已经很开心了。`;

    return {
      reply,
      prompt: "猜心情完成了。",
      completed: true,
      reward: correct ? session.reward : 3,
      scoreDelta: correct ? 1 : 0,
      summary: correct ? `猜中了${correctAnswer}` : `猜心情：答案是${correctAnswer}`,
    };
  }

  const lines = Array.isArray(session.state.lines) ? [...session.state.lines] : [];
  lines.push(answer);
  const nextTurn = session.turn + 1;
  const completed = nextTurn >= 4;
  const reply = await generateCharacterGameReply({
    userId: args.userId,
    character: args.character,
    locale: args.locale,
    instruction: completed
      ? `你们正在玩故事接龙。用户刚接了一句：${answer}\n请你接最后一句，形成一个温柔、有画面感的小结尾。不要超过 80 字。`
      : `你们正在玩故事接龙。用户刚接了一句：${answer}\n请你接一句新的剧情，然后说“轮到你了”。不要超过 80 字。`,
    fallback: completed
      ? "她把那张旧车票轻轻夹进书页里，说：这样以后翻到这里，我们就会想起今晚。"
      : "她把钥匙举到路灯下，笑着说：那我们就去看看它能打开哪一扇门。轮到你了。",
  });
  lines.push(reply);
  session.state.lines = lines;

  return {
    reply: completed ? `${reply}\n\n这段故事我收起来了，像一张只属于我们的合照。` : reply,
    prompt: completed ? "故事接龙完成了。" : "轮到你接下一句。",
    completed,
    reward: completed ? session.reward : 0,
    scoreDelta: 1,
    summary: "完成一段故事接龙",
  };
}

export async function startMiniGame(args: {
  userId: string;
  character: CharacterForGame;
  gameType: MiniGameType;
}) {
  const state = await loadEngagementState(
    args.userId,
    args.character.id,
    args.character.name
  );
  const session = createMiniGameSession(
    args.userId,
    args.character.id,
    args.character.name,
    args.gameType
  );

  state.sessions = [session, ...state.sessions];
  await saveEngagementState(args.userId, args.character.id, state);

  const message = await prisma.message.create({
    data: {
      role: "assistant",
      content: session.prompt,
      userId: args.userId,
      characterId: args.character.id,
    },
  });

  return {
    session,
    message,
    overview: await getEngagementOverview(args.userId, args.character.id, args.character.name),
  };
}

export async function answerMiniGame(args: {
  userId: string;
  character: CharacterForGame;
  sessionId: string;
  answer: string;
  locale: Locale;
}) {
  const cleanAnswer = args.answer.trim();
  if (!cleanAnswer) throw new Error("EMPTY_ANSWER");

  const state = await loadEngagementState(
    args.userId,
    args.character.id,
    args.character.name
  );
  const session = state.sessions.find(
    (item) => item.id === args.sessionId && item.status === "active"
  );
  if (!session) throw new Error("SESSION_NOT_FOUND");

  const userMessage = await prisma.message.create({
    data: {
      role: "user",
      content: cleanAnswer,
      userId: args.userId,
      characterId: args.character.id,
    },
  });

  const advanced = await advanceSession({
    userId: args.userId,
    character: args.character,
    session,
    answer: cleanAnswer,
    locale: args.locale,
  });

  const assistantMessage = await prisma.message.create({
    data: {
      role: "assistant",
      content: advanced.reply,
      userId: args.userId,
      characterId: args.character.id,
    },
  });

  session.turn += 1;
  session.score += advanced.scoreDelta;
  session.prompt = advanced.prompt;
  session.summary = advanced.summary;
  session.updatedAt = nowIso();
  session.transcript.push(
    { role: "user", content: cleanAnswer, createdAt: userMessage.createdAt.toISOString() },
    { role: "assistant", content: advanced.reply, createdAt: assistantMessage.createdAt.toISOString() }
  );

  const completedTasks: DailyEngagementTask[] = [];
  let levelUp = false;
  let heartMoment: HeartMoment | null = null;

  if (advanced.completed) {
    session.status = "completed";
    session.completedAt = nowIso();
    const completedTask = markTaskComplete(state, "play_game");
    if (completedTask) completedTasks.push(completedTask);

    heartMoment = createHeartMoment(cleanAnswer, advanced.reply, assistantMessage.id);
    if (heartMoment) state.moments.unshift(heartMoment);

    levelUp = await applyRewards(
      args.userId,
      args.character.id,
      completedTasks,
      advanced.reward + (heartMoment ? 3 : 0),
      `mini_game:${session.gameType}`
    );
  }

  await saveEngagementState(args.userId, args.character.id, state);

  return {
    session,
    userMessage,
    message: assistantMessage,
    completedTasks,
    heartMoment,
    gameReward: advanced.reward,
    levelUp,
    affinity: advanced.reward > 0 || completedTasks.length > 0 || heartMoment
      ? await getAffinity(args.userId, args.character.id)
      : null,
    overview: await getEngagementOverview(args.userId, args.character.id, args.character.name),
  };
}

export async function abandonMiniGame(args: {
  userId: string;
  characterId: string;
  characterName: string;
  sessionId: string;
}) {
  const state = await loadEngagementState(args.userId, args.characterId, args.characterName);
  const session = state.sessions.find((item) => item.id === args.sessionId);
  if (session && session.status === "active") {
    session.status = "abandoned";
    session.updatedAt = nowIso();
    await saveEngagementState(args.userId, args.characterId, state);
  }
  return getEngagementOverview(args.userId, args.characterId, args.characterName);
}

function getArcadeGame(type: ArcadeGameType) {
  return ARCADE_GAME_CATALOG.find((item) => item.type === type) || ARCADE_GAME_CATALOG[0];
}

function clampArcadeStars(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(3, Math.round(value)));
}

function getArcadeReward(baseReward: number, stars: number, capped: boolean) {
  if (capped) return 0;
  if (stars >= 3) return baseReward + 4;
  if (stars === 2) return baseReward;
  return Math.max(3, Math.round(baseReward * 0.65));
}

function getArcadeCharacterLine(args: {
  characterName: string;
  gameType: ArcadeGameType;
  score: number;
  stars: number;
  capped: boolean;
}) {
  if (args.capped) {
    return `${args.characterName}把这局也记下来了：今天这类奖励已经领满，但我还是陪你再玩。`;
  }
  if (args.gameType === "match_three") {
    if (args.stars >= 3) return `${args.characterName}看着连消的光效笑了：这手感也太顺了吧，我有点服气。`;
    if (args.stars === 2) return `${args.characterName}轻轻点头：不错嘛，刚才那一下连消我看见了。`;
    return `${args.characterName}托着下巴看你：差一点点，不过你认真玩的样子还挺可爱的。`;
  }
  if (args.gameType === "memory_match") {
    if (args.stars >= 3) return `${args.characterName}眨了眨眼：你记得这么快，我是不是该奖励你一句夸奖？`;
    if (args.stars === 2) return `${args.characterName}笑了一下：这些小东西你都能配上，默契还不错。`;
    return `${args.characterName}压低声音说：翻错也没关系，下次我偷偷提醒你。`;
  }
  if (args.stars >= 3) return `${args.characterName}看着拼回来的照片：这样就完整了，像把今天也好好收起来。`;
  if (args.stars === 2) return `${args.characterName}把照片放正：嗯，这样看起来顺眼多了。`;
  return `${args.characterName}笑着替你扶了一下边角：慢慢拼，反正我在这里。`;
}

function createArcadeMoment(args: {
  game: ArcadeGameCatalogItem;
  score: number;
  stars: number;
  characterLine: string;
}) {
  return {
    id: createId("moment"),
    title: `一起玩了${args.game.title}`,
    quote: `分数 ${args.score} · ${args.stars} 星`,
    context: trimText(args.characterLine, 140),
    intensity: args.stars >= 3 ? 3 : 2,
    createdAt: nowIso(),
  } satisfies HeartMoment;
}

export async function completeArcadeGame(args: {
  userId: string;
  characterId: string;
  characterName: string;
  gameType: ArcadeGameType;
  score: number;
  stars: number;
}) {
  const state = await loadEngagementState(args.userId, args.characterId, args.characterName);
  const game = getArcadeGame(args.gameType);
  const stars = clampArcadeStars(args.stars);
  const score = Math.max(0, Math.min(999999, Math.round(args.score)));
  const today = getTodayStr();
  const rewardedToday = state.arcadeRecords.filter(
    (record) => record.gameType === game.type && record.reward > 0 && record.createdAt.startsWith(today)
  ).length;
  const capped = rewardedToday >= 3;
  const reward = getArcadeReward(game.reward, stars, capped);
  const characterLine = getArcadeCharacterLine({
    characterName: args.characterName,
    gameType: game.type,
    score,
    stars,
    capped,
  });

  const completedTasks: DailyEngagementTask[] = [];
  const completedTask = markTaskComplete(state, "play_game");
  if (completedTask) completedTasks.push(completedTask);

  const record: ArcadePlayRecord = {
    id: createId("arcade"),
    gameType: game.type,
    title: game.title,
    score,
    stars,
    reward,
    characterLine,
    createdAt: nowIso(),
  };
  state.arcadeRecords.unshift(record);

  const heartMoment = createArcadeMoment({ game, score, stars, characterLine });
  state.moments.unshift(heartMoment);

  const levelUp = await applyRewards(
    args.userId,
    args.characterId,
    completedTasks,
    reward,
    `arcade_game:${game.type}`
  );

  await saveEngagementState(args.userId, args.characterId, state);

  const message = await prisma.message.create({
    data: {
      role: "assistant",
      content: characterLine,
      userId: args.userId,
      characterId: args.characterId,
    },
  });

  return {
    record,
    message,
    completedTasks,
    heartMoment,
    gameReward: reward,
    rewardCapped: capped,
    levelUp,
    affinity: reward > 0 || completedTasks.length > 0 ? await getAffinity(args.userId, args.characterId) : null,
    overview: await getEngagementOverview(args.userId, args.characterId, args.characterName),
  };
}
