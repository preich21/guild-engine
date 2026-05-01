import type { LeaderboardEntry } from "@/app/[lang]/leaderboard/actions";

import { AchievementStack } from "@/components/achievement-stack";
import { AttendanceStreakIndicator } from "@/components/attendance-streak-indicator";
import { UserProfilePopover } from "@/components/user-profile-popover";
import type { UserProfileDictionary } from "@/components/user-profile-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import type { Locale } from "@/i18n/config";
import { rankLeaderboardEntries } from "@/lib/leaderboard-ranking";
import { cn } from "@/lib/utils";
import type { UserProfileData } from "@/lib/user-profile";

type LeaderboardProps = {
  lang: Locale;
  entries: LeaderboardEntry[];
  highlightedUserId?: string;
  profileDataByUserId: Record<string, UserProfileData>;
  showAchievements: boolean;
  showPowerups: boolean;
  showStreaks: boolean;
  dictionary: {
    heading: string;
    empty: string;
    streakLabel: string;
    profile: UserProfileDictionary;
  };
};

export const getPlaceClassName = (place: number) => {
  if (place === 1) {
    return "text-amber-500 dark:text-amber-400";
  }

  if (place === 2) {
    return "text-slate-400 dark:text-slate-300";
  }

  if (place === 3) {
    return "text-amber-700 dark:text-amber-600";
  }

  return "text-foreground/80";
};

const getUserInitials = (username: string) => username.slice(0, 2).toUpperCase();

export function Leaderboard({
  lang,
  entries,
  highlightedUserId,
  profileDataByUserId,
  showAchievements,
  showPowerups,
  showStreaks,
  dictionary,
}: LeaderboardProps) {
  const rankedEntries = rankLeaderboardEntries(entries)
    .map((entry) => profileDataByUserId[entry.userId])
    .filter((entry) => entry != undefined);

  return (
    <main className="flex flex-1 justify-center bg-zinc-50 px-4 py-8 dark:bg-black sm:px-6 sm:py-12">
      <Card className="w-full max-w-6xl">
        <CardHeader>
          <CardTitle>{dictionary.heading}</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">{dictionary.empty}</p>
          ) : (
            <Table>
              <TableBody>
                {rankedEntries.map((entry) => {
                  const isHighlighted = entry.userId === highlightedUserId;

                  return (
                    <TableRow
                      key={entry.userId}
                      id={`leaderboard-user-${entry.userId}`}
                      className={cn(
                        "scroll-mt-24",
                        isHighlighted &&
                          "bg-amber-50 hover:bg-amber-50 dark:bg-amber-500/10 dark:hover:bg-amber-500/10",
                      )}
                    >
                      <TableCell className={`w-14 font-semibold ${getPlaceClassName(entry.rank)}`}>
                        {entry.rank}
                      </TableCell>
                      <TableCell className="font-medium">
                        <UserProfilePopover
                          lang={lang}
                          profile={entry}
                          dictionary={dictionary.profile}
                          showLeaderboardPlacement
                          showStreak={showStreaks}
                          showAchievements={showAchievements}
                          showPowerups={showPowerups}
                          triggerClassName="h-auto max-w-full gap-3 rounded-lg p-1 pr-2"
                        >
                          <Avatar className="size-8 border border-border bg-background">
                            {entry.profilePicture ? (
                              <AvatarImage src={entry.profilePicture} alt={entry.username} />
                            ) : null}
                            <AvatarFallback aria-hidden>
                              {getUserInitials(entry.username)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="min-w-0 truncate">{entry.username}</span>
                        </UserProfilePopover>
                      </TableCell>
                      {showAchievements ? (
                        <TableCell className="hidden w-40 sm:table-cell">
                          <AchievementStack achievements={entry.achievements} />
                        </TableCell>
                      ) : null}
                      {showStreaks ? (
                        <TableCell className="w-28">
                          <AttendanceStreakIndicator
                            initialCount={entry.attendanceStreak.count}
                            initialHasPendingRecentMeeting={entry.attendanceStreak.hasPendingRecentMeeting}
                            label={dictionary.streakLabel}
                          />
                        </TableCell>
                      ) : null}
                      <TableCell className="w-24 text-right tabular-nums">{entry.totalPoints}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
