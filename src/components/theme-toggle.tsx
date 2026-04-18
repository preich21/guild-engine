"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

type ThemeToggleProps = {
  lightLabel: string;
  darkLabel: string;
  showLabel?: boolean;
  className?: string;
};

export function ThemeToggle({
  lightLabel,
  darkLabel,
  showLabel = true,
  className,
}: ThemeToggleProps) {
  const [mounted, setMounted] = React.useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size={showLabel ? "sm" : "icon-sm"}
      className={className}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={mounted && isDark ? lightLabel : darkLabel}
      title={mounted && isDark ? lightLabel : darkLabel}
    >
      {isDark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
      {showLabel ? <span>{mounted && isDark ? lightLabel : darkLabel}</span> : null}
    </Button>
  );
}

