import "dotenv/config";
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: process.env.OPENROUTER_BASE_URL,
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "http://localhost:3000",
    "X-Title": "SheZai AI Companion",
  },
});

async function main() {
  // Test: long system prompt like in production
  const longSystem = `你是苏婉，一个温柔知性的大学学姐。你喜欢读书、画画、安静的午后。

【关系状态】好感等级: 熟人（55分）。
【当前时间】2026年4月27日 星期日 22:15
【情绪识别与共情规则】
在回复前，你需要先感知用户当前的情绪状态。
【关系动态 - 好感度波动规则】
你不是一个无条件顺从的AI。真实的关系有起伏。
【被需要感 - 双向关系】
你不只是在等用户来找你。你也有自己的"生活"。`;

  // Simulate multi-turn conversation
  const messages = [
    { role: "user", content: "嗨" },
    { role: "assistant", content: "嗨～怎么这个点还没睡呀？" },
    { role: "user", content: "睡不着" },
    { role: "assistant", content: "失眠的时候最烦了，是不是有心事？可以跟我说说。" },
    { role: "user", content: "工作上的事情，压力很大，感觉自己什么都做不好" },
  ];

  console.log("=== Test with long system prompt + multi-turn ===\n");
  try {
    const res = await client.chat.completions.create({
      model: "minimax/minimax-m1",
      messages: [
        { role: "system", content: longSystem },
        ...messages,
      ],
      max_tokens: 1024,
      temperature: 0.85,
    });

    const raw = res.choices[0]?.message?.content || "";
    const reasoning = (res.choices[0]?.message as any)?.reasoning || "";

    console.log("RAW CONTENT:");
    console.log(raw);
    console.log("\nREASONING:");
    console.log(reasoning?.slice(0, 500));
    console.log("\nFINISH REASON:", res.choices[0]?.finish_reason);
    console.log("USAGE:", JSON.stringify(res.usage));

    // Check if content has <think tags embedded
    if (raw.includes("<think") || raw.includes("</think")) {
      console.log("\n⚠️  CONTENT CONTAINS THINK TAGS!");
    }

    // Test the regex
    const cleaned = raw.replace(/<think[\s\S]*?<\/think>\s*/g, "").trim();
    console.log("\nAFTER CLEAN:", cleaned);
    if (cleaned !== raw) {
      console.log("⚠️  REGEX MODIFIED THE CONTENT!");
    }
  } catch (e: any) {
    console.log("ERROR:", e.status, e.message);
  }

  // Test 2: check if model sometimes returns content with think tags inside
  console.log("\n\n=== Test 2: Single short message ===\n");
  try {
    const res = await client.chat.completions.create({
      model: "minimax/minimax-m1",
      messages: [
        { role: "system", content: "你是苏婉，温柔知性的女孩。简短回复。" },
        { role: "user", content: "嗯" },
      ],
      max_tokens: 1024,
      temperature: 0.85,
    });

    const raw = res.choices[0]?.message?.content || "";
    console.log("RAW:", JSON.stringify(raw));
    console.log("FINISH:", res.choices[0]?.finish_reason);

    // Check for partial think tags
    if (raw.includes("<think")) {
      console.log("⚠️  CONTAINS <think");
    }
    if (raw.includes("</think")) {
      console.log("⚠️  CONTAINS </think");
    }
  } catch (e: any) {
    console.log("ERROR:", e.status, e.message);
  }
}

main();
