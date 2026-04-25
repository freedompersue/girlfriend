import { NextRequest, NextResponse } from "next/server";
import { chatWithCharacter } from "@/lib/minimax";
import { CHARACTER_DATA } from "@/lib/characters";

export async function POST(req: NextRequest) {
  const { description, locale } = await req.json();
  if (!description?.trim()) {
    return NextResponse.json({ error: "描述不能为空" }, { status: 400 });
  }

  const charSummaries = CHARACTER_DATA.map((c) =>
    `${c.name}（${c.subtitle}）：${c.description} 标签：${c.tags?.join("、")}`
  ).join("\n");

  const langHint = locale === "en"
    ? "Respond in English."
    : locale === "ja"
    ? "日本語で回答してください。"
    : "用中文回答。";

  const systemPrompt = `你是一个匹配分析师。用户会描述他理想中的女朋友类型，你需要从以下角色中选出最匹配的一个。

可选角色：
${charSummaries}

请严格按照以下JSON格式回答，不要输出任何其他内容：
{"name": "角色中文原名", "reason": "50字以内的匹配理由"}

${langHint}
reason字段请用对应语言书写。`;

  try {
    const result = await chatWithCharacter(systemPrompt, [
      { role: "user", content: `我理想中的她：${description}` },
    ]);

    const jsonMatch = result.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "匹配失败" }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const matchedChar = CHARACTER_DATA.find((c) => c.name === parsed.name);

    if (!matchedChar) {
      return NextResponse.json({ error: "匹配结果无效" }, { status: 500 });
    }

    return NextResponse.json({
      name: parsed.name,
      reason: parsed.reason,
    });
  } catch (error) {
    console.error("Match error:", error);
    return NextResponse.json({ error: "匹配失败" }, { status: 500 });
  }
}
