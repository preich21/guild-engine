import type { LeaderboardEntry } from "@/app/[lang]/leaderboard/actions";

import { AchievementStack } from "@/components/achievement-stack";
import { AttendanceStreakIndicator } from "@/components/attendance-streak-indicator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";

type LeaderboardProps = {
  entries: LeaderboardEntry[];
  dictionary: {
    heading: string;
    empty: string;
    streakLabel: string;
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

export const withRanking = <T extends { totalPoints: number }>(entries: T[]) =>
  entries.map((entry, index) => {
    let rank = 1;

    for (let i = index - 1; i >= 0; i--) {
      const previousEntry = entries[i];
      if (previousEntry == undefined || previousEntry.totalPoints !== entry.totalPoints) {
        rank = i + 2;
        break;
      }
    }

    return {
      ...entry,
      rank,
    };
  });

export function Leaderboard({ entries, dictionary }: LeaderboardProps) {
  const rankedEntries = withRanking(entries);

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
                  return (
                    <TableRow key={entry.userId}>
                      <TableCell className={`w-14 font-semibold ${getPlaceClassName(entry.rank)}`}>
                        {entry.rank}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-8 border border-border">
                            {entry.profilePicture && <AvatarImage src={entry.profilePicture} alt={entry.username} />}
                            <AvatarFallback aria-hidden>{entry.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span>{entry.username}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden w-40 sm:table-cell">
                        <AchievementStack achievements={entry.achievements} />
                      </TableCell>
                      <TableCell className="w-28">
                        <AttendanceStreakIndicator
                          initialCount={entry.attendanceStreak.count}
                          initialHasPendingRecentMeeting={entry.attendanceStreak.hasPendingRecentMeeting}
                          label={dictionary.streakLabel}
                        />
                      </TableCell>
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
