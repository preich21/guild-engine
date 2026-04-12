"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

type ThemeToggleProps = {
  lightLabel: string;
  darkLabel: string;
  showLabel?: boolean;
};

export function ThemeToggle({
  lightLabel,
  darkLabel,
  showLabel = true,
}: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="outline"
      size={showLabel ? "sm" : "icon-sm"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? lightLabel : darkLabel}
      title={isDark ? lightLabel : darkLabel}
    >
      {isDark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
      {showLabel ? <span>{isDark ? lightLabel : darkLabel}</span> : null}
    </Button>
  );
}

