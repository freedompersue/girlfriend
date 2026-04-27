import "dotenv/config";
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: process.env.OPENROUTER_BASE_URL,
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "http://localhost:3000",
    "X-Title": "test",
  },
});

async function main() {
  // Test 1: minimax/minimax-m1 with longer response
  console.log("=== Test 1: minimax/minimax-m1 ===");
  try {
    const res = await client.chat.completions.create({
      model: "minimax/minimax-m1",
      messages: [
        { role: "user", content: "你好，请回复我一句话" }
      ],
      max_tokens: 1024,
      temperature: 0.85,
    });
    console.log("Status: OK");
    console.log("Content:", JSON.stringify(res.choices[0]?.message?.content));
    console.log("Finish reason:", res.choices[0]?.finish_reason);
    console.log("Usage:", JSON.stringify(res.usage));
    console.log("Full response:", JSON.stringify(res.choices[0], null, 2));
  } catch (e: any) {
    console.log("ERROR:", e.status, e.message);
    if (e.error) console.log("DETAIL:", JSON.stringify(e.error));
  }

  // Test 2: try google/gemini-2.5-flash
  console.log("\n=== Test 2: google/gemini-2.5-flash ===");
  try {
    const res = await client.chat.completions.create({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "user", content: "你好，请回复我一句话" }
      ],
      max_tokens: 256,
    });
    console.log("Status: OK");
    console.log("Content:", JSON.stringify(res.choices[0]?.message?.content));
  } catch (e: any) {
    console.log("ERROR:", e.status, e.message);
  }

  // Test 3: deepseek
  console.log("\n=== Test 3: deepseek/deepseek-chat-v3-0324 ===");
  try {
    const res = await client.chat.completions.create({
      model: "deepseek/deepseek-chat-v3-0324",
      messages: [
        { role: "user", content: "你好，请回复我一句话" }
      ],
      max_tokens: 256,
    });
    console.log("Status: OK");
    console.log("Content:", JSON.stringify(res.choices[0]?.message?.content));
  } catch (e: any) {
    console.log("ERROR:", e.status, e.message);
  }
}

main();
