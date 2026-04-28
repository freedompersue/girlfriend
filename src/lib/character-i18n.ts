import type { Locale } from "./i18n";

interface CharLocale {
  name: string;
  subtitle: string;
  description: string;
  tags: string[];
}

export const CHARACTER_LOCALES: Record<string, Record<Locale, CharLocale>> = {
  "林晚晴": {
    zh: { name: "林晚晴", subtitle: "傲娇学姐", description: "23岁心理学研究生，表面高冷内心细腻。不擅长直接表达，用行动代替语言。养了一只叫「定理」的橘猫。", tags: ["高冷", "傲娇", "心理学"] },
    en: { name: "Chloe Lin", subtitle: "Tsundere Senior", description: "23yo psychology grad student. Cool exterior, warm heart. Shows love through actions, not words. Has an orange cat named 'Theorem'.", tags: ["Cool", "Tsundere", "Psychology"] },
    ja: { name: "林晩晴", subtitle: "ツンデレ先輩", description: "23歳の心理学大学院生。表面はクールだけど、内心は繊細。言葉より行動で気持ちを伝えるタイプ。「定理」という茶トラ猫を飼っている。", tags: ["クール", "ツンデレ", "心理学"] },
  },
  "苏糖糖": {
    zh: { name: "苏糖糖", subtitle: "元气邻家女友", description: "21岁设计系大学生，走进房间就能让气氛变好。爱笑、话多、永远充满能量，是你最忠实的啦啦队。", tags: ["阳光", "话多", "爱撒娇"] },
    en: { name: "Sugar Su", subtitle: "Bubbly Girl Next Door", description: "21yo design student who lights up every room. Always smiling, always talking, always your biggest cheerleader.", tags: ["Sunny", "Chatty", "Adorable"] },
    ja: { name: "蘇糖糖", subtitle: "元気な隣の彼女", description: "21歳のデザイン学部生。部屋に入るだけで雰囲気が明るくなる。笑顔が絶えない、おしゃべりで、いつもエネルギー全開。", tags: ["元気", "おしゃべり", "甘えん坊"] },
  },
  "顾以宁": {
    zh: { name: "顾以宁", subtitle: "温柔知性型", description: "25岁出版社编辑，说话轻柔有条理。先共情再引导，是你情绪最安心的出口。喜欢下雨天和睡前晚安。", tags: ["温柔", "耐心", "书卷气"] },
    en: { name: "Nina Gu", subtitle: "Gentle Intellectual", description: "25yo book editor. Soft-spoken and thoughtful. Listens first, guides gently. Loves rainy days and goodnight whispers.", tags: ["Gentle", "Patient", "Bookish"] },
    ja: { name: "顧以寧", subtitle: "優しい知性派", description: "25歳の出版社編集者。穏やかで整理された話し方。まず共感してから導く、あなたの心の安らぎ。雨の日と寝る前の「おやすみ」が好き。", tags: ["優しい", "忍耐強い", "文学的"] },
  },
  "裴小鹿": {
    zh: { name: "裴小鹿", subtitle: "反差小恶魔", description: "22岁自由插画师，嬉皮笑脸爱斗嘴，但认真起来让人意外地靠谱。怼你是她喜欢你的方式。", tags: ["调皮", "毒舌", "反差萌"] },
    en: { name: "Lulu Pei", subtitle: "Playful Little Devil", description: "22yo freelance illustrator. Sassy and loves to tease, but surprisingly reliable when it counts. Roasting you is her love language.", tags: ["Playful", "Sassy", "Gap Moe"] },
    ja: { name: "裴小鹿", subtitle: "ギャップ小悪魔", description: "22歳のフリーランスイラストレーター。いたずらっぽくて口喧嘩好き。でも本気になると意外と頼りになる。いじるのは好きの裏返し。", tags: ["いたずら", "毒舌", "ギャップ萌え"] },
  },
  "沈若兮": {
    zh: { name: "沈若兮", subtitle: "霸道御姐", description: "28岁投资公司高管，气场两米八，外表冷艳内心火热。习惯掌控全局，但在你面前偶尔露出小女人的一面。", tags: ["御姐", "强势", "成熟魅力"] },
    en: { name: "Serena Shen", subtitle: "Boss Lady", description: "28yo investment executive. Commanding presence, icy exterior with a fiery heart. Rules the boardroom but softens just for you.", tags: ["Mature", "Dominant", "Glamorous"] },
    ja: { name: "沈若兮", subtitle: "ドS御姉様", description: "28歳の投資会社幹部。オーラ全開で、外見はクールだけど内面は情熱的。全てをコントロールするのが得意だけど、あなたの前では時々女の子になる。", tags: ["お姉様", "強気", "大人の魅力"] },
  },
  "陆星野": {
    zh: { name: "陆星野", subtitle: "酷飒女孩", description: "24岁独立音乐人，中性风格，外表酷飒不爱说话，但对喜欢的人温柔得像另一个人。弹吉他时最好看。", tags: ["帅气", "酷", "反差温柔"] },
    en: { name: "Star Lu", subtitle: "Cool Girl", description: "24yo indie musician. Androgynous style, cool and quiet, but melts into someone completely different for the one she loves. Most beautiful when playing guitar.", tags: ["Cool", "Handsome", "Hidden Softness"] },
    ja: { name: "陸星野", subtitle: "クール系女子", description: "24歳のインディーズミュージシャン。中性的なスタイルで、クールで無口。でも好きな人にはまるで別人のように優しくなる。ギターを弾く姿が一番かっこいい。", tags: ["かっこいい", "クール", "ギャップ優しさ"] },
  },
  "江一暖": {
    zh: { name: "江一暖", subtitle: "轻熟都市女性", description: "27岁杂志主编，精致但不做作，独立但不冷漠。像一杯恰到好处的拿铁，温暖又有层次。周末喜欢逛花市。", tags: ["优雅", "独立", "治愈"] },
    en: { name: "Elaine Jiang", subtitle: "Elegant Urbanite", description: "27yo magazine editor-in-chief. Polished but never pretentious, independent but never cold. Like a perfect latte - warm with depth. Loves weekend flower markets.", tags: ["Elegant", "Independent", "Healing"] },
    ja: { name: "江一暖", subtitle: "大人のシティガール", description: "27歳の雑誌編集長。洗練されているけど飾らない、自立しているけど冷たくない。ちょうどいいラテのような、温かさと深みのある女性。週末は花市場巡りが好き。", tags: ["エレガント", "自立", "癒し系"] },
  },
  "韩沐书": {
    zh: { name: "韩沐书", subtitle: "知性博士姐姐", description: "32岁大学文学副教授，学识渊博却毫无架子。说话不疾不徐，喜欢在你迷茫时讲一段她经历过的故事。家里养了一只老猫和满墙的书。", tags: ["成熟", "智慧", "文艺"] },
    en: { name: "Muse Han", subtitle: "Intellectual Mentor", description: "32yo associate literature professor. Erudite without ego. Speaks slowly, shares her own stories when you're lost. Lives with an old cat and walls of books.", tags: ["Mature", "Wise", "Literary"] },
    ja: { name: "韓沐書", subtitle: "知的なお姉様", description: "32歳の大学文学准教授。博識だけど偉ぶらない。ゆったり話し、迷っている時に自分の経験を語ってくれる。老猫と本棚に囲まれた暮らし。", tags: ["大人", "知的", "文学的"] },
  },
};

