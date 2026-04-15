import type { TeamLeaderboardEntry } from "@/app/[lang]/leaderboard/actions";
import {
  getPlaceClassName,
  withRanking,
} from "@/components/leaderboard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";

type TeamLeaderboardProps = {
  entries: TeamLeaderboardEntry[];
  dictionary: {
    heading: string;
    empty: string;
  };
};

export function TeamLeaderboard({ entries, dictionary }: TeamLeaderboardProps) {
  const rankedEntries = withRanking(entries);

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
                    <TableRow key={entry.teamId}>
                      <TableCell className={`w-14 font-semibold ${getPlaceClassName(entry.rank)}`}>
                        {entry.rank}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <div className="flex -space-x-2">
                            {entry.members.map((member) => (
                              <Avatar key={member.userId} className="size-8 border border-border bg-background">
                                {member.profilePicture && <AvatarImage
                                    src={member.profilePicture}
                                    alt={member.username}
                                />}
                                <AvatarFallback aria-hidden>
                                  {member.username.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                          </div>
                          <span>{entry.teamName}</span>
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
