import { chatWithCharacter, generateTTS } from "./minimax";
import { getUserProfileString } from "./memory";

export type GoodnightType = "story" | "whisper" | "lullaby";

const GOODNIGHT_PROMPTS: Record<GoodnightType, string> = {
  story: `现在是深夜，用户准备睡觉了。请用温柔的语气给用户讲一个简短的睡前小故事（3-5句话）。
故事要温馨治愈，适合入睡前听。结尾说晚安。不要太长，控制在100字以内。`,

  whisper: `现在是深夜，用户准备睡觉了。用最温柔、最亲密的语气跟用户说晚安。
可以说你想他/她，明天想见到他/她，或者分享一个温暖的想法。控制在60字以内。`,

  lullaby: `现在是深夜，用户准备睡觉了。用诗意的语言描述一个宁静的夜晚场景，帮助用户放松入睡。
比如月光、星空、微风、花香等意象。结尾轻声说晚安。控制在80字以内。`,
};

export async function generateGoodnight(
  userId: string,
  characterSystemPrompt: string,
  characterName: string,
  voiceId: string,
  type: GoodnightType = "whisper"
) {
  const userProfile = await getUserProfileString(userId);

  const systemPrompt = characterSystemPrompt.replace(
    "{user_profile}",
    userProfile
  );

  const prompt = GOODNIGHT_PROMPTS[type];

  const text = await chatWithCharacter(systemPrompt, [
    { role: "user", content: prompt },
  ]);

  const audioUrl = await generateTTS(text, voiceId);

  return { text, audioUrl, type, characterName };
}
