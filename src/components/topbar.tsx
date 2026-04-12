import Link from "next/link";

import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Locale } from "@/i18n/config";

type TopbarProps = {
  lang: Locale;
  dictionary: {
    brand: string;
    languageButton: string;
    english: string;
    german: string;
    toggleToLight: string;
    toggleToDark: string;
  };
};

export function Topbar({ lang, dictionary }: TopbarProps) {
  return (
    <header className="w-full border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href={`/${lang}`} className="text-lg font-semibold tracking-tight">
          {dictionary.brand}
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSwitcher
            lang={lang}
            buttonLabel={dictionary.languageButton}
            englishLabel={dictionary.english}
            germanLabel={dictionary.german}
          />
          <ThemeToggle
            lightLabel={dictionary.toggleToLight}
            darkLabel={dictionary.toggleToDark}
            showLabel={false}
          />
        </div>
      </div>
    </header>
  );
}

