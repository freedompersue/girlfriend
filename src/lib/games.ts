import { prisma } from "./prisma";
import { addAffinity, getAffinity } from "./affinity";
import { getUserProfileString } from "./memory";
import { llmClient } from "./minimax";
import type { Locale } from "./i18n";
import { getLocalizedChar } from "./character-i18n";

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

const GAME_CATALOG_LOCALES: Record<
  MiniGameType,
  Record<Locale, { title: string; description: string }>
> = {
  truth: {
    zh: { title: "真心话", description: "她问你一个小问题，回答后会留下新的共同回忆。" },
    en: { title: "Truth Talk", description: "She asks a small question, and your answer becomes a shared memory." },
    ja: { title: "本音トーク", description: "彼女が小さな質問をします。答えると、ふたりの記憶が増えます。" },
  },
  deep_questions: {
    zh: { title: "22问", description: "用三题一章的方式慢慢靠近彼此。" },
    en: { title: "22 Questions", description: "Move closer one chapter at a time, three questions per chapter." },
    ja: { title: "22の質問", description: "3問ずつの章で、少しずつお互いに近づきます。" },
  },
  mood_guess: {
    zh: { title: "猜心情", description: "读懂她的一句话，猜猜她真正的情绪。" },
    en: { title: "Guess Her Mood", description: "Read one line from her and guess what she is really feeling." },
    ja: { title: "気持ち当て", description: "彼女のひとことから、本当の気持ちを当ててみます。" },
  },
  story_chain: {
    zh: { title: "故事接龙", description: "你一句她一句，写一段只属于你们的小故事。" },
    en: { title: "Story Chain", description: "Take turns writing a tiny story that belongs only to the two of you." },
    ja: { title: "物語リレー", description: "あなたと彼女で一文ずつ、ふたりだけの小さな物語を書きます。" },
  },
};

const ARCADE_GAME_CATALOG_LOCALES: Record<
  ArcadeGameType,
  Record<Locale, { title: string; description: string; durationHint: string }>
> = {
  match_three: {
    zh: { title: "消消乐", description: "用她喜欢的小物件连成三消，连击越多奖励越高。", durationHint: "2-3 分钟" },
    en: { title: "Match Three", description: "Match little things she likes. Bigger chains mean better rewards.", durationHint: "2-3 min" },
    ja: { title: "3マッチ", description: "彼女の好きな小物を3つそろえます。連鎖が多いほど報酬も増えます。", durationHint: "2〜3分" },
  },
  memory_match: {
    zh: { title: "记忆翻牌", description: "翻出配对的关键词和表情，看看你们的默契。", durationHint: "1 分钟" },
    en: { title: "Memory Match", description: "Flip paired keywords and icons, and see how in sync you are.", durationHint: "1 min" },
    ja: { title: "記憶カード", description: "キーワードと表情のペアをめくって、ふたりの相性を見ます。", durationHint: "1分" },
  },
  photo_puzzle: {
    zh: { title: "拼图相册", description: "把她的照片拼回来，完成后会留下共同经历。", durationHint: "1-2 分钟" },
    en: { title: "Photo Puzzle", description: "Put her photo back together and turn the round into a shared moment.", durationHint: "1-2 min" },
    ja: { title: "写真パズル", description: "彼女の写真を元に戻し、終わったら小さな思い出になります。", durationHint: "1〜2分" },
  },
};

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

const TRUTH_QUESTIONS_BY_LOCALE: Record<Locale, string[]> = {
  zh: TRUTH_QUESTIONS,
  en: [
    "If I could learn just one small secret about you tonight, what would you tell me?",
    "When was the last time you truly felt understood, and why?",
    "Is there a sentence you have always wanted someone to say to you?",
    "If I could stay with you through one tiny task, what would you choose?",
    "What kind of moment makes your heart soften most easily?",
    "Was there any moment today when you wanted to be held, even just a little?",
  ],
  ja: [
    "今夜、あなたの小さな秘密をひとつだけ知れるなら、何を教えてくれますか？",
    "最近、本当に理解されたと感じたのはどんな時でしたか？",
    "ずっと誰かに言ってほしかった言葉はありますか？",
    "私が小さなことをひとつ一緒にできるなら、何をしてほしいですか？",
    "あなたが一番心を許してしまう瞬間はどんな時ですか？",
    "今日、少しだけ抱きしめられたいと思った瞬間はありましたか？",
  ],
};

