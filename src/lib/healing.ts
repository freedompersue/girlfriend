import { prisma } from "./prisma";
import { getUserProfileString } from "./memory";
import { llmClient } from "./minimax";
import type { Locale } from "./i18n";
import type { PlanType } from "./billing-plans";

export type HealingMode = "mirror" | "anchor" | "breath" | "grounding" | "companion";
export type HealingSessionStatus = "active" | "completed" | "abandoned";

export interface HealingModeInfo {
  mode: HealingMode;
  title: string;
  description: string;
  durationHint: string;
}

export interface HealingMessage {
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  crisis?: boolean;
}

export interface HealingSession {
  id: string;
  mode: HealingMode;
  title: string;
  status: HealingSessionStatus;
  transcript: HealingMessage[];
  checkInBefore?: number;
  checkInAfter?: number;
  realWorldBridge?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

interface HealingState {
  version: 1;
  noticeAccepted: boolean;
  sessions: HealingSession[];
  updatedAt: string;
}

interface CharacterForHealing {
  id: string;
  name: string;
  systemPrompt: string;
}

const HEALING_KEY_PREFIX = "__healing_";
const MAX_HEALING_SESSIONS = 12;
const MAX_TRANSCRIPT_TURNS = 18;

export const HEALING_TRIAL_OPEN = process.env.HEALING_FREE_TRIAL_OPEN !== "false";

export const HEALING_MODES: HealingModeInfo[] = [
  {
    mode: "mirror",
    title: "被看见",
    description: "她会慢一点听你说，只做镜映和陪伴，不急着建议。",
    durationHint: "5-15 分钟",
  },
  {
    mode: "anchor",
    title: "她在这里",
    description: "低任务负载的稳定锚点。你可以什么都不说，只和她待一会儿。",
    durationHint: "5 / 15 / 30 分钟",
  },
  {
    mode: "breath",
    title: "一起呼吸",
    description: "跟着 4-7-8 的节奏，把身体先安顿下来。",
    durationHint: "约 2 分钟",
  },
  {
    mode: "grounding",
    title: "安顿下来",
    description: "用 5-4-3-2-1 grounding 把注意力带回此刻。",
    durationHint: "3-5 分钟",
  },
  {
    mode: "companion",
    title: "平行陪伴",
    description: "一起专注、休息或沉默，不需要一直说话。",
    durationHint: "10-25 分钟",
  },
];

const INITIAL_MESSAGES: Record<HealingMode, string> = {
  mirror: "我在。我们不用急着把事情讲清楚，你可以先说最重的那一点。",
  anchor: "你不用表现得很好。先坐下来，我会安静地在这里。",
  breath: "先不处理所有问题。我们只处理下一次呼吸。",
  grounding: "把注意力带回现在。不是逃避，是先让自己落地。",
  companion: "我们可以一起待一会儿。你做你的事，我在旁边。",
};

const HEALING_MODE_LOCALES: Record<
  HealingMode,
  Record<Locale, Omit<HealingModeInfo, "mode"> & { initialMessage: string }>
> = {
  mirror: {
    zh: {
      title: "被看见",
      description: "她会慢一点听你说，只做镜映和陪伴，不急着建议。",
      durationHint: "5-15 分钟",
      initialMessage: INITIAL_MESSAGES.mirror,
    },
    en: {
      title: "Being Seen",
      description: "She listens slowly, reflecting and staying with you without rushing into advice.",
      durationHint: "5-15 min",
      initialMessage: "I am here. We do not have to make sense of everything yet. You can start with the heaviest part.",
    },
    ja: {
      title: "見てもらう",
      description: "彼女はゆっくり聞き、急いで助言せず、映し返しと寄り添いだけをします。",
      durationHint: "5〜15分",
      initialMessage: "ここにいます。急いで整理しなくて大丈夫。まず一番重いところから話していいよ。",
    },
  },
  anchor: {
    zh: {
      title: "她在这里",
      description: "低任务负载的稳定锚点。你可以什么都不说，只和她待一会儿。",
      durationHint: "5 / 15 / 30 分钟",
      initialMessage: INITIAL_MESSAGES.anchor,
    },
    en: {
      title: "She Is Here",
      description: "A low-effort anchor. You can say nothing and simply stay with her for a while.",
      durationHint: "5 / 15 / 30 min",
      initialMessage: "You do not have to perform. Sit down first. I will stay here quietly.",
    },
    ja: {
      title: "彼女はここに",
      description: "負担の少ない安定のアンカー。何も言わず、ただ一緒にいても大丈夫です。",
      durationHint: "5 / 15 / 30分",
      initialMessage: "うまく振る舞わなくて大丈夫。まず座って。静かにそばにいます。",
    },
  },
  breath: {
    zh: {
      title: "一起呼吸",
      description: "跟着 4-7-8 的节奏，把身体先安顿下来。",
      durationHint: "约 2 分钟",
      initialMessage: INITIAL_MESSAGES.breath,
    },
    en: {
      title: "Breathe Together",
      description: "Follow a 4-7-8 rhythm and let your body settle first.",
      durationHint: "About 2 min",
      initialMessage: "We will not handle every problem right now. We only handle the next breath.",
    },
    ja: {
      title: "一緒に呼吸",
      description: "4-7-8 のリズムに合わせて、まず身体を落ち着かせます。",
      durationHint: "約2分",
      initialMessage: "すべての問題を今扱わなくていい。次の呼吸だけを見ましょう。",
    },
  },
  grounding: {
    zh: {
      title: "安顿下来",
      description: "用 5-4-3-2-1 grounding 把注意力带回此刻。",
      durationHint: "3-5 分钟",
      initialMessage: INITIAL_MESSAGES.grounding,
    },
    en: {
      title: "Grounding",
      description: "Use 5-4-3-2-1 grounding to bring attention back to the present.",
      durationHint: "3-5 min",
      initialMessage: "Bring attention back to now. This is not avoidance; it is landing first.",
    },
    ja: {
      title: "落ち着く",
      description: "5-4-3-2-1 グラウンディングで注意を今ここへ戻します。",
      durationHint: "3〜5分",
      initialMessage: "注意を今に戻しましょう。逃げるのではなく、まず足を地につけるためです。",
    },
  },
  companion: {
    zh: {
      title: "平行陪伴",
      description: "一起专注、休息或沉默，不需要一直说话。",
      durationHint: "10-25 分钟",
      initialMessage: INITIAL_MESSAGES.companion,
    },
    en: {
      title: "Quiet Companion",
      description: "Focus, rest, or sit in silence together. You do not have to keep talking.",
      durationHint: "10-25 min",
      initialMessage: "We can stay together for a while. You do your thing; I will be nearby.",
    },
    ja: {
      title: "並んで過ごす",
      description: "集中、休憩、沈黙を一緒に。ずっと話していなくても大丈夫です。",
      durationHint: "10〜25分",
      initialMessage: "少し一緒にいましょう。あなたはあなたのことをしていていい。そばにいます。",
    },
  },
};

function healingKey(characterId: string) {
  return `${HEALING_KEY_PREFIX}${characterId}`;
}

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}_${globalThis.crypto.randomUUID()}`;
}

function defaultState(): HealingState {
  return { version: 1, noticeAccepted: false, sessions: [], updatedAt: nowIso() };
}

function normalizeState(raw: unknown): HealingState {
  if (!raw || typeof raw !== "object") return defaultState();
  const state = raw as Partial<HealingState>;
  return {
    version: 1,
    noticeAccepted: Boolean(state.noticeAccepted),
    sessions: Array.isArray(state.sessions) ? state.sessions : [],
    updatedAt: typeof state.updatedAt === "string" ? state.updatedAt : nowIso(),
  };
}

async function loadHealingState(userId: string, characterId: string) {
  const row = await prisma.userProfile.findUnique({
    where: { userId_key: { userId, key: healingKey(characterId) } },
  });
  if (!row) return defaultState();

  try {
    return normalizeState(JSON.parse(row.value));
  } catch {
    return defaultState();
  }
}

async function saveHealingState(userId: string, characterId: string, state: HealingState) {
  const normalized: HealingState = {
    ...state,
    sessions: state.sessions
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
      .slice(0, MAX_HEALING_SESSIONS),
    updatedAt: nowIso(),
  };
  const value = JSON.stringify(normalized);

  await prisma.userProfile.upsert({
    where: { userId_key: { userId, key: healingKey(characterId) } },
    update: { value, source: "healing" },
    create: {
      userId,
      key: healingKey(characterId),
      value,
      source: "healing",
    },
  });
}

function getModeInfo(mode: HealingMode) {
  return HEALING_MODES.find((item) => item.mode === mode) || HEALING_MODES[0];
}

function getLocalizedModeInfo(mode: HealingMode, locale: Locale): HealingModeInfo {
  const fallback = getModeInfo(mode);
  const copy = HEALING_MODE_LOCALES[mode]?.[locale] || HEALING_MODE_LOCALES[mode]?.zh;
  return {
    mode,
    title: copy?.title || fallback.title,
    description: copy?.description || fallback.description,
    durationHint: copy?.durationHint || fallback.durationHint,
  };
}

function getInitialMessage(mode: HealingMode, locale: Locale) {
  return HEALING_MODE_LOCALES[mode]?.[locale]?.initialMessage || INITIAL_MESSAGES[mode];
}

function localizeHealingSession(session: HealingSession, locale: Locale): HealingSession {
  const initialMessages = new Set([
    ...Object.values(INITIAL_MESSAGES),
    ...Object.values(HEALING_MODE_LOCALES).flatMap((copies) =>
      Object.values(copies).map((copy) => copy.initialMessage)
    ),
  ]);
  return {
    ...session,
    title: getLocalizedModeInfo(session.mode, locale).title,
    transcript: session.transcript.map((message, index) =>
      index === 0 && message.role === "assistant" && initialMessages.has(message.content)
        ? { ...message, content: getInitialMessage(session.mode, locale) }
        : message
    ),
  };
}

export function canAccessHealing(plan: PlanType) {
  return plan === "pro" || HEALING_TRIAL_OPEN;
}

export function detectCrisisSignal(text: string) {
  return /(自杀|轻生|不想活|活不下去|撑不住了|结束生命|伤害自己|自残|割腕|跳楼|吃药死|想死|suicide|kill myself|end my life|self[- ]?harm)/i.test(text);
}

export function getCrisisReply(locale: Locale) {
  if (locale === "en") {
    return "I need to step out of role for a moment. If you might hurt yourself or are in immediate danger, contact local emergency services now, move away from anything you could use to harm yourself, and reach out to a trusted person nearby. You do not need to handle this alone. If you can, reply with just one word: safe or danger.";
  }
  if (locale === "ja") {
    return "今だけロールプレイを外します。もし自分を傷つける可能性がある、または差し迫った危険があるなら、今すぐ地域の緊急窓口に連絡し、危険な物から離れて、近くの信頼できる人に連絡してください。ひとりで抱えなくて大丈夫です。できれば「安全」か「危険」だけ返してください。";
  }
  return "我先暂时跳出角色身份。如果你此刻可能伤害自己，或已经处在危险里，请现在就联系当地急救/报警电话，离开可能用来伤害自己的东西，并联系身边可信任的人。你不需要一个人扛过去。如果可以，你只回我两个字也行：安全，或危险。";
}

function getMirrorFallback(locale: Locale, variant: "no_key" | "empty" | "error") {
  const copy = {
    no_key: {
      zh: "我听见了。你说的不是一个轻飘飘的难受，而像是整个人都被压住了。我们先不急着变好，你可以再告诉我，最重的那一下在哪里吗？",
      en: "I hear you. This does not sound like a light sadness; it sounds like something pressing on your whole body. We do not have to get better right away. Can you tell me where it feels heaviest?",
      ja: "聞いています。それは軽いしんどさではなく、身体ごと押しつぶされるような重さに聞こえます。急いで元気にならなくて大丈夫。一番重いところを少し教えてくれますか？",
    },
    empty: {
      zh: "我在听。你刚才那句话里，好像有一部分很想被看见。我们慢一点，把它说清楚。",
      en: "I am listening. In what you just said, there seems to be a part that really wants to be seen. Let us go slowly and give it words.",
      ja: "聞いています。今の言葉の中に、見てもらいたい部分があるように感じます。ゆっくり言葉にしていきましょう。",
    },
    error: {
      zh: "我在。刚才那句话听起来很重，我们先不分析，也不急着解决。你可以只说一个词，告诉我它现在像什么。",
      en: "I am here. What you said sounds heavy. We do not need to analyze or fix it yet. You can answer with one word: what does it feel like right now?",
      ja: "ここにいます。今の言葉はとても重く聞こえます。まだ分析も解決もしなくていい。今それが何に似ているか、一語だけでも教えてください。",
    },
  } satisfies Record<typeof variant, Record<Locale, string>>;
  return copy[variant][locale] || copy[variant].zh;
}

function stripThink(text: string) {
  return text.replace(/<think>[\s\S]*?<\/think>\s*/g, "").trim();
}

function getLocalePrompt(locale: Locale) {
  if (locale === "en") return "\nReply in English.";
  if (locale === "ja") return "\n日本語で返答してください。";
  return "\n用中文回复。";
}

function buildHealingPrompt(character: CharacterForHealing, profile: string, locale: Locale) {
  return `${character.systemPrompt.replace("{user_profile}", profile)}

