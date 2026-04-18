"use client";

import { Check, Languages } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { hasLocale, type Locale } from "@/i18n/config";

type LanguageSwitcherProps = {
  lang: Locale;
  buttonLabel: string;
  englishLabel: string;
  germanLabel: string;
  showLabel?: boolean;
  className?: string;
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
  showLabel = false,
  className,
}: LanguageSwitcherProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const labels = {
    en: englishLabel,
    de: germanLabel,
  } as const;

  const getLanguageHref = (targetLocale: Locale) => {
    const segments = pathname.split("/");

    if (segments[1] && hasLocale(segments[1])) {
      segments[1] = targetLocale;
    } else {
      segments.splice(1, 0, targetLocale);
    }

    return segments.join("/");
  };

  const handleLanguageChange = (targetLocale: Locale) => {
    const nextPath = getLanguageHref(targetLocale);
    const query = searchParams.toString();
    router.push(query ? `${nextPath}?${query}` : nextPath);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size={showLabel ? "sm" : "icon-sm"}
            className={className}
            aria-label={buttonLabel}
            title={buttonLabel}
          >
            <Languages aria-hidden="true" />
            {showLabel ? <span>{buttonLabel}</span> : null}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-40">
        {languageOptions.map((option) => {
          const isActive = option.locale === lang;

          return (
            <DropdownMenuItem
              key={option.locale}
              onClick={() => handleLanguageChange(option.locale)}
              aria-current={isActive ? "page" : undefined}
            >
              <span aria-hidden="true">{option.flag}</span>
              <span>{labels[option.locale]}</span>
              {isActive ? <Check className="ml-auto" aria-hidden="true" /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


