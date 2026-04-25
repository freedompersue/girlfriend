"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/hooks/useLocale";
import { ArrowLeft, Copy, Check, ExternalLink, Unlink, MessageCircle } from "lucide-react";

interface LinkInfo {
  id: string;
  platform: string;
  externalId: string;
  linkCode: string;
  active: boolean;
}

const TELEGRAM_BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "your_bot";
const QQ_BOT_ID = process.env.NEXT_PUBLIC_QQ_BOT_ID || "";

export default function IntegrationsPage() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLocale();
  const router = useRouter();
  const [links, setLinks] = useState<LinkInfo[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [binding, setBinding] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) { router.replace("/login"); return; }
    fetchLinks();
  }, [user, authLoading, router]);

  const fetchLinks = async () => {
    try {
      const res = await fetch("/api/integrations/link");
      const data = await res.json();
      setLinks(data.links || []);
    } catch {}
  };

  const handleBind = async (platform: string) => {
    setBinding(platform);
    try {
      const res = await fetch("/api/integrations/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      });
      const data = await res.json();
      if (data.linkCode) {
        await fetchLinks();
      }
    } catch {}
    setBinding(null);
  };

  const handleUnbind = async (platform: string) => {
    try {
      await fetch("/api/integrations/link", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      });
      await fetchLinks();
    } catch {}
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const telegramLink = links.find((l) => l.platform === "telegram");
  const qqLink = links.find((l) => l.platform === "qq");

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center gap-3 p-4 border-b border-card-border">
        <button onClick={() => router.push("/chat")} className="p-2 hover:bg-surface rounded-xl transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-semibold">{t("integration.title")}</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <p className="text-muted text-sm mb-6">{t("integration.desc")}</p>

        <div className="space-y-6 max-w-lg mx-auto">
          {/* Telegram */}
          <PlatformCard
            platform="telegram"
            icon={<TelegramIcon />}
            label={t("integration.telegram")}
            link={telegramLink}
            binding={binding === "telegram"}
            onBind={() => handleBind("telegram")}
            onUnbind={() => handleUnbind("telegram")}
            t={t}
            copied={copied}
            onCopy={copyToClipboard}
            steps={[
              t("integration.telegram_step1"),
              t("integration.telegram_step2"),
              t("integration.telegram_step3"),
            ]}
            linkUrl={
              telegramLink?.linkCode
                ? `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${telegramLink.linkCode}`
                : undefined
            }
          />

          {/* QQ */}
          <PlatformCard
            platform="qq"
            icon={<QQIcon />}
            label={t("integration.qq")}
            link={qqLink}
            binding={binding === "qq"}
            onBind={() => handleBind("qq")}
            onUnbind={() => handleUnbind("qq")}
            t={t}
            copied={copied}
            onCopy={copyToClipboard}
            steps={[
              t("integration.qq_step1"),
              t("integration.qq_step2"),
              t("integration.qq_step3"),
            ]}
          />
        </div>
      </div>
    </div>
  );
}

function PlatformCard({
  platform,
  icon,
  label,
  link,
  binding,
  onBind,
  onUnbind,
  t,
  copied,
  onCopy,
  steps,
  linkUrl,
}: {
  platform: string;
  icon: React.ReactNode;
  label: string;
  link?: LinkInfo;
  binding: boolean;
  onBind: () => void;
  onUnbind: () => void;
  t: (key: string) => string;
  copied: string | null;
  onCopy: (text: string, key: string) => void;
  steps: string[];
  linkUrl?: string;
}) {
  const isBound = link && link.externalId;

  return (
    <div className="p-5 rounded-2xl border border-card-border bg-card-bg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-surface">{icon}</div>
          <div>
            <h3 className="font-semibold">{label}</h3>
            <span className={`text-xs ${isBound ? "text-green-400" : "text-muted"}`}>
              {isBound ? t("integration.bound") : t("integration.not_bound")}
            </span>
          </div>
        </div>
        {isBound ? (
          <button onClick={onUnbind} className="text-xs px-3 py-1.5 rounded-lg border border-accent-rose/30 text-accent-rose hover:bg-accent-rose/10 transition-colors flex items-center gap-1">
            <Unlink size={12} />
            {t("integration.unbind")}
          </button>
        ) : (
          <button
            onClick={onBind}
            disabled={binding || !!link}
            className="text-xs px-3 py-1.5 rounded-lg bg-primary text-white hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1"
          >
            <MessageCircle size={12} />
            {binding ? "..." : t("integration.bind")}
          </button>
        )}
      </div>

      {link && !isBound && (
        <div className="mt-3 space-y-3">
          <div className="text-xs text-muted space-y-1">
            {steps.map((s, i) => (
              <p key={i}>{s}</p>
            ))}
          </div>

          {link.linkCode && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-surface">
              <span className="text-xs text-muted">{t("integration.link_code")}:</span>
              <code className="text-sm font-mono text-primary flex-1">{link.linkCode}</code>
              <button
                onClick={() => onCopy(link.linkCode, `${platform}-code`)}
                className="p-1.5 rounded-lg hover:bg-card-bg transition-colors"
              >
                {copied === `${platform}-code` ? <Check size={14} className="text-green-400" /> : <Copy size={14} className="text-muted" />}
              </button>
            </div>
          )}

          {linkUrl && (
            <a
              href={linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 text-sm py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              <ExternalLink size={14} />
              {t("integration.open_link")}
            </a>
          )}
        </div>
      )}

      {isBound && (
        <div className="mt-2 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
          <p className="text-xs text-green-400">
            ✅ ID: {link!.externalId.slice(0, 8)}***
          </p>
        </div>
      )}
    </div>
  );
}

function TelegramIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"
        fill="#229ED9"
      />
    </svg>
  );
}

function QQIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.36 14.3c-.32.14-.98.14-1.32-.08-.08-.04-.2-.16-.28-.24-.44.32-1.04.52-1.76.52s-1.32-.2-1.76-.52c-.08.08-.2.2-.28.24-.34.22-1 .22-1.32.08-.44-.2-.44-.56-.2-.84.16-.2.4-.36.64-.48-.12-.28-.2-.6-.24-.92-.64-.48-1.12-1.4-1.12-2.48 0-.36.04-.68.16-.96-.24-.52-.36-1.16-.36-1.88C8.52 6.36 9.96 5 12 5s3.48 1.36 3.48 3.24c0 .72-.12 1.36-.36 1.88.12.28.16.6.16.96 0 1.08-.48 2-1.12 2.48-.04.32-.12.64-.24.92.24.12.48.28.64.48.24.28.24.64-.2.84z"
        fill="#12B7F5"
      />
    </svg>
  );
}
