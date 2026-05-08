"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useLocale } from "@/hooks/useLocale";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { UserAvatarLink } from "@/components/UserAvatarLink";
import { Shuffle, Heart, Loader2, RefreshCw, Sparkles, PenLine } from "lucide-react";

interface Character {
  id: string;
  name: string;
  subtitle: string;
  tags: string[];
  description: string;
  avatarUrl: string;
  originalName: string;
  mbti: string | null;
}

type SelectTab = "choose" | "encounter" | "mbti" | "describe";

const TAG_COLORS = [
  "from-purple-500/20 to-purple-600/20 text-purple-400 border-purple-500/30",
  "from-pink-500/20 to-pink-600/20 text-pink-400 border-pink-500/30",
  "from-blue-500/20 to-blue-600/20 text-blue-400 border-blue-500/30",
];

const MBTI_TYPES = [
  "INTJ", "INTP", "ENTJ", "ENTP",
  "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ",
  "ISTP", "ISFP", "ESTP", "ESFP",
];

export default function SelectPage() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<SelectTab>("choose");
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { mode, setMode } = useTheme();
  const { locale, setLocale, t } = useLocale();

  const [encounterChar, setEncounterChar] = useState<Character | null>(null);
  const [encounterAnim, setEncounterAnim] = useState(false);
  const [userMBTI, setUserMBTI] = useState("");
  const [mbtiScores, setMbtiScores] = useState<Record<string, number>>({});
  const [descInput, setDescInput] = useState("");
  const [descMatching, setDescMatching] = useState(false);
  const [descResult, setDescResult] = useState<{ name: string; reason: string; char?: Character } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
      return;
    }
    fetch(`/api/characters?locale=${locale}`)
      .then((res) => res.json())
      .then((data) => setCharacters(data.characters || []))
      .catch(console.error);
  }, [user, authLoading, router, locale]);

  const handleSelect = async (charId?: string) => {
    const targetId = charId || selected;
    if (!targetId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/user/select-character", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId: targetId }),
      });
      if (res.ok) router.push("/chat");
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEncounter = () => {
    if (characters.length === 0) return;
    setEncounterAnim(true);
    setEncounterChar(null);

    let count = 0;
    const interval = setInterval(() => {
      const rand = characters[Math.floor(Math.random() * characters.length)];
      setEncounterChar(rand);
      count++;
      if (count >= 10) {
        clearInterval(interval);
        setEncounterAnim(false);
      }
    }, 150);
  };

  const handleMBTIInput = (val: string) => {
    const upper = val.toUpperCase().slice(0, 4);
    setUserMBTI(upper);
    if (upper.length === 4 && MBTI_TYPES.includes(upper)) {
      fetch(`/api/characters/mbti?mbti=${upper}&locale=${locale}`)
        .then((r) => r.json())
        .then((d) => setMbtiScores(d.scores || {}))
        .catch(() => {});
    }
  };

  const handleDescMatch = async () => {
    if (!descInput.trim() || descMatching) return;
    setDescMatching(true);
    setDescResult(null);
    try {
      const res = await fetch("/api/characters/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: descInput, locale }),
      });
      const data = await res.json();
      if (data.name) {
        const matched = characters.find((c) => c.originalName === data.name);
        setDescResult({ name: data.name, reason: data.reason, char: matched });
      }
    } catch {}
    setDescMatching(false);
  };

  if (authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const sortedByMBTI = [...characters].sort((a, b) =>
    (mbtiScores[b.originalName] || 0) - (mbtiScores[a.originalName] || 0)
  );
  const displayName = user?.name || user?.username || user?.email?.split("@")[0] || "You";

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center justify-between gap-3 p-4">
        <UserAvatarLink user={user} subtitle={t("chat.account")} />
        <div className="flex items-center gap-2">
        <LocaleSwitcher locale={locale} setLocale={setLocale} />
        <ThemeSwitcher
          mode={mode}
          setMode={setMode}
          labels={{ light: t("theme.light"), dark: t("theme.dark"), auto: t("theme.auto") }}
        />
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center px-4 pb-8">
        <div className="w-full max-w-4xl animate-slide-up">
          <div className="text-center mb-6">
            <p className="text-sm text-primary mb-2">{t("select.logged_in_as", { name: displayName })}</p>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-light to-accent-pink bg-clip-text text-transparent">
              {t("select.title")}
            </h1>
            <p className="text-muted mt-2">{t("select.subtitle")}</p>
            <p className="text-muted/80 mt-2 text-sm">{t("select.helper")}</p>
          </div>

          {/* Tab Switcher */}
          <div className="flex justify-center gap-2 mb-8 flex-wrap">
            {(["choose", "encounter", "mbti", "describe"] as SelectTab[]).map((tb) => (
              <button
                key={tb}
                onClick={() => setTab(tb)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  tab === tb
                    ? "bg-primary text-white shadow-lg shadow-primary/30"
                    : "bg-surface text-muted hover:text-foreground"
                }`}
              >
                {tb === "encounter" && <Shuffle size={14} className="inline mr-1.5 -mt-0.5" />}
                {tb === "mbti" && <Heart size={14} className="inline mr-1.5 -mt-0.5" />}
                {tb === "describe" && <PenLine size={14} className="inline mr-1.5 -mt-0.5" />}
                {t(`select.tab_${tb}`)}
              </button>
            ))}
          </div>

          {/* ===== Choose Tab ===== */}
          {tab === "choose" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {characters.map((char) => (
                  <CharCard
                    key={char.id}
                    char={char}
                    selected={selected === char.id}
                    onSelect={() => setSelected(char.id)}
                  />
                ))}
              </div>
              {characters.length === 0 && (
                <div className="text-center py-16 text-muted"><p>{t("select.loading")}</p></div>
              )}
              <div className="mt-8 flex justify-center">
                <button
                  onClick={() => handleSelect()}
                  disabled={!selected || loading}
                  className="px-12 py-3 bg-gradient-to-r from-primary to-accent-pink text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {loading ? t("select.confirming") : t("select.confirm")}
                </button>
              </div>
            </>
          )}

          {/* ===== Encounter Tab ===== */}
          {tab === "encounter" && (
            <div className="max-w-md mx-auto text-center">
              <p className="text-muted mb-6">{t("select.encounter_desc")}</p>

              {!encounterChar && !encounterAnim && (
                <button
                  onClick={handleEncounter}
                  className="w-48 h-48 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-accent-pink/20 border-2 border-dashed border-primary/40 flex flex-col items-center justify-center gap-3 hover:scale-105 transition-transform"
                >
                  <Shuffle size={40} className="text-primary" />
                  <span className="text-sm text-muted">{t("select.encounter")}</span>
                </button>
              )}

              {(encounterChar || encounterAnim) && (
                <div className="animate-fade-in">
                  {encounterAnim && (
                    <p className="text-primary font-medium mb-4 animate-pulse-soft">{t("select.encounter_result")}</p>
                  )}
                  {encounterChar && (
                    <div className={`transition-all duration-300 ${encounterAnim ? "opacity-70 scale-95" : "opacity-100 scale-100"}`}>
                      <div className="w-32 h-32 mx-auto rounded-full overflow-hidden ring-4 ring-primary/30 mb-4 shadow-xl">
                        <img src={encounterChar.avatarUrl} alt={encounterChar.name} className="w-full h-full object-cover" />
                      </div>
                      <h3 className="text-xl font-bold mb-1">{encounterChar.name}</h3>
                      <p className="text-sm text-muted mb-1">{encounterChar.subtitle}</p>
                      {encounterChar.mbti && (
                        <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary mb-3">{encounterChar.mbti}</span>
                      )}
                      <p className="text-sm text-muted/80 mb-6">{encounterChar.description}</p>
                    </div>
                  )}
                  {!encounterAnim && encounterChar && (
                    <div className="flex justify-center gap-3">
                      <button
                        onClick={handleEncounter}
                        className="px-6 py-2.5 rounded-xl border border-card-border text-sm hover:bg-surface transition-colors flex items-center gap-1.5"
                      >
                        <RefreshCw size={14} />
                        {t("select.encounter_retry")}
                      </button>
                      <button
                        onClick={() => handleSelect(encounterChar.id)}
                        disabled={loading}
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent-pink text-white text-sm hover:opacity-90 transition-opacity disabled:opacity-30"
                      >
                        {loading ? <Loader2 size={14} className="animate-spin" /> : t("select.encounter_accept")}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ===== MBTI Tab ===== */}
          {tab === "mbti" && (
            <div>
              <div className="max-w-sm mx-auto mb-8">
                <label className="block text-sm font-medium mb-2 text-center">{t("select.mbti")}</label>
                <input
                  type="text"
                  value={userMBTI}
                  onChange={(e) => handleMBTIInput(e.target.value)}
                  placeholder={t("select.mbti_placeholder")}
                  maxLength={4}
                  className="w-full text-center text-2xl font-bold tracking-[0.3em] px-4 py-3 bg-input-bg border border-card-border rounded-xl text-foreground placeholder-muted/40 focus:outline-none focus:border-primary transition-colors uppercase"
                />
                {userMBTI.length === 4 && !MBTI_TYPES.includes(userMBTI) && (
                  <p className="text-accent-rose text-xs text-center mt-2">MBTI not valid</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {(userMBTI.length === 4 && MBTI_TYPES.includes(userMBTI) ? sortedByMBTI : characters).map((char) => {
                  const score = mbtiScores[char.originalName];
                  return (
                    <div key={char.id} className="relative">
                      {score === 100 && (
                        <div className="absolute -top-2 -right-2 z-10 px-2 py-0.5 rounded-full bg-gradient-to-r from-primary to-accent-pink text-white text-[10px] font-bold shadow-lg">
                          {t("select.mbti_best")}
                        </div>
                      )}
                      <CharCard
                        char={char}
                        selected={selected === char.id}
                        onSelect={() => setSelected(char.id)}
                        matchScore={score}
                        t={t}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 flex justify-center">
                <button
                  onClick={() => handleSelect()}
                  disabled={!selected || loading}
                  className="px-12 py-3 bg-gradient-to-r from-primary to-accent-pink text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {loading ? t("select.confirming") : t("select.confirm")}
                </button>
              </div>
            </div>
          )}
          {/* ===== Describe Tab ===== */}
          {tab === "describe" && (
            <div className="max-w-md mx-auto">
              <div className="space-y-4">
                <textarea
                  value={descInput}
                  onChange={(e) => setDescInput(e.target.value)}
                  placeholder={t("select.describe_placeholder")}
                  rows={4}
                  className="w-full px-4 py-3 bg-input-bg border border-card-border rounded-xl text-foreground placeholder-muted/40 focus:outline-none focus:border-primary transition-colors resize-none text-sm"
                />
                <button
                  onClick={handleDescMatch}
                  disabled={!descInput.trim() || descMatching}
                  className="w-full py-3 bg-gradient-to-r from-primary to-accent-pink text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {descMatching ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      {t("select.describe_matching")}
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      {t("select.describe_btn")}
                    </>
                  )}
                </button>
              </div>

              {descResult?.char && (
                <div className="mt-8 animate-fade-in text-center">
                  <p className="text-primary font-medium mb-4">{t("select.describe_result")}</p>
                  <div className="w-28 h-28 mx-auto rounded-full overflow-hidden ring-4 ring-primary/30 mb-4 shadow-xl">
                    <img src={descResult.char.avatarUrl} alt={descResult.char.name} className="w-full h-full object-cover" />
                  </div>
                  <h3 className="text-xl font-bold mb-1">{descResult.char.name}</h3>
                  <p className="text-sm text-muted mb-3">{descResult.char.subtitle}</p>
                  <div className="p-4 rounded-xl bg-surface border border-card-border mb-6">
                    <p className="text-xs text-muted mb-1">{t("select.describe_reason")}</p>
                    <p className="text-sm">{descResult.reason}</p>
                  </div>
                  <button
                    onClick={() => handleSelect(descResult.char!.id)}
                    disabled={loading}
                    className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent-pink text-white text-sm hover:opacity-90 transition-opacity disabled:opacity-30"
                  >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : t("select.encounter_accept")}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CharCard({
  char,
  selected,
  onSelect,
  matchScore,
  t,
}: {
  char: Character;
  selected: boolean;
  onSelect: () => void;
  matchScore?: number;
  t?: (key: string) => string;
}) {
  return (
    <button
      onClick={onSelect}
      className={`relative text-left p-5 rounded-2xl border-2 transition-all duration-300 ${
        selected
          ? "border-primary bg-gradient-to-br from-primary/10 to-primary-dark/10 shadow-lg shadow-primary/20 scale-[1.02]"
          : "border-card-border bg-card-bg hover:border-primary/50"
      }`}
    >
      {selected && (
        <div className="absolute top-3 right-3 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 ring-2 ring-card-border">
          {char.avatarUrl ? (
            <img src={char.avatarUrl} alt={char.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent-pink/20 flex items-center justify-center text-2xl">
              {char.name[0]}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold">{char.name}</h3>
            <span className="text-xs text-muted bg-surface px-2 py-0.5 rounded-full">{char.subtitle}</span>
          </div>
          <p className="text-sm text-muted/80 line-clamp-2 mb-2">{char.description}</p>
          <div className="flex items-center gap-1.5 flex-wrap">
            {char.tags.map((tag, tagIndex) => (
              <span
                key={tag}
                className={`text-xs px-2.5 py-1 rounded-full bg-gradient-to-r border ${TAG_COLORS[tagIndex % 3]}`}
              >
                {tag}
              </span>
            ))}
            {char.mbti && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono font-bold">
                {char.mbti}
              </span>
            )}
            {matchScore !== undefined && matchScore > 0 && t && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                matchScore === 100
                  ? "bg-green-500/20 text-green-400"
                  : matchScore >= 60
                  ? "bg-yellow-500/20 text-yellow-400"
                  : "bg-gray-500/20 text-gray-400"
              }`}>
                {t("select.mbti_match")} {matchScore}%
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