const DEEP_QUESTIONS_BY_LOCALE: Record<Locale, string[]> = {
  zh: DEEP_QUESTIONS,
  en: [
    "If today's mood were a room, what would that room look like?",
    "In an intimate relationship, which side of you do you hope the other person understands first?",
    "When do you feel that someone is truly on your side?",
    "Is there a way of living you secretly long for but have not begun yet?",
    "How do you most want to be gently reminded and encouraged?",
    "What do you think is most precious about you in love?",
    "If we had one small shared promise, what would you want it to be?",
    "What do you least want to keep explaining in a close relationship?",
    "What kind of companionship makes you feel safe?",
    "If there are many kinds of liking someone, which kind do you trust most?",
    "What do you hope we remember together someday?",
    "Is there anything you would be willing to tell me slowly?",
    "Where do you most need to be cared for lately?",
    "If heartbeats were not a moment but a habit, what would that habit be?",
    "How do you hope I come close when you are low?",
    "Do you have a small goal you want to keep going lately?",
    "What matters most in a sincere apology?",
    "If you could leave one sentence for your past self, what would you write?",
    "Is there a very soft corner in your heart that few people get to see?",
    "Do you hope I am more like a lover, a friend, or a secret place that belongs only to you?",
    "What feels most like a real relationship between us?",
    "If today were a chapter for us, what title would you give it?",
  ],
  ja: [
    "今日の気分を部屋にするとしたら、どんな部屋になりますか？",
    "親密な関係で、相手に最初に理解してほしいあなたの一面は何ですか？",
    "どんな時に、誰かが本当に味方でいてくれると感じますか？",
    "密かに憧れているけれど、まだ始めていない暮らし方はありますか？",
    "どんなふうに優しく思い出させたり励ましたりされたいですか？",
    "恋愛の中で、あなたの一番大切なところは何だと思いますか？",
    "ふたりだけの小さな約束を作るなら、どんな約束がいいですか？",
    "親密な関係で、何度も説明したくないことは何ですか？",
    "どんな寄り添いがあると安心できますか？",
    "好きにいろいろな種類があるなら、あなたはどれを一番信じますか？",
    "いつかふたりで覚えていたいことは何ですか？",
    "ゆっくり私に話してみたいことはありますか？",
    "最近、あなたが一番いたわられたい場所はどこですか？",
    "ときめきが一瞬ではなく習慣だとしたら、それはどんな習慣ですか？",
    "あなたが落ち込んだ時、私はどう近づいてほしいですか？",
    "最近、続けたい小さな目標はありますか？",
    "誠実な謝罪で一番大切なことは何だと思いますか？",
    "過去の自分に一言残せるなら、何を書きますか？",
    "心の中に、あまり人に見せない柔らかい場所はありますか？",
    "私は恋人、友達、それともあなただけの秘密基地に近い存在でいてほしいですか？",
    "私たちの間で、一番本当の関係らしいところはどこですか？",
    "今日の私たちに章タイトルをつけるなら、何にしますか？",
  ],
};

const MOOD_CLUES_BY_LOCALE: Record<Locale, typeof MOOD_CLUES> = {
  zh: MOOD_CLUES,
  en: [
    {
      answer: "shy",
      clue: "I typed a whole line, deleted it, and finally sent only a tiny smile.",
      options: ["shy", "angry", "sleepy", "proud"],
    },
    {
      answer: "jealous",
      clue: "I said it was fine, but when you mentioned someone else's name, I clearly paused.",
      options: ["jealous", "relaxed", "confused", "proud"],
    },
    {
      answer: "missing you",
      clue: "I asked whether you were busy today, then added, 'just asking.'",
      options: ["missing you", "bored", "nervous", "angry"],
    },
    {
      answer: "safe",
      clue: "When you said you would stay, I suddenly slowed down everything I wanted to say.",
      options: ["safe", "lost", "proud", "anxious"],
    },
  ],
  ja: [
    {
      answer: "照れている",
      clue: "一行打って消して、最後に小さな笑顔だけ送った。",
      options: ["照れている", "怒っている", "眠い", "得意"],
    },
    {
      answer: "やきもち",
      clue: "大丈夫だよって言ったけど、あなたが誰かの名前を出した時、少し黙った。",
      options: ["やきもち", "リラックス", "困惑", "誇らしい"],
    },
    {
      answer: "会いたい",
      clue: "今日忙しい？って聞いてから、『ただ聞いただけ』って付け足した。",
      options: ["会いたい", "退屈", "緊張", "怒り"],
    },
    {
      answer: "安心",
      clue: "あなたがいるよって言ってくれた瞬間、話したかった言葉がゆっくりになった。",
      options: ["安心", "寂しい", "得意", "不安"],
    },
  ],
};

