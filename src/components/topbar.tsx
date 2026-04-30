import Link from "next/link";

import type { CooperativeProgress } from "@/app/[lang]/cooperative-progress/actions";
import { signOut } from "@/auth";
import { AdminNavLink } from "@/components/admin-nav-link";
import { AttendanceStreakIndicator } from "@/components/attendance-streak-indicator";
import { CooperativeProgressBar } from "@/components/cooperative-progress-bar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LeaderboardNavLink } from "@/components/leaderboard-nav-link";
import { LevelBar } from "@/components/level-bar";
import { TopbarNavLink } from "@/components/topbar-nav-link";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Locale } from "@/i18n/config";
import {
  isFeatureEnabled,
  isRoleRaffleEnabled,
  type FeatureConfigState,
} from "@/lib/feature-flags";
import type { UserLevelProgress } from "@/lib/level-system";
import { CircleHelp, LogOut, User } from "lucide-react";

type TopbarProps = {
  lang: Locale;
  dictionary: {
    brand: string;
    leaderboardLink: string;
    individualLeaderboardLink: string;
    teamLeaderboardLink: string;
    getPointsLink: string;
    roleRaffleLink: string;
    rulesLink: string;
    adminLink: string;
    featureConfigLink: string;
    pointDistributionLink: string;
    guildMeetingsLink: string;
    achievementsLink: string;
    awardAchievementsLink: string;
    manualPointsLink: string;
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
  };
  showAdminLink?: boolean;
  attendanceStreak: {
    count: number;
    hasPendingRecentMeeting: boolean;
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
  showAdminLink = false,
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
  const isPointSystemEnabled = isFeatureEnabled(featureConfig, "point-system");
  const isIndividualLeaderboardEnabled = isFeatureEnabled(featureConfig, "individual-leaderboard");
  const isTeamLeaderboardEnabled = isFeatureEnabled(featureConfig, "team-leaderboard");
  const areBadgesEnabled = isFeatureEnabled(featureConfig, "badges");
  const areStreaksEnabled = isFeatureEnabled(featureConfig, "streaks");
  const shouldShowRoleRaffle = isRoleRaffleEnabled(featureConfig);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/90 backdrop-blur">
      <div className="flex w-full flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
          <Link href={homeHref} className="text-lg font-semibold tracking-tight">
            {dictionary.brand}
          </Link>
          {isIndividualLeaderboardEnabled || isTeamLeaderboardEnabled ? (
            <LeaderboardNavLink
              lang={lang}
              label={dictionary.leaderboardLink}
              individualLabel={dictionary.individualLeaderboardLink}
              teamLabel={dictionary.teamLeaderboardLink}
              showIndividual={isIndividualLeaderboardEnabled}
              showTeam={isTeamLeaderboardEnabled}
            />
          ) : null}
          {isPointSystemEnabled ? (
            <TopbarNavLink href={`/${lang}/get-points`} label={dictionary.getPointsLink} />
          ) : null}
          {shouldShowRoleRaffle ? (
            <TopbarNavLink href={`/${lang}/role-raffle`} label={dictionary.roleRaffleLink} />
          ) : null}
          {showAdminLink ? (
            <AdminNavLink
              lang={lang}
              label={dictionary.adminLink}
              featureConfigLabel={dictionary.featureConfigLink}
              pointDistributionLabel={dictionary.pointDistributionLink}
              guildMeetingsLabel={dictionary.guildMeetingsLink}
              achievementsLabel={dictionary.achievementsLink}
              awardAchievementsLabel={dictionary.awardAchievementsLink}
              manualPointsLabel={dictionary.manualPointsLink}
              rulesConfigLabel={dictionary.rulesConfigLink}
              showPointDistribution={isPointSystemEnabled}
              showAchievements={areBadgesEnabled}
              showAwardAchievements={areBadgesEnabled}
              showManualPoints={isPointSystemEnabled}
            />
          ) : null}
        </div>
        {cooperativeProgress ? (
          <div className="order-last flex w-full min-w-20 justify-center sm:order-0 sm:w-auto sm:flex-[0_1_12.5rem]">
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
        <div className="ml-auto flex flex-1 items-center justify-end gap-2">
          {levelProgress ? (
            <LevelBar
              lang={lang}
              progress={levelProgress}
              variant="topbar"
              dictionary={{
                levelLabel: dictionary.levelLabel,
                progressTooltip: dictionary.levelProgressTooltip,
              }}
              className="hidden sm:flex"
            />
          ) : null}
          {areStreaksEnabled ? (
            <AttendanceStreakIndicator
              initialCount={attendanceStreak.count}
              initialHasPendingRecentMeeting={attendanceStreak.hasPendingRecentMeeting}
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

              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                nativeButton={false}
                render={<Link href={`/${lang}/rules`} />}
              >
                <CircleHelp aria-hidden="true" />
                <span>{dictionary.rulesLink}</span>
              </Button>

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
