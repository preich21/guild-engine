import Link from "next/link";
import Image from "next/image";

import type { CooperativeProgress } from "@/app/[lang]/cooperative-progress/actions";
import { signOut } from "@/auth";
import { StreakIndicator } from "@/components/streak-indicator";
import { CooperativeProgressBar } from "@/components/cooperative-progress-bar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LevelBar } from "@/components/level-bar";
import { SidebarToggleButton } from "@/components/sidebar-toggle-button";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Locale } from "@/i18n/config";
import { isFeatureEnabled, type FeatureConfigState } from "@/lib/feature-flags";
import type { UserLevelProgress } from "@/lib/level-system";
import { LogOut, User } from "lucide-react";

type TopbarProps = {
  lang: Locale;
  dictionary: {
    brand: string;
    leaderboardLink: string;
    individualLeaderboardLink: string;
    teamLeaderboardLink: string;
    trackContributionsLink: string;
    roleRaffleLink: string;
    rulesLink: string;
    adminLink: string;
    featureConfigLink: string;
    guildMeetingsLink: string;
    achievementsLink: string;
    awardAchievementsLink: string;
    manualPointsLink: string;
    performanceMetricConfigLink: string;
    rulesConfigLink: string;
    languageButton: string;
    english: string;
    german: string;
    toggleToLight: string;
    toggleToDark: string;
    attendanceStreakLabel: string;
    levelLabel: string;
    levelProgressTooltip: string;
    cooperativeProgressInProgressTooltip: string;
    cooperativeProgressOverGoalTooltip: string;
    logoutButton: string;
    profileButton: string;
    expandSidebarButton: string;
    collapseSidebarButton: string;
  };
  showAdminLink?: boolean;
  attendanceStreak: {
    count: number;
    hasPendingRecentMeeting: boolean;
    latestMeetingWasStreakFreeze: boolean;
  };
  featureConfig: FeatureConfigState;
  levelProgress?: UserLevelProgress | null;
  cooperativeProgress?: CooperativeProgress | null;
  homeHref: string;
  currentUser?: {
    id: string;
    username: string;
    profilePicture: string | null;
  };
};

export function Topbar({
  lang,
  dictionary,
  attendanceStreak,
  featureConfig,
  levelProgress,
  cooperativeProgress,
  homeHref,
  currentUser,
}: TopbarProps) {
  const logout = async () => {
    "use server";
    await signOut({ redirectTo: `/${lang}/login` });
  };

  const profileHref = currentUser ? `/${lang}/user/${currentUser.id}` : undefined;
  const areStreaksEnabled = isFeatureEnabled(featureConfig, "streaks");

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/90 backdrop-blur">
      <div className="flex h-14 w-full items-center gap-2 overflow-hidden px-3 sm:px-4.5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <SidebarToggleButton
            expandLabel={dictionary.expandSidebarButton}
            collapseLabel={dictionary.collapseSidebarButton}
          />
          <Link
            href={homeHref}
            className="inline-flex min-w-0 items-center gap-2 rounded-lg px-1.5 py-1 text-lg font-semibold tracking-tight transition-colors hover:bg-muted"
          >
            <Image
              src="/favicon.ico"
              alt=""
              aria-hidden="true"
              width={24}
              height={24}
              className="size-6 shrink-0"
              unoptimized
            />
            <span className="min-w-0 truncate">{dictionary.brand}</span>
          </Link>
        </div>
        {cooperativeProgress ? (
          <div className="flex min-w-10 flex-[0_1_8rem] justify-center sm:flex-[0_1_12.5rem]">
            <CooperativeProgressBar
              lang={lang}
              progress={cooperativeProgress}
              href={`/${lang}/cooperative-progress`}
              variant="topbar"
              dictionary={{
                inProgressTooltip: dictionary.cooperativeProgressInProgressTooltip,
                overGoalTooltip: dictionary.cooperativeProgressOverGoalTooltip,
              }}
            />
          </div>
        ) : null}
        <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2">
          {levelProgress ? (
            <LevelBar
              lang={lang}
              progress={levelProgress}
              variant="topbar"
              dictionary={{
                levelLabel: dictionary.levelLabel,
                progressTooltip: dictionary.levelProgressTooltip,
              }}
              className="hidden lg:flex"
            />
          ) : null}
          {areStreaksEnabled ? (
            <StreakIndicator
              initialCount={attendanceStreak.count}
              initialHasPendingRecentMeeting={attendanceStreak.hasPendingRecentMeeting}
              initialLatestMeetingWasStreakFreeze={attendanceStreak.latestMeetingWasStreakFreeze}
              label={dictionary.attendanceStreakLabel}
            />
          ) : null}
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="rounded-full"
                  aria-label={dictionary.profileButton}
                  title={dictionary.profileButton}
                >
                  <Avatar className="size-6">
                    {currentUser?.profilePicture ? (
                      <AvatarImage src={currentUser.profilePicture} alt={currentUser.username} />
                    ) : null}
                    <AvatarFallback>
                      <User aria-hidden="true" />
                    </AvatarFallback>
                  </Avatar>
                </Button>
              }
            />
            <PopoverContent align="end" className="max-w-min">
              {profileHref ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  nativeButton={false}
                  render={<Link href={profileHref} />}
                >
                  <User aria-hidden="true" />
                  <span>{dictionary.profileButton}</span>
                </Button>
              ) : (
                <Button type="button" variant="ghost" size="sm" className="w-full justify-start" disabled>
                  <User aria-hidden="true" />
                  <span>{dictionary.profileButton}</span>
                </Button>
              )}

              <div className="my-1 border-t border-border" />

              <ThemeToggle
                lightLabel={dictionary.toggleToLight}
                darkLabel={dictionary.toggleToDark}
                showLabel
                className="w-full justify-start"
              />
              <LanguageSwitcher
                lang={lang}
                buttonLabel={dictionary.languageButton}
                englishLabel={dictionary.english}
                germanLabel={dictionary.german}
                showLabel
                className="w-full justify-start"
              />

              <div className="my-1 border-t border-border" />

              <form action={logout} className="w-full">
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  aria-label={dictionary.logoutButton}
                  title={dictionary.logoutButton}
                >
                  <LogOut aria-hidden="true" />
                  <span>{dictionary.logoutButton}</span>
                </Button>
              </form>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </header>
  );
}
