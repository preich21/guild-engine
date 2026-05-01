import type {
  TeamLeaderboardConfig,
  TeamLeaderboardEntry,
} from "@/app/[lang]/leaderboard/actions";
import { getPlaceClassName } from "@/components/leaderboard";
import { UserProfilePopover } from "@/components/user-profile-popover";
import type { UserProfileDictionary } from "@/components/user-profile-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import type { Locale } from "@/i18n/config";
import { rankLeaderboardEntries } from "@/lib/leaderboard-ranking";
import type { UserProfileData } from "@/lib/user-profile";

type TeamLeaderboardProps = {
  lang: Locale;
  config: TeamLeaderboardConfig;
  entries: TeamLeaderboardEntry[];
  profileDataByUserId: Record<string, UserProfileData>;
  showLeaderboardPlacement: boolean;
  showStreaks: boolean;
  showAchievements: boolean;
  showPowerups: boolean;
  enabledPowerupIds: string[];
  dictionary: {
    heading: string;
    empty: string;
    profile: UserProfileDictionary;
  };
};

export function TeamLeaderboard({
  lang,
  entries,
  profileDataByUserId,
  showLeaderboardPlacement,
  showStreaks,
  showAchievements,
  showPowerups,
  enabledPowerupIds,
  dictionary,
}: TeamLeaderboardProps) {
  const rankedEntries = rankLeaderboardEntries(entries);

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
                            {entry.members.map((member) => {
                              const profile = profileDataByUserId[member.userId];

                              return profile ? (
                                <UserProfilePopover
                                  key={member.userId}
                                  lang={lang}
                                  profile={profile}
                                  dictionary={dictionary.profile}
                                  showLeaderboardPlacement={showLeaderboardPlacement}
                                  showStreak={showStreaks}
                                  showAchievements={showAchievements}
                                  showPowerups={showPowerups}
                                  enabledPowerupIds={enabledPowerupIds}
                                  triggerClassName="-ml-2 first:ml-0 size-8 rounded-full"
                                  avatarClassName="size-8"
                                />
                              ) : null;
                            })}
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
