"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Languages } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";

type LanguageSwitcherProps = {
  lang: Locale;
  buttonLabel: string;
  englishLabel: string;
  germanLabel: string;
};

const languageOptions = [
  { locale: "en", flag: "🇺🇸" },
  { locale: "de", flag: "🇩🇪" },
] as const;

export function LanguageSwitcher({
  lang,
  buttonLabel,
  englishLabel,
  germanLabel,
}: LanguageSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const labels = {
    en: englishLabel,
    de: germanLabel,
  } as const;

  return (
    <div className="relative" ref={containerRef}>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label={buttonLabel}
        title={buttonLabel}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((value) => !value)}
      >
        <Languages aria-hidden="true" />
      </Button>
      {isOpen ? (
        <div
          className="absolute right-0 z-20 mt-2 min-w-40 rounded-lg border border-border bg-background p-1 shadow-md"
          role="menu"
        >
          {languageOptions.map((option) => {
            const isActive = option.locale === lang;

            return (
              <Link
                key={option.locale}
                href={`/${option.locale}`}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted"
                aria-current={isActive ? "page" : undefined}
                role="menuitem"
                onClick={() => setIsOpen(false)}
              >
                <span aria-hidden="true">{option.flag}</span>
                <span>{labels[option.locale]}</span>
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}