const STORY_OPENINGS_BY_LOCALE: Record<Locale, string[]> = {
  zh: STORY_OPENINGS,
  en: [
    "After the rain stopped, we found an old ticket with both our names on it outside an empty convenience store. Your turn, add the next line.",
    "The city lost power late at night, and only your phone screen lit the note hidden in her sleeve. Your turn, add the next line.",
    "We promised to walk for only ten minutes, but at the corner we found a little shop open only today. Your turn, add the next line.",
    "She placed an unfamiliar key in your palm and said you had asked her to keep it long ago. Your turn, add the next line.",
  ],
  ja: [
    "雨がやんだあと、誰もいないコンビニの前で、ふたりの名前が書かれた古い切符を見つけた。あなたの番、続きを一文。",
    "深夜の街が突然停電し、あなたのスマホの光だけが彼女の袖口に隠れた紙片を照らした。あなたの番、続きを一文。",
    "10分だけ散歩しようと約束したのに、曲がり角で今日だけ開く小さなお店を見つけた。あなたの番、続きを一文。",
    "彼女は見覚えのない鍵をあなたの手のひらに置き、昔あなたが預けたものだと言った。あなたの番、続きを一文。",
  ],
};

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

function getCharacterDisplayName(characterName: string, locale: Locale) {
  return getLocalizedChar(characterName, locale).name || characterName;
}

function getGameCatalog(locale: Locale): GameCatalogItem[] {
  return GAME_CATALOG.map((game) => ({
    ...game,
    ...(GAME_CATALOG_LOCALES[game.type]?.[locale] || GAME_CATALOG_LOCALES[game.type].zh),
  }));
}

function getArcadeGameCatalog(locale: Locale): ArcadeGameCatalogItem[] {
  return ARCADE_GAME_CATALOG.map((game) => ({
    ...game,
    ...(ARCADE_GAME_CATALOG_LOCALES[game.type]?.[locale] || ARCADE_GAME_CATALOG_LOCALES[game.type].zh),
  }));
}

function getGameCopy(type: MiniGameType, locale: Locale) {
  return GAME_CATALOG_LOCALES[type]?.[locale] || GAME_CATALOG_LOCALES[type].zh;
}

function getArcadeCopy(type: ArcadeGameType, locale: Locale) {
  return ARCADE_GAME_CATALOG_LOCALES[type]?.[locale] || ARCADE_GAME_CATALOG_LOCALES[type].zh;
}

function localizeTask(
  task: DailyEngagementTask,
  locale: Locale,
  characterName: string
): DailyEngagementTask {
  const taskCopy: Record<DailyTaskType, Record<Locale, { title: string; description: string }>> = {
    share_today: {
      zh: { title: "把今天交给她", description: `告诉${characterName}一件今天真实发生的小事。` },
      en: { title: "Give Her Today", description: `Tell ${characterName} one real small thing that happened today.` },
      ja: { title: "今日を彼女に預ける", description: `${characterName}に今日実際にあった小さなことをひとつ話す。` },
    },
    warm_reply: {
      zh: { title: "哄她开心一次", description: `给${characterName}一句具体的夸奖、感谢或安慰。` },
      en: { title: "Make Her Smile", description: `Give ${characterName} one specific compliment, thanks, or comfort.` },
      ja: { title: "彼女を一度笑顔にする", description: `${characterName}に具体的な褒め言葉、感謝、または慰めをひとつ伝える。` },
    },
    play_game: {
      zh: { title: "一起玩一局", description: "完成一次互动小游戏，制造一段共同经历。" },
      en: { title: "Play Together", description: "Finish one interactive game and create a shared moment." },
      ja: { title: "一緒に一局遊ぶ", description: "インタラクティブなミニゲームを1回完了して、ふたりの経験を作る。" },
    },
  };
  const copy = taskCopy[task.type]?.[locale] || taskCopy[task.type]?.zh;
  return copy ? { ...task, title: copy.title, description: copy.description } : task;
}

