import { chatWithCharacter, generateTTS } from "./minimax";
import { getUserProfileString } from "./memory";
import type { Locale } from "./i18n";

export type GoodnightType = "story" | "whisper" | "lullaby";

const GOODNIGHT_PROMPTS: Record<GoodnightType, Record<Locale, string>> = {
  story: {
    zh: `现在是深夜，用户准备睡觉了。请用温柔的语气给用户讲一个简短的睡前小故事（3-5句话）。
故事要温馨治愈，适合入睡前听。结尾说晚安。不要太长，控制在100字以内。`,
    en: `It is late at night and the user is getting ready to sleep. In your character voice, tell a short bedtime story in English, 3-5 sentences.
The story should feel warm, soothing, and easy to fall asleep to. End by saying good night. Keep it under 100 English words.`,
    ja: `深夜で、ユーザーは眠る準備をしています。キャラクターの口調を保ちながら、日本語で短い寝る前のお話を3〜5文で語ってください。
温かく癒やされる、眠る前に聞きやすい話にしてください。最後におやすみを伝えてください。100字程度以内。`,
  },
  whisper: {
    zh: `现在是深夜，用户准备睡觉了。用最温柔、最亲密的语气跟用户说晚安。
可以说你想他/她，明天想见到他/她，或者分享一个温暖的想法。控制在60字以内。`,
    en: `It is late at night and the user is getting ready to sleep. Say good night in English with your gentlest, most intimate tone.
You may say you miss them, want to see them tomorrow, or share one warm thought. Keep it under 60 English words.`,
    ja: `深夜で、ユーザーは眠る準備をしています。いちばん優しく親密な口調で、日本語でおやすみを伝えてください。
会いたい気持ち、明日また会いたいこと、温かいひとことを入れても構いません。60字程度以内。`,
  },
  lullaby: {
    zh: `现在是深夜，用户准备睡觉了。用诗意的语言描述一个宁静的夜晚场景，帮助用户放松入睡。
比如月光、星空、微风、花香等意象。结尾轻声说晚安。控制在80字以内。`,
    en: `It is late at night and the user is getting ready to sleep. In English, describe a quiet night scene poetically to help them relax.
Use images such as moonlight, stars, a soft breeze, or flowers. End with a gentle good night. Keep it under 80 English words.`,
    ja: `深夜で、ユーザーは眠る準備をしています。日本語で静かな夜の情景を詩的に描き、眠りやすくなるようにしてください。
月明かり、星空、そよ風、花の香りなどを使っても構いません。最後に静かにおやすみを伝えてください。80字程度以内。`,
  },
};

export async function generateGoodnight(
  userId: string,
  characterSystemPrompt: string,
  characterName: string,
  voiceId: string,
  type: GoodnightType = "whisper",
  locale: Locale = "zh"
) {
  const userProfile = await getUserProfileString(userId);

  const systemPrompt = characterSystemPrompt.replace(
    "{user_profile}",
    userProfile
  );

  const prompt = GOODNIGHT_PROMPTS[type][locale] || GOODNIGHT_PROMPTS[type].zh;

  const text = await chatWithCharacter(systemPrompt, [
    { role: "user", content: prompt },
  ]);

  const audioUrl = await generateTTS(text, voiceId);

  return { text, audioUrl, type, characterName };
}
