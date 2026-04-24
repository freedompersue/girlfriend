"use client";

import { Sun, Moon, Monitor } from "lucide-react";
import { type ThemeMode } from "@/hooks/useTheme";

const ICONS = {
  light: Sun,
  dark: Moon,
  auto: Monitor,
};

export function ThemeSwitcher({
  mode,
  setMode,
  labels,
}: {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  labels: { light: string; dark: string; auto: string };
}) {
  const modes: ThemeMode[] = ["light", "dark", "auto"];

  return (
    <div className="flex items-center bg-surface rounded-lg p-0.5 gap-0.5">
      {modes.map((m) => {
        const Icon = ICONS[m];
        return (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs transition-all ${
              mode === m
                ? "bg-card-bg text-foreground shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
            title={labels[m]}
          >
            <Icon size={14} />
            <span className="hidden sm:inline">{labels[m]}</span>
          </button>
        );
      })}
    </div>
  );
}
