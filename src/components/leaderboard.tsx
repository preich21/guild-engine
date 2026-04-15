import type { LeaderboardEntry } from "@/app/[lang]/actions";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";

type LeaderboardProps = {
  entries: LeaderboardEntry[];
  dictionary: {
    heading: string;
    empty: string;
  };
};

const FALLBACK_PROFILE_PICTURE_DATA_URL =
  "data:image/png;base64,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";

const getPlaceClassName = (place: number) => {
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

export function Leaderboard({ entries, dictionary }: LeaderboardProps) {
  const rankedEntries = entries.map((entry, index) => {
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

  return (
    <main className="flex flex-1 justify-center bg-zinc-50 px-4 py-8 dark:bg-black sm:px-6 sm:py-12">
      <Card className="w-full max-w-3xl">
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
                            <AvatarImage src={entry.profilePicture ?? FALLBACK_PROFILE_PICTURE_DATA_URL} alt={entry.username} />
                            <AvatarFallback aria-hidden>{entry.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span>{entry.username}</span>
                        </div>
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

