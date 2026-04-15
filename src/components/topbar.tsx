import Link from "next/link";

import { signOut } from "@/auth";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LeaderboardNavLink } from "@/components/leaderboard-nav-link";
import { TopbarNavLink } from "@/components/topbar-nav-link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Locale } from "@/i18n/config";
import { LogOut } from "lucide-react";

type TopbarProps = {
  lang: Locale;
  dictionary: {
    brand: string;
    leaderboardLink: string;
    individualLeaderboardLink: string;
    teamLeaderboardLink: string;
    getPointsLink: string;
    languageButton: string;
    english: string;
    german: string;
    toggleToLight: string;
    toggleToDark: string;
    logoutButton: string;
  };
};

export function Topbar({ lang, dictionary }: TopbarProps) {
  const logout = async () => {
    "use server";
    await signOut({ redirectTo: `/${lang}/login` });
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Link href={`/${lang}/leaderboard/individual`} className="text-lg font-semibold tracking-tight">
            {dictionary.brand}
          </Link>
          <LeaderboardNavLink
            lang={lang}
            label={dictionary.leaderboardLink}
            individualLabel={dictionary.individualLeaderboardLink}
            teamLabel={dictionary.teamLeaderboardLink}
          />
          <TopbarNavLink href={`/${lang}/get-points`} label={dictionary.getPointsLink} />
        </div>
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
          <form action={logout}>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              aria-label={dictionary.logoutButton}
              title={dictionary.logoutButton}
            >
              <LogOut />
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}

