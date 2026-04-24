"use client";

import { useState, useEffect, useCallback } from "react";

export type ThemeMode = "light" | "dark" | "auto";

function getSystemDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function isNightTime(): boolean {
  const hour = new Date().getHours();
  return hour >= 19 || hour < 7;
}

function resolveTheme(mode: ThemeMode): "light" | "dark" {
  if (mode === "auto") return isNightTime() ? "dark" : "light";
  return mode;
}

export function useTheme() {
  const [mode, setModeState] = useState<ThemeMode>("auto");
  const [resolved, setResolved] = useState<"light" | "dark">("dark");

  const applyTheme = useCallback((m: ThemeMode) => {
    const r = resolveTheme(m);
    setResolved(r);
    if (r === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("theme-mode") as ThemeMode | null;
    const initial = saved || "auto";
    setModeState(initial);
    applyTheme(initial);

    if (initial === "auto") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => applyTheme("auto");
      mq.addEventListener("change", handler);

      const interval = setInterval(() => applyTheme("auto"), 60_000);
      return () => {
        mq.removeEventListener("change", handler);
        clearInterval(interval);
      };
    }
  }, [applyTheme]);

  const setMode = useCallback(
    (m: ThemeMode) => {
      setModeState(m);
      localStorage.setItem("theme-mode", m);
      applyTheme(m);
    },
    [applyTheme]
  );

  return { mode, resolved, setMode };
}
