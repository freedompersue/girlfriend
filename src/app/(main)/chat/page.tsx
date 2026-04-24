"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useLocale } from "@/hooks/useLocale";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import {
  Send,
  Volume2,
  Loader2,
  LogOut,
  ArrowLeftRight,
  ChevronDown,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUrl?: string | null;
  audioUrl?: string | null;
  createdAt: string;
}

export default function ChatPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const { mode, setMode } = useTheme();
  const { t } = useLocale();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingTTS, setLoadingTTS] = useState<string | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "instant",
    });
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
      return;
    }
    if (!authLoading && user && !user.selectedCharacterId) {
      router.replace("/select");
      return;
    }

    if (user?.selectedCharacterId) {
      fetch("/api/chat")
        .then((res) => res.json())
        .then((data) => {
          setMessages(data.messages || []);
          setTimeout(() => scrollToBottom(false), 100);
        })
        .catch(console.error);
    }
  }, [user, authLoading, router, scrollToBottom]);

  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 200);
    };
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSend = async () => {
    if (!input.trim() || sending) return;

    const userMsg = input.trim();
    setInput("");
    setSending(true);

    const tempId = `temp-${Date.now()}`;
    const userMessage: Message = {
      id: tempId,
      role: "user",
      content: userMsg,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setTimeout(() => scrollToBottom(), 50);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg }),
      });

      const data = await res.json();

      if (res.ok && data.message) {
        setMessages((prev) => [...prev, data.message]);
        setTimeout(() => scrollToBottom(), 50);
      }
    } catch (error) {
      console.error("Send failed:", error);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleTTS = async (messageId: string) => {
    if (loadingTTS) return;
    setLoadingTTS(messageId);

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId }),
      });

      const data = await res.json();
      if (data.audioUrl) {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        audioRef.current = new Audio(data.audioUrl);
        audioRef.current.play();

        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId ? { ...m, audioUrl: data.audioUrl } : m
          )
        );
      }
    } catch (error) {
      console.error("TTS failed:", error);
    } finally {
      setLoadingTTS(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const charName = user?.selectedCharacter?.name || "她";

  return (
    <div className="flex-1 flex flex-col h-screen max-h-screen">
      {/* Header */}
      <div className="shrink-0 bg-card-bg/80 backdrop-blur-xl border-b border-card-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent-pink flex items-center justify-center text-white font-bold text-sm">
              {charName[0]}
            </div>
            <div>
              <h2 className="font-semibold text-sm">{charName}</h2>
              <p className="text-xs text-muted">
                {user?.selectedCharacter?.subtitle || t("chat.online")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeSwitcher
              mode={mode}
              setMode={setMode}
              labels={{ light: t("theme.light"), dark: t("theme.dark"), auto: t("theme.auto") }}
            />
            <button
              onClick={() => router.push("/select")}
              className="p-2 text-muted hover:text-foreground transition-colors rounded-lg hover:bg-surface"
              title={t("chat.switch_role")}
            >
              <ArrowLeftRight size={18} />
            </button>
            <button
              onClick={logout}
              className="p-2 text-muted hover:text-accent-rose transition-colors rounded-lg hover:bg-surface"
              title={t("chat.logout")}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4"
      >
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-20">
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-accent-pink/20 flex items-center justify-center mb-4">
                <span className="text-3xl">💬</span>
              </div>
              <p className="text-muted">
                {t("chat.empty", { name: charName })}
              </p>
              <p className="text-muted/60 text-sm mt-1">
                {t("chat.empty_hint")}
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex animate-fade-in ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div className="max-w-[80%]">
                {msg.role === "assistant" && (
                  <p className="text-xs text-muted mb-1 ml-1">{charName}</p>
                )}
                <div
                  className={`px-4 py-3 rounded-2xl ${
                    msg.role === "user"
                      ? "bg-bubble-self text-white rounded-br-md"
                      : "bg-bubble-other text-foreground rounded-bl-md border border-card-border"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </p>
                </div>

                {msg.imageUrl && (
                  <div className="mt-2 rounded-xl overflow-hidden max-w-xs">
                    <img
                      src={msg.imageUrl}
                      alt=""
                      className="w-full rounded-xl"
                      loading="lazy"
                    />
                  </div>
                )}

                {msg.role === "assistant" && (
                  <div className="flex items-center gap-2 mt-1.5 ml-1">
                    <button
                      onClick={() => handleTTS(msg.id)}
                      disabled={loadingTTS === msg.id}
                      className="flex items-center gap-1 text-xs text-muted hover:text-primary-light transition-colors"
                    >
                      {loadingTTS === msg.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Volume2 size={14} />
                      )}
                      <span>{t("chat.listen")}</span>
                    </button>
                    <span className="text-[10px] text-muted/40">
                      {new Date(msg.createdAt).toLocaleTimeString("zh-CN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                )}

                {msg.role === "user" && (
                  <p className="text-[10px] text-muted/40 text-right mt-1 mr-1">
                    {new Date(msg.createdAt).toLocaleTimeString("zh-CN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex justify-start animate-fade-in">
              <div className="bg-bubble-other rounded-2xl rounded-bl-md border border-card-border px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-primary-light rounded-full animate-pulse-soft" />
                  <div
                    className="w-2 h-2 bg-primary-light rounded-full animate-pulse-soft"
                    style={{ animationDelay: "0.3s" }}
                  />
                  <div
                    className="w-2 h-2 bg-primary-light rounded-full animate-pulse-soft"
                    style={{ animationDelay: "0.6s" }}
                  />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {showScrollBtn && (
        <button
          onClick={() => scrollToBottom()}
          className="fixed bottom-24 right-6 w-10 h-10 bg-card-bg border border-card-border rounded-full flex items-center justify-center text-muted hover:text-foreground transition-colors shadow-lg"
        >
          <ChevronDown size={20} />
        </button>
      )}

      {/* Input */}
      <div className="shrink-0 bg-card-bg/80 backdrop-blur-xl border-t border-card-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-end gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("chat.placeholder", { name: charName })}
            rows={1}
            className="flex-1 px-4 py-3 bg-input-bg border border-card-border rounded-xl text-foreground placeholder-muted/50 focus:outline-none focus:border-primary transition-colors resize-none text-sm max-h-32"
            style={{ minHeight: "44px" }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="shrink-0 w-11 h-11 bg-gradient-to-r from-primary to-accent-pink rounded-xl flex items-center justify-center text-white hover:opacity-90 transition-opacity disabled:opacity-30"
          >
            {sending ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
