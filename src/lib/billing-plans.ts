export type PlanType = "free" | "plus" | "pro";

export interface PlanConfig {
  id: PlanType;
  name: string;
  nameEn: string;
  nameJa: string;
  price: number;
  priceDisplay: string;
  features: string[];
  featuresEn: string[];
  featuresJa: string[];
  dailyMessages: number;
  maxCharacters: number;
  hasVoice: boolean;
  hasPhotos: boolean;
  hasMoodDiary: boolean;
  hasGoodnight: boolean;
  hasMemory: boolean;
  hasExternalLink: boolean;
  stripePriceId: string;
}

export const PLANS: Record<PlanType, PlanConfig> = {
  free: {
    id: "free",
    name: "免费版",
    nameEn: "Free",
    nameJa: "無料",
    price: 0,
    priceDisplay: "¥0",
    features: ["每天 30 条消息", "1 个角色", "基础聊天"],
    featuresEn: ["30 messages/day", "1 character", "Basic chat"],
    featuresJa: ["毎日30メッセージ", "1キャラ", "基本チャット"],
    dailyMessages: 30,
    maxCharacters: 1,
    hasVoice: false,
    hasPhotos: false,
    hasMoodDiary: false,
    hasGoodnight: false,
    hasMemory: false,
    hasExternalLink: false,
    stripePriceId: "",
  },
  plus: {
    id: "plus",
    name: "Plus 会员",
    nameEn: "Plus",
    nameJa: "Plus",
    price: 2900,
    priceDisplay: "¥29/月",
    features: ["无限消息", "全部角色", "语音消息", "心情日记", "记忆系统"],
    featuresEn: ["Unlimited messages", "All characters", "Voice messages", "Mood diary", "Memory system"],
    featuresJa: ["無制限メッセージ", "全キャラ", "音声メッセージ", "気分日記", "記憶システム"],
    dailyMessages: -1,
    maxCharacters: -1,
    hasVoice: true,
    hasPhotos: false,
    hasMoodDiary: true,
    hasGoodnight: false,
    hasMemory: true,
    hasExternalLink: false,
    stripePriceId: "",
  },
  pro: {
    id: "pro",
    name: "Pro 会员",
    nameEn: "Pro",
    nameJa: "Pro",
    price: 6900,
    priceDisplay: "¥69/月",
    features: ["全部 Plus 功能", "AI 生成照片", "晚安电台", "记忆增强", "Telegram/QQ 接入", "优先响应"],
    featuresEn: ["All Plus features", "AI photos", "Goodnight radio", "Enhanced memory", "Telegram/QQ", "Priority response"],
    featuresJa: ["全Plus機能", "AI写真", "おやすみラジオ", "記憶強化", "Telegram/QQ", "優先応答"],
    dailyMessages: -1,
    maxCharacters: -1,
    hasVoice: true,
    hasPhotos: true,
    hasMoodDiary: true,
    hasGoodnight: true,
    hasMemory: true,
    hasExternalLink: true,
    stripePriceId: "",
  },
};

export const CREDIT_PACKS = [
  { id: "pack_50", credits: 50, price: 600, priceDisplay: "¥6", bonus: "", stripePriceId: "" },
  { id: "pack_200", credits: 200, price: 1800, priceDisplay: "¥18", bonus: "赠20", stripePriceId: "" },
  { id: "pack_500", credits: 500, price: 3800, priceDisplay: "¥38", bonus: "赠80", stripePriceId: "" },
];

export const CREDIT_COSTS = {
  photo: 5,
  voice_long: 10,
  goodnight: 3,
};
