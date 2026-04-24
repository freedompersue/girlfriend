import OpenAI from "openai";

const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || "";
const MINIMAX_BASE_URL = process.env.MINIMAX_BASE_URL || "https://api.minimaxi.com/v1";

export const minimaxClient = new OpenAI({
  baseURL: MINIMAX_BASE_URL,
  apiKey: MINIMAX_API_KEY,
});

export async function chatWithCharacter(
  systemPrompt: string,
  messages: { role: "user" | "assistant"; content: string }[]
) {
  const response = await minimaxClient.chat.completions.create({
    model: "MiniMax-M2.5",
    messages: [{ role: "system", content: systemPrompt }, ...messages],
    max_tokens: 1024,
    temperature: 0.85,
  });

  const raw = response.choices[0]?.message?.content || "";
  return raw.replace(/<think>[\s\S]*?<\/think>\s*/g, "").trim();
}

export async function generateImage(prompt: string): Promise<string | null> {
  try {
    const response = await fetch(`${MINIMAX_BASE_URL}/image_generation`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MINIMAX_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "image-01",
        prompt,
        aspect_ratio: "3:4",
        response_format: "url",
        n: 1,
        prompt_optimizer: true,
      }),
    });

    const result = await response.json();
    return result?.data?.image_urls?.[0] || null;
  } catch (error) {
    console.error("Image generation failed:", error);
    return null;
  }
}

export async function generateTTS(
  text: string,
  voiceId: string = "female-shaonv"
): Promise<string | null> {
  try {
    const response = await fetch(`${MINIMAX_BASE_URL}/t2a_v2`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MINIMAX_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "speech-2.8-hd",
        text,
        stream: false,
        output_format: "url",
        voice_setting: {
          voice_id: voiceId,
          speed: 1,
          vol: 1,
          pitch: 0,
        },
        audio_setting: {
          sample_rate: 32000,
          bitrate: 128000,
          format: "mp3",
          channel: 1,
        },
      }),
    });

    const result = await response.json();
    return result?.data?.audio || null;
  } catch (error) {
    console.error("TTS generation failed:", error);
    return null;
  }
}