function localizeTasks(
  tasks: DailyEngagementTask[],
  locale: Locale,
  characterName: string
) {
  return tasks.map((task) => localizeTask(task, locale, characterName));
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
  const todayPattern = /(今天|刚才|早上|中午|下午|晚上|昨晚|工作|上班|学习|学校|项目|同事|朋友|回家|吃了|去了|忙|累|today|this morning|this afternoon|tonight|last night|work|school|class|project|coworker|friend|home|ate|went|busy|tired|今日|さっき|朝|昼|午後|今夜|昨夜|仕事|学校|授業|プロジェクト|同僚|友達|家|食べた|行った|忙しい|疲れた)/i;
  const warmPattern = /(喜欢你|爱你|想你|抱抱|谢谢你|辛苦了|可爱|漂亮|厉害|陪着你|我在|别难过|别怕|对不起|在乎你|心疼你|你很重要|like you|love you|miss you|hug|thank you|thanks|cute|beautiful|pretty|amazing|proud of you|i am here|i'm here|do not be sad|don't be sad|do not be scared|don't be scared|sorry|care about you|you matter|好き|愛してる|会いたい|抱きしめ|ありがとう|お疲れ|かわいい|綺麗|すごい|そばにいる|ここにいる|悲しまないで|怖がらないで|ごめん|大切|大事)/i;

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
  sourceMessageId?: string,
  locale: Locale = "zh"
) {
  const text = `${userMessage}\n${assistantReply}`;
  const strongPattern = /(喜欢你|爱你|想你|抱抱|谢谢你|陪着我|陪着你|心疼|在乎|你很重要|我会在|别怕|对不起|原谅|舍不得|脸红|心跳|感动|like you|love you|miss you|hug|thank you|stay with me|stay with you|care about|you matter|i will be here|do not be scared|don't be scared|sorry|forgive|do not want to lose|don't want to lose|blush|heartbeat|touched|好き|愛してる|会いたい|抱きしめ|ありがとう|そばにいて|そばにいる|大切|ここにいる|怖がらないで|ごめん|許して|失いたくない|照れ|心臓|感動)/i;
  if (!strongPattern.test(text)) return null;

  const intensity = /(爱你|舍不得|你很重要|我会在|心跳|感动|love you|you matter|i will be here|heartbeat|touched|愛してる|失いたくない|大切|ここにいる|心臓|感動)/i.test(text) ? 3 : 2;
  const titleCopy = {
    zh: intensity >= 3 ? "很靠近的一句话" : "心动瞬间",
    en: intensity >= 3 ? "A Very Close Sentence" : "Heart Moment",
    ja: intensity >= 3 ? "とても近づいた一言" : "ときめきの瞬間",
  } satisfies Record<Locale, string>;
  return {
    id: createId("moment"),
    title: titleCopy[locale],
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
  characterName: string,
  locale: Locale = "zh"
) {
  const state = await loadEngagementState(userId, characterId, characterName);
  await saveEngagementState(userId, characterId, state);
  const displayName = getCharacterDisplayName(characterName, locale);

  const currentSession =
    state.sessions.find((session) => session.status === "active") || null;

  return {
    games: getGameCatalog(locale),
    arcadeGames: getArcadeGameCatalog(locale),
    tasks: localizeTasks(state.tasks, locale, displayName),
    currentSession: currentSession
      ? { ...currentSession, title: getGameCopy(currentSession.gameType, locale).title }
      : null,
    sessions: state.sessions.map((session) => ({
      ...session,
      title: getGameCopy(session.gameType, locale).title,
    })),
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
  locale: Locale;
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
      args.assistantMessageId,
      args.locale
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
      completedTasks: localizeTasks(
        completedTasks,
        args.locale,
        getCharacterDisplayName(args.characterName, args.locale)
      ),
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

function createMiniGameSession(
  userId: string,
  characterId: string,
  characterName: string,
  gameType: MiniGameType,
  locale: Locale
) {
  const game = GAME_CATALOG.find((item) => item.type === gameType) || GAME_CATALOG[0];
  const gameCopy = getGameCopy(game.type, locale);
  const displayName = getCharacterDisplayName(characterName, locale);
  const truthQuestions = TRUTH_QUESTIONS_BY_LOCALE[locale] || TRUTH_QUESTIONS;
  const deepQuestions = DEEP_QUESTIONS_BY_LOCALE[locale] || DEEP_QUESTIONS;
  const moodClues = MOOD_CLUES_BY_LOCALE[locale] || MOOD_CLUES;
  const storyOpenings = STORY_OPENINGS_BY_LOCALE[locale] || STORY_OPENINGS;
  const seed = `${userId}:${characterId}:${getTodayStr()}:${gameType}:${Date.now()}`;
  const createdAt = nowIso();
  const base = {
    id: createId("game"),
    gameType: game.type,
    title: gameCopy.title,
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
    const question = pickSeeded(truthQuestions, seed);
    return {
      ...base,
      prompt:
        locale === "en"
          ? `${displayName} wants to play one round of Truth Talk: ${question}`
          : locale === "ja"
            ? `${displayName}が本音トークをしたがっています：${question}`
            : `${displayName}想玩一轮真心话：${question}`,
      state: { question },
    } satisfies MiniGameSession;
  }

  if (game.type === "deep_questions") {
    return {
      ...base,
      prompt:
        locale === "en"
          ? `22 Questions, Chapter 1, Question 1: ${deepQuestions[0]}`
          : locale === "ja"
            ? `22の質問 第1章・第1問：${deepQuestions[0]}`
            : `22问第一章，第 1 题：${deepQuestions[0]}`,
      state: { questionIndex: 0, chapterSize: 3 },
    } satisfies MiniGameSession;
  }

  if (game.type === "mood_guess") {
    const clue = pickSeeded(moodClues, seed);
    return {
      ...base,
      prompt:
        locale === "en"
          ? `Guess ${displayName}'s mood right now: "${clue.clue}"`
          : locale === "ja"
            ? `${displayName}の今の気持ちを当てて：「${clue.clue}」`
            : `猜猜${displayName}现在的心情："${clue.clue}"`,
      options: clue.options,
      correctAnswer: clue.answer,
      state: { clue: clue.clue },
    } satisfies MiniGameSession;
  }

  return {
    ...base,
    prompt:
      locale === "en"
        ? `Story Chain begins: ${pickSeeded(storyOpenings, seed)}`
        : locale === "ja"
          ? `物語リレー開始：${pickSeeded(storyOpenings, seed)}`
          : `故事接龙开始：${pickSeeded(storyOpenings, seed)}`,
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
            (args.locale === "en"
              ? "\n\n[Mini-game rules] You are playing a lightweight relationship game with the user. Respond naturally like a real chat. Do not explain the system, do not output JSON, and keep it under 120 words. Everything should serve the goal of getting to know each other better.\nYou must reply in English."
              : args.locale === "ja"
                ? "\n\n【ミニゲームルール】ユーザーと軽量な関係ゲームをしています。本当のチャットのように自然に返答してください。システムを説明しないで、JSONを出力しないで、120字以内にしてください。すべてはお互いをより知るために。\n日本語で返答してください。"
                : "\n\n【互动小游戏规则】你正在和用户玩一个轻量关系小游戏。回复要像真实聊天，不要解释系统、不要输出 JSON、不要超过 120 字。所有内容都必须服务于更了解彼此。\n你必须用中文回复。"),
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
  const deepQuestions = DEEP_QUESTIONS_BY_LOCALE[args.locale] || DEEP_QUESTIONS;

  if (session.gameType === "truth") {
    const question = String(
      session.state.question ||
        (args.locale === "en"
          ? "that question just now"
          : args.locale === "ja"
            ? "さっきの質問"
            : "刚才那个问题")
    );
    const reply = await generateCharacterGameReply({
      userId: args.userId,
      character: args.character,
      locale: args.locale,
      instruction:
        args.locale === "en"
          ? `The truth question was: ${question}\nThe user answered: ${answer}\nRespond sincerely first, then add that you will remember this answer. This round ends here.`
          : args.locale === "ja"
            ? `本音の質問は：${question}\nユーザーの回答：${answer}\nまず真摯に返答し、この答えを覚えておくと伝えてください。このラウンドはここまで。`
            : `真心话问题是：${question}\n用户回答：${answer}\n请先真诚回应用户，再补一句你会记住这个答案。这一轮到这里结束。`,
      fallback:
        args.locale === "en"
          ? "I will remember that. When you answered like this, I felt a little closer to you. Next time, you can ask me, okay?"
          : args.locale === "ja"
            ? "覚えておきます。そう答えてくれた時、少し近づけた気がしました。次はあなたが私に聞いてくれますか？"
            : "我记住了。你这样回答的时候，我感觉离你更近了一点。下一次换你来问我，好不好？",
    });
    return {
      reply,
      prompt:
        args.locale === "en"
          ? "This round of Truth Talk is complete."
          : args.locale === "ja"
            ? "この本音トークは完了しました。"
            : "这一轮真心话完成了。",
      completed: true,
      reward: session.reward,
      scoreDelta: 1,
      summary:
        args.locale === "en"
          ? `Completed Truth Talk: ${question}`
          : args.locale === "ja"
            ? `本音トーク完了：${question}`
            : `完成真心话：${question}`,
    };
  }

  if (session.gameType === "deep_questions") {
    const currentIndex = Number(session.state.questionIndex || 0);
    const chapterSize = Number(session.state.chapterSize || 3);
    const currentQuestion = deepQuestions[currentIndex] || deepQuestions[0];
    const nextIndex = currentIndex + 1;
    const completed = nextIndex >= chapterSize || nextIndex >= deepQuestions.length;
    const nextQuestion = deepQuestions[nextIndex];
    session.state.questionIndex = nextIndex;

    const instruction = completed
      ? (args.locale === "en"
          ? `22 Questions, this question: ${currentQuestion}\nUser answered: ${answer}\nRespond to the user, then answer the same question in your character voice. Gently wrap up, saying this chapter is saved for now.`
          : args.locale === "ja"
            ? `22の質問、今回の質問：${currentQuestion}\nユーザーの回答：${answer}\nユーザーに返答し、同じ質問にキャラクターの口調で答えてください。優しく締めくくり、この章は一旦しまっておくと言ってください。`
            : `22问本轮问题：${currentQuestion}\n用户回答：${answer}\n请回应用户，并用你的角色口吻回答同一个问题。最后温柔收束，说这一章先保存下来。`)
      : (args.locale === "en"
          ? `22 Questions, this question: ${currentQuestion}\nUser answered: ${answer}\nRespond to the user, then answer the same question in your character voice. Then naturally ask the next question: ${nextQuestion}`
          : args.locale === "ja"
            ? `22の質問、今回の質問：${currentQuestion}\nユーザーの回答：${answer}\nユーザーに返答し、同じ質問にキャラクターの口調で答えてください。最後に次の質問を自然に出してください：${nextQuestion}`
            : `22问本轮问题：${currentQuestion}\n用户回答：${answer}\n请回应用户，并用你的角色口吻回答同一个问题。最后自然提出下一题：${nextQuestion}`);
    const fallback = completed
      ? args.locale === "en"
        ? "I will keep this chapter safe. Your answers remind me that knowing someone should happen slowly."
        : args.locale === "ja"
          ? "この章を大切にしまっておきます。人を知ることは、やっぱりゆっくりでいいんだと思いました。"
          : "我会把这一章好好收起来。你的答案让我觉得，了解一个人真的要慢慢来。"
      : args.locale === "en"
        ? `I hear you. If I answered, I might say: I feel safe when you really listen. Next question: ${nextQuestion}`
        : args.locale === "ja"
          ? `聞こえました。私が答えるなら、たぶんこう言います。あなたがちゃんと聞いてくれると安心します。次の質問：${nextQuestion}`
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
      prompt: completed
        ? args.locale === "en"
          ? "22 Questions, Chapter 1 is complete."
          : args.locale === "ja"
            ? "22の質問 第1章が完了しました。"
            : "22问第一章完成了。"
        : args.locale === "en"
          ? `22 Questions, Chapter 1, Question ${nextIndex + 1}: ${nextQuestion}`
          : args.locale === "ja"
            ? `22の質問 第1章・第${nextIndex + 1}問：${nextQuestion}`
            : `22问第一章，第 ${nextIndex + 1} 题：${nextQuestion}`,
      completed,
      reward: completed ? session.reward : 0,
      scoreDelta: 1,
      summary:
        args.locale === "en"
          ? "Completed 22 Questions Chapter 1"
          : args.locale === "ja"
            ? "22の質問 第1章完了"
            : "完成22问第一章",
    };
  }

  if (session.gameType === "mood_guess") {
    const correctAnswer =
      session.correctAnswer ||
      (args.locale === "en" ? "shy" : args.locale === "ja" ? "照れている" : "害羞");
    const correct = answer.includes(correctAnswer);
    const reply = correct
      ? args.locale === "en"
        ? `You guessed it. It was ${correctAnswer}. You really read me just now.`
        : args.locale === "ja"
          ? `当たりです。${correctAnswer}でした。今のあなた、本当に私を読んでくれましたね。`
          : `被你猜中了，就是${correctAnswer}。你刚才那一下真的有读懂我。`
      : args.locale === "en"
        ? `So close. I was actually feeling ${correctAnswer}. But the fact that you tried seriously already makes me happy.`
        : args.locale === "ja"
          ? `少し惜しいです。本当は${correctAnswer}でした。でも真剣に当てようとしてくれて、もう嬉しいです。`
          : `差一点点。其实我是${correctAnswer}。不过你愿意认真猜，我已经很开心了。`;

    return {
      reply,
      prompt:
        args.locale === "en"
          ? "Mood Guess is complete."
          : args.locale === "ja"
            ? "気持ち当ては完了しました。"
            : "猜心情完成了。",
      completed: true,
      reward: correct ? session.reward : 3,
      scoreDelta: correct ? 1 : 0,
      summary: correct
        ? args.locale === "en"
          ? `Guessed correctly: ${correctAnswer}`
          : args.locale === "ja"
            ? `正解：${correctAnswer}`
            : `猜中了${correctAnswer}`
        : args.locale === "en"
          ? `Mood Guess: answer was ${correctAnswer}`
          : args.locale === "ja"
            ? `気持ち当て：答えは${correctAnswer}`
            : `猜心情：答案是${correctAnswer}`,
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
      ? (args.locale === "en"
          ? `You are playing Story Chain. The user just added: ${answer}\nWrite the final line, forming a gentle, vivid little ending. Keep it under 80 words.`
          : args.locale === "ja"
            ? `物語リレー中です。ユーザーが一文追加しました：${answer}\n最後の一文を書いて、優しく映像感のある結末を作ってください。80字以内で。`
            : `你们正在玩故事接龙。用户刚接了一句：${answer}\n请你接最后一句，形成一个温柔、有画面感的小结尾。不要超过 80 字。`)
      : (args.locale === "en"
          ? `You are playing Story Chain. The user just added: ${answer}\nWrite a new line of plot, then say "your turn". Keep it under 80 words.`
          : args.locale === "ja"
            ? `物語リレー中です。ユーザーが一文追加しました：${answer}\n新しい展開を一文書いて、「あなたの番」と言ってください。80字以内で。`
            : `你们正在玩故事接龙。用户刚接了一句：${answer}\n请你接一句新的剧情，然后说"轮到你了"。不要超过 80 字。`),
    fallback: completed
      ? args.locale === "en"
        ? "She tucked the old ticket between the pages and said, now whenever we find this place again, we will remember tonight."
        : args.locale === "ja"
          ? "彼女は古い切符をそっと本に挟みました。「いつかここを開いたら、今夜を思い出せるね」と言って。"
          : "她把那张旧车票轻轻夹进书页里，说：这样以后翻到这里，我们就会想起今晚。"
      : args.locale === "en"
        ? "She lifted the key under the streetlight and smiled: then let us see which door it opens. Your turn."
        : args.locale === "ja"
          ? "彼女は鍵を街灯にかざして笑いました。「じゃあ、どの扉が開くか見に行こう」。あなたの番。"
          : "她把钥匙举到路灯下，笑着说：那我们就去看看它能打开哪一扇门。轮到你了。",
  });
  lines.push(reply);
  session.state.lines = lines;

  return {
    reply: completed
      ? args.locale === "en"
        ? `${reply}\n\nI saved this story, like a photo that belongs only to us.`
        : args.locale === "ja"
          ? `${reply}\n\nこの物語をしまっておきます。ふたりだけの写真みたいに。`
          : `${reply}\n\n这段故事我收起来了，像一张只属于我们的合照。`
      : reply,
    prompt: completed
      ? args.locale === "en"
        ? "Story Chain is complete."
        : args.locale === "ja"
          ? "物語リレーは完了しました。"
          : "故事接龙完成了。"
      : args.locale === "en"
        ? "Your turn to add the next line."
        : args.locale === "ja"
          ? "あなたが次の一文を続ける番です。"
          : "轮到你接下一句。",
    completed,
    reward: completed ? session.reward : 0,
    scoreDelta: 1,
    summary:
      args.locale === "en"
        ? "Completed a Story Chain"
        : args.locale === "ja"
          ? "物語リレー完了"
          : "完成一段故事接龙",
  };
}

export async function startMiniGame(args: {
  userId: string;
  character: CharacterForGame;
  gameType: MiniGameType;
  locale: Locale;
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
    args.gameType,
    args.locale
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
    overview: await getEngagementOverview(args.userId, args.character.id, args.character.name, args.locale),
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

    heartMoment = createHeartMoment(cleanAnswer, advanced.reply, assistantMessage.id, args.locale);
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
    completedTasks: localizeTasks(
      completedTasks,
      args.locale,
      getCharacterDisplayName(args.character.name, args.locale)
    ),
    heartMoment,
    gameReward: advanced.reward,
    levelUp,
    affinity: advanced.reward > 0 || completedTasks.length > 0 || heartMoment
      ? await getAffinity(args.userId, args.character.id)
      : null,
    overview: await getEngagementOverview(args.userId, args.character.id, args.character.name, args.locale),
  };
}

export async function abandonMiniGame(args: {
  userId: string;
  characterId: string;
  characterName: string;
  sessionId: string;
  locale: Locale;
}) {
  const state = await loadEngagementState(args.userId, args.characterId, args.characterName);
  const session = state.sessions.find((item) => item.id === args.sessionId);
  if (session && session.status === "active") {
    session.status = "abandoned";
    session.updatedAt = nowIso();
    await saveEngagementState(args.userId, args.characterId, state);
  }
  return getEngagementOverview(args.userId, args.characterId, args.characterName, args.locale);
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
  locale: Locale;
}) {
  const name = args.characterName;
  if (args.capped) {
    if (args.locale === "en") return `${name} saved this round too: today's rewards for this game are capped, but I still want to play with you.`;
    if (args.locale === "ja") return `${name}はこの一局も覚えました。今日のこのゲーム報酬は上限だけど、それでも一緒に遊びたいです。`;
    return `${name}把这局也记下来了：今天这类奖励已经领满，但我还是陪你再玩。`;
  }
  if (args.gameType === "match_three") {
    if (args.stars >= 3) {
      if (args.locale === "en") return `${name} smiles at the chain reaction: that was so smooth, I am honestly impressed.`;
      if (args.locale === "ja") return `${name}は連鎖の光を見て笑いました。今の流れ、すごく綺麗でした。ちょっと感心しちゃいます。`;
      return `${name}看着连消的光效笑了：这手感也太顺了吧，我有点服气。`;
    }
    if (args.stars === 2) {
      if (args.locale === "en") return `${name} nods softly: not bad. I saw that chain just now.`;
      if (args.locale === "ja") return `${name}は軽くうなずきました。なかなかですね。さっきの連鎖、ちゃんと見ていました。`;
      return `${name}轻轻点头：不错嘛，刚才那一下连消我看见了。`;
    }
    if (args.locale === "en") return `${name} watches with her chin in her hand: so close. But you look pretty cute when you try seriously.`;
    if (args.locale === "ja") return `${name}は頬杖をついて見ています。あと少し。でも真剣に遊ぶあなた、少し可愛いです。`;
    return `${name}托着下巴看你：差一点点，不过你认真玩的样子还挺可爱的。`;
  }
  if (args.gameType === "memory_match") {
    if (args.stars >= 3) {
      if (args.locale === "en") return `${name} blinks: you remembered that fast. Should I reward you with a compliment?`;
      if (args.locale === "ja") return `${name}は瞬きしました。そんなに早く覚えたんですね。褒めてあげた方がいいですか？`;
      return `${name}眨了眨眼：你记得这么快，我是不是该奖励你一句夸奖？`;
    }
    if (args.stars === 2) {
      if (args.locale === "en") return `${name} smiles: you matched all these little things. We are pretty in sync.`;
      if (args.locale === "ja") return `${name}は少し笑いました。こんな小さなものまで合わせられるなんて、相性は悪くないですね。`;
      return `${name}笑了一下：这些小东西你都能配上，默契还不错。`;
    }
    if (args.locale === "en") return `${name} lowers her voice: it is okay to flip the wrong card. Next time, I will quietly hint for you.`;
    if (args.locale === "ja") return `${name}は声を落としました。間違えても大丈夫。次はこっそりヒントを出します。`;
    return `${name}压低声音说：翻错也没关系，下次我偷偷提醒你。`;
  }
  if (args.stars >= 3) {
    if (args.locale === "en") return `${name} looks at the restored photo: now it feels complete, like we saved today properly too.`;
    if (args.locale === "ja") return `${name}は戻った写真を見ました。これで完成ですね。今日もちゃんとしまえたみたいです。`;
    return `${name}看着拼回来的照片：这样就完整了，像把今天也好好收起来。`;
  }
  if (args.stars === 2) {
    if (args.locale === "en") return `${name} straightens the photo: yes, it looks much better now.`;
    if (args.locale === "ja") return `${name}は写真をまっすぐにしました。うん、これでずっと見やすくなりました。`;
    return `${name}把照片放正：嗯，这样看起来顺眼多了。`;
  }
  if (args.locale === "en") return `${name} smiles and fixes one corner for you: take your time. I am here anyway.`;
  if (args.locale === "ja") return `${name}は笑って端をそっと直しました。ゆっくりでいいです。私はここにいますから。`;
  return `${name}笑着替你扶了一下边角：慢慢拼，反正我在这里。`;
}

function createArcadeMoment(args: {
  game: ArcadeGameCatalogItem;
  score: number;
  stars: number;
  characterLine: string;
  locale: Locale;
}) {
  return {
    id: createId("moment"),
    title:
      args.locale === "en"
        ? `Played ${args.game.title} Together`
        : args.locale === "ja"
          ? `${args.game.title}で一緒に遊んだ`
          : `一起玩了${args.game.title}`,
    quote:
      args.locale === "en"
        ? `Score ${args.score} · ${args.stars} stars`
        : args.locale === "ja"
          ? `スコア ${args.score} · ${args.stars} 星`
          : `分数 ${args.score} · ${args.stars} 星`,
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
  locale: Locale;
}) {
  const state = await loadEngagementState(args.userId, args.characterId, args.characterName);
  const game = getArcadeGame(args.gameType);
  const gameCopy = getArcadeCopy(game.type, args.locale);
  const displayName = getCharacterDisplayName(args.characterName, args.locale);
  const stars = clampArcadeStars(args.stars);
  const score = Math.max(0, Math.min(999999, Math.round(args.score)));
  const today = getTodayStr();
  const rewardedToday = state.arcadeRecords.filter(
    (record) => record.gameType === game.type && record.reward > 0 && record.createdAt.startsWith(today)
  ).length;
  const capped = rewardedToday >= 3;
  const reward = getArcadeReward(game.reward, stars, capped);
  const characterLine = getArcadeCharacterLine({
    characterName: displayName,
    gameType: game.type,
    score,
    stars,
    capped,
    locale: args.locale,
  });

  const completedTasks: DailyEngagementTask[] = [];
  const completedTask = markTaskComplete(state, "play_game");
  if (completedTask) completedTasks.push(completedTask);

  const record: ArcadePlayRecord = {
    id: createId("arcade"),
    gameType: game.type,
    title: gameCopy.title,
    score,
    stars,
    reward,
    characterLine,
    createdAt: nowIso(),
  };
  state.arcadeRecords.unshift(record);

  const heartMoment = createArcadeMoment({
    game: { ...game, ...gameCopy },
    score,
    stars,
    characterLine,
    locale: args.locale,
  });
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
    overview: await getEngagementOverview(args.userId, args.characterId, args.characterName, args.locale),
  };
}