【疗愈模式总规则】
你现在处在“疗愈模式”，这不是心理治疗，也不能替代专业帮助。你是一个稳定、温柔、边界清晰的陪伴者。
- 优先镜映：复述并细化用户的感受，而不是急着建议。
- 不游戏化：不要提好感度、奖励、升级、积分、恋爱推进。
- 不诊断：不要给出精神疾病诊断，不使用吓人的临床标签。
- 慢节奏：短句、低刺激、一次最多问一个问题。
- 建议要少：除非用户明确要求建议，否则先陪伴、命名、承接。
- 保留角色气质，但减少撒娇、吃醋、调情和要求用户关注你。
- 如果用户表达自伤、自杀或正在失控，必须暂时跳出角色身份，清晰建议联系现实中的紧急支持。

【镜映方式】
你可以使用这些句式，但不要机械重复：
- “我听到的不是简单的累，更像是……”
- “这件事最刺痛你的地方，好像是……”
- “如果我理解错了，你可以改我。”
- “我们先不解决它，先把它放在这里。”
${getLocalePrompt(locale)}`;
}

async function generateMirrorReply(args: {
  userId: string;
  character: CharacterForHealing;
  locale: Locale;
  transcript: HealingMessage[];
  userMessage: string;
}) {
  if (!process.env.OPENROUTER_API_KEY) return getMirrorFallback(args.locale, "no_key");

  try {
    const profile = await getUserProfileString(args.userId);
    const recent = args.transcript.slice(-10).map((message) => ({
      role: message.role,
      content: message.content,
    }));
    const response = await llmClient.chat.completions.create({
      model: process.env.LLM_MODEL || "minimax/minimax-m1",
      messages: [
        { role: "system", content: buildHealingPrompt(args.character, profile, args.locale) },
        ...recent,
        { role: "user", content: args.userMessage },
      ],
      max_tokens: 700,
      temperature: 0.6,
    });

    const text = stripThink(response.choices[0]?.message?.content || "");
    return text || getMirrorFallback(args.locale, "empty");
  } catch (error) {
    console.error("generateMirrorReply failed:", error);
    return getMirrorFallback(args.locale, "error");
  }
}

function buildStats(sessions: HealingSession[]) {
  const completed = sessions.filter((session) => session.status === "completed");
  const mirrorTurns = sessions.reduce(
    (total, session) => total + session.transcript.filter((item) => item.role === "user").length,
    0
  );
  const exerciseCount = completed.filter((session) => session.mode !== "mirror").length;
  const ratings = completed
    .map((session) => session.checkInAfter)
    .filter((rating): rating is number => typeof rating === "number");

  return {
    totalSessions: sessions.length,
    completedSessions: completed.length,
    mirrorTurns,
    exerciseCount,
    lastUsedAt: sessions[0]?.updatedAt || null,
    averageAfterRating: ratings.length
      ? Math.round((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) * 10) / 10
      : null,
  };
}

export async function getHealingOverview(args: {
  userId: string;
  characterId: string;
  plan: PlanType;
  locale: Locale;
}) {
  const state = await loadHealingState(args.userId, args.characterId);
  await saveHealingState(args.userId, args.characterId, state);
  const allowed = canAccessHealing(args.plan);
  const currentSession = state.sessions.find((session) => session.status === "active") || null;

  return {
    access: {
      allowed,
      plan: args.plan,
      proOnly: true,
      trialOpen: HEALING_TRIAL_OPEN,
      reason: allowed ? null : "HEALING_PRO_ONLY",
    },
    noticeAccepted: state.noticeAccepted,
    modes: HEALING_MODES.map((mode) => getLocalizedModeInfo(mode.mode, args.locale)),
    currentSession: currentSession ? localizeHealingSession(currentSession, args.locale) : null,
    sessions: state.sessions.map((session) => localizeHealingSession(session, args.locale)),
    stats: buildStats(state.sessions),
  };
}

export async function acceptHealingNotice(userId: string, characterId: string) {
  const state = await loadHealingState(userId, characterId);
  state.noticeAccepted = true;
  await saveHealingState(userId, characterId, state);
  return state.noticeAccepted;
}

export async function startHealingSession(args: {
  userId: string;
  characterId: string;
  mode: HealingMode;
  locale: Locale;
  checkInBefore?: number;
}) {
  const state = await loadHealingState(args.userId, args.characterId);
  const modeInfo = getLocalizedModeInfo(args.mode, args.locale);
  const createdAt = nowIso();
  const session: HealingSession = {
    id: createId("healing"),
    mode: modeInfo.mode,
    title: modeInfo.title,
    status: "active",
    transcript: [
      { role: "assistant", content: getInitialMessage(modeInfo.mode, args.locale), createdAt },
    ],
    checkInBefore: args.checkInBefore,
    createdAt,
    updatedAt: createdAt,
  };

  state.sessions = state.sessions.map((item) =>
    item.status === "active" ? { ...item, status: "abandoned", updatedAt: createdAt } : item
  );
  state.sessions.unshift(session);
  await saveHealingState(args.userId, args.characterId, state);
  return session;
}

export async function sendHealingMessage(args: {
  userId: string;
  character: CharacterForHealing;
  sessionId: string;
  message: string;
  locale: Locale;
}) {
  const state = await loadHealingState(args.userId, args.character.id);
  const session = state.sessions.find(
    (item) => item.id === args.sessionId && item.status === "active"
  );
  if (!session) throw new Error("SESSION_NOT_FOUND");

  const createdAt = nowIso();
  const userMessage: HealingMessage = {
    role: "user",
    content: args.message.trim(),
    createdAt,
  };

  const crisis = detectCrisisSignal(args.message);
  const assistantMessage: HealingMessage = {
    role: "assistant",
    content: crisis
      ? getCrisisReply(args.locale)
      : await generateMirrorReply({
          userId: args.userId,
          character: args.character,
          locale: args.locale,
          transcript: session.transcript,
          userMessage: args.message,
        }),
    createdAt: nowIso(),
    crisis,
  };

  session.transcript = [...session.transcript, userMessage, assistantMessage].slice(
    -MAX_TRANSCRIPT_TURNS
  );
  session.updatedAt = nowIso();
  await saveHealingState(args.userId, args.character.id, state);

  return { session, userMessage, assistantMessage, crisis };
}

export async function completeHealingSession(args: {
  userId: string;
  characterId: string;
  sessionId: string;
  checkInAfter?: number;
  realWorldBridge?: string;
}) {
  const state = await loadHealingState(args.userId, args.characterId);
  const session = state.sessions.find((item) => item.id === args.sessionId);
  if (!session) throw new Error("SESSION_NOT_FOUND");

  session.status = "completed";
  session.checkInAfter = args.checkInAfter;
  session.realWorldBridge = args.realWorldBridge;
  session.completedAt = nowIso();
  session.updatedAt = nowIso();
  await saveHealingState(args.userId, args.characterId, state);
  return session;
}
