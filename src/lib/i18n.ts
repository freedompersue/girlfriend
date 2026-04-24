export type Locale = "zh" | "en" | "ja";

export const LOCALE_NAMES: Record<Locale, string> = {
  zh: "中文",
  en: "English",
  ja: "日本語",
};

const translations: Record<Locale, Record<string, string>> = {
  zh: {
    "app.name": "她在",
    "app.tagline": "记得你、懂你、有自己性格的陪伴",
    "app.loading": "正在加载...",

    "auth.login": "登录",
    "auth.register": "注册",
    "auth.email": "邮箱",
    "auth.password": "密码",
    "auth.nickname": "昵称",
    "auth.email_placeholder": "your@email.com",
    "auth.password_placeholder": "••••••",
    "auth.nickname_placeholder": "你的昵称",
    "auth.password_hint": "至少6个字符",
    "auth.logging_in": "登录中...",
    "auth.registering": "注册中...",
    "auth.create_account": "创建账号",
    "auth.no_account": "还没有账号？",
    "auth.has_account": "已有账号？",
    "auth.register_tagline": "选择一个她，开始你的故事",
    "auth.network_error": "网络错误，请重试",

    "select.title": "选择你的她",
    "select.subtitle": "每个人都有独特的性格，选一个最心动的",
    "select.confirm": "开始聊天",
    "select.confirming": "确认中...",
    "select.loading": "正在加载角色列表...",

    "chat.placeholder": "对 {name} 说...",
    "chat.empty": "和 {name} 说点什么吧",
    "chat.empty_hint": "她在等你呢",
    "chat.listen": "听语音",
    "chat.switch_role": "切换角色",
    "chat.logout": "退出登录",
    "chat.online": "在线",

    "theme.light": "浅色",
    "theme.dark": "深色",
    "theme.auto": "自动",

    "lang.label": "语言",

    "checkin.btn": "签到",
    "checkin.done": "已签到",
    "checkin.title": "每日签到",
    "checkin.success": "签到成功！",
    "checkin.streak": "连续签到 {days} 天",
    "checkin.reward": "好感度 +{points}",
    "checkin.already": "今天已经签到过啦",
    "checkin.total": "累计签到 {days} 天",

    "affinity.title": "好感度",
    "affinity.level": "Lv.{level} {name}",
    "affinity.progress": "{current}/{needed}",
    "affinity.next": "下一级: {name}",
    "affinity.max": "已满级",
    "affinity.levelup": "好感等级提升！",
    "affinity.levelup_msg": "和 {name} 的关系升级为「{level}」",

    "notify.title": "通知",
    "notify.empty": "暂无通知",
    "notify.read_all": "全部已读",
    "notify.greeting": "想你了",
    "notify.holiday": "节日快乐",
    "notify.birthday": "生日快乐",
    "notify.memory": "回忆",
  },
  en: {
    "app.name": "She's Here",
    "app.tagline": "A companion who remembers, understands, and has personality",
    "app.loading": "Loading...",

    "auth.login": "Login",
    "auth.register": "Register",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.nickname": "Nickname",
    "auth.email_placeholder": "your@email.com",
    "auth.password_placeholder": "••••••",
    "auth.nickname_placeholder": "Your nickname",
    "auth.password_hint": "At least 6 characters",
    "auth.logging_in": "Logging in...",
    "auth.registering": "Registering...",
    "auth.create_account": "Create Account",
    "auth.no_account": "Don't have an account?",
    "auth.has_account": "Already have an account?",
    "auth.register_tagline": "Choose her, start your story",
    "auth.network_error": "Network error, please try again",

    "select.title": "Choose Her",
    "select.subtitle": "Each has a unique personality, pick the one you like",
    "select.confirm": "Start Chatting",
    "select.confirming": "Confirming...",
    "select.loading": "Loading characters...",

    "chat.placeholder": "Say something to {name}...",
    "chat.empty": "Say something to {name}",
    "chat.empty_hint": "She's waiting for you",
    "chat.listen": "Listen",
    "chat.switch_role": "Switch Character",
    "chat.logout": "Logout",
    "chat.online": "Online",

    "theme.light": "Light",
    "theme.dark": "Dark",
    "theme.auto": "Auto",

    "lang.label": "Language",

    "checkin.btn": "Check In",
    "checkin.done": "Checked In",
    "checkin.title": "Daily Check-In",
    "checkin.success": "Check-in successful!",
    "checkin.streak": "{days}-day streak",
    "checkin.reward": "Affinity +{points}",
    "checkin.already": "Already checked in today",
    "checkin.total": "Total {days} days",

    "affinity.title": "Affinity",
    "affinity.level": "Lv.{level} {name}",
    "affinity.progress": "{current}/{needed}",
    "affinity.next": "Next: {name}",
    "affinity.max": "Max Level",
    "affinity.levelup": "Level Up!",
    "affinity.levelup_msg": "Relationship with {name} upgraded to '{level}'",

    "notify.title": "Notifications",
    "notify.empty": "No notifications",
    "notify.read_all": "Read All",
    "notify.greeting": "Missing you",
    "notify.holiday": "Happy Holiday",
    "notify.birthday": "Happy Birthday",
    "notify.memory": "Memory",
  },
  ja: {
    "app.name": "彼女はここに",
    "app.tagline": "あなたを覚えて、理解して、自分の性格を持つパートナー",
    "app.loading": "読み込み中...",

    "auth.login": "ログイン",
    "auth.register": "登録",
    "auth.email": "メール",
    "auth.password": "パスワード",
    "auth.nickname": "ニックネーム",
    "auth.email_placeholder": "your@email.com",
    "auth.password_placeholder": "••••••",
    "auth.nickname_placeholder": "あなたのニックネーム",
    "auth.password_hint": "6文字以上",
    "auth.logging_in": "ログイン中...",
    "auth.registering": "登録中...",
    "auth.create_account": "アカウント作成",
    "auth.no_account": "アカウントをお持ちでない方",
    "auth.has_account": "すでにアカウントをお持ちの方",
    "auth.register_tagline": "彼女を選んで、あなたの物語を始めよう",
    "auth.network_error": "ネットワークエラー、もう一度お試しください",

    "select.title": "彼女を選ぶ",
    "select.subtitle": "それぞれ独自の性格があります。好きな子を選んでね",
    "select.confirm": "チャットを始める",
    "select.confirming": "確認中...",
    "select.loading": "キャラクターを読み込み中...",

    "chat.placeholder": "{name}に話しかける...",
    "chat.empty": "{name}に何か話してみよう",
    "chat.empty_hint": "彼女が待っていますよ",
    "chat.listen": "音声を聞く",
    "chat.switch_role": "キャラ変更",
    "chat.logout": "ログアウト",
    "chat.online": "オンライン",

    "theme.light": "ライト",
    "theme.dark": "ダーク",
    "theme.auto": "自動",

    "lang.label": "言語",

    "checkin.btn": "チェックイン",
    "checkin.done": "チェック済み",
    "checkin.title": "毎日チェックイン",
    "checkin.success": "チェックイン成功！",
    "checkin.streak": "{days}日連続",
    "checkin.reward": "好感度 +{points}",
    "checkin.already": "今日はもうチェック済みです",
    "checkin.total": "合計 {days} 日",

    "affinity.title": "好感度",
    "affinity.level": "Lv.{level} {name}",
    "affinity.progress": "{current}/{needed}",
    "affinity.next": "次のレベル: {name}",
    "affinity.max": "最高レベル",
    "affinity.levelup": "レベルアップ！",
    "affinity.levelup_msg": "{name}との関係が「{level}」にアップ",

    "notify.title": "通知",
    "notify.empty": "通知はありません",
    "notify.read_all": "すべて既読",
    "notify.greeting": "会いたい",
    "notify.holiday": "おめでとう",
    "notify.birthday": "誕生日おめでとう",
    "notify.memory": "思い出",
  },
};

export function t(locale: Locale, key: string, params?: Record<string, string>): string {
  let text = translations[locale]?.[key] || translations.zh[key] || key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(`{${k}}`, v);
    }
  }
  return text;
}
