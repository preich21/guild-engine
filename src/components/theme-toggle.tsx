"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

type ThemeToggleProps = {
  lightLabel: string;
  darkLabel: string;
};

export function ThemeToggle({ lightLabel, darkLabel }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? lightLabel : darkLabel}
      title={isDark ? lightLabel : darkLabel}
      className="self-end"
    >
      {isDark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
      <span>{isDark ? lightLabel : darkLabel}</span>
    </Button>
  );
}