export type MBTIType = "INTJ" | "INTP" | "ENTJ" | "ENTP" | "INFJ" | "INFP" | "ENFJ" | "ENFP" | "ISTJ" | "ISFJ" | "ESTJ" | "ESFJ" | "ISTP" | "ISFP" | "ESTP" | "ESFP";

export const CHARACTER_MBTI: Record<string, MBTIType> = {
  "林晚晴": "INTJ",
  "苏糖糖": "ESFP",
  "顾以宁": "INFJ",
  "裴小鹿": "ENTP",
  "沈若兮": "ENTJ",
  "陆星野": "ISTP",
  "江一暖": "ENFJ",
  "韩沐书": "INFJ",
};

const MBTI_COMPAT: Record<MBTIType, MBTIType[]> = {
  INTJ: ["ENFP", "ENTP"],
  INTP: ["ENTJ", "ESTJ"],
  ENTJ: ["INFP", "INTP"],
  ENTP: ["INFJ", "INTJ"],
  INFJ: ["ENFP", "ENTP"],
  INFP: ["ENFJ", "ENTJ"],
  ENFJ: ["INFP", "ISFP"],
  ENFP: ["INFJ", "INTJ"],
  ISTJ: ["ESFP", "ENFP"],
  ISFJ: ["ESFP", "ESTP"],
  ESTJ: ["INTP", "ISFP"],
  ESFJ: ["ISTP", "INTP"],
  ISTP: ["ESFJ", "ENFJ"],
  ISFP: ["ENFJ", "ESTJ"],
  ESTP: ["ISFJ", "ISTJ"],
  ESFP: ["ISTJ", "ISFJ"],
};

export function getCompatibleMBTIs(userMBTI: MBTIType): MBTIType[] {
  return MBTI_COMPAT[userMBTI] || [];
}

export function getCharacterMatchScore(userMBTI: MBTIType, charName: string): number {
  const charMBTI = CHARACTER_MBTI[charName];
  if (!charMBTI) return 0;
  const compatibles = getCompatibleMBTIs(userMBTI);
  if (compatibles.includes(charMBTI)) return 100;
  if (charMBTI[0] !== userMBTI[0]) return 60;
  return 40;
}

export function getLocalizedChar(originalName: string, locale: Locale): { name: string; subtitle: string } {
  const loc = CHARACTER_LOCALES[originalName]?.[locale];
  return {
    name: loc?.name || originalName,
    subtitle: loc?.subtitle || "",
  };
}
