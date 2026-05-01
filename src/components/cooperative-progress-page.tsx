import type { CooperativeProgress } from "@/app/[lang]/cooperative-progress/actions";
import { CooperativeProgressBar } from "@/components/cooperative-progress-bar";
import { UserProfilePopover } from "@/components/user-profile-popover";
import type { UserProfileDictionary } from "@/components/user-profile-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";
import type { UserProfileData } from "@/lib/user-profile";

type CooperativeProgressPageDictionary = {
  heading: string;
  topContributorsHeading: string;
  emptyContributors: string;
  rankColumn: string;
  userColumn: string;
  pointsColumn: string;
  progressInProgressTooltip: string;
  progressOverGoalTooltip: string;
  profile: UserProfileDictionary;
};

type CooperativeProgressPageProps = {
  lang: Locale;
  progress: CooperativeProgress;
  profileDataByUserId: Record<string, UserProfileData>;
  showLeaderboardPlacement: boolean;
  showStreaks: boolean;
  showAchievements: boolean;
  showPowerups: boolean;
  dictionary: CooperativeProgressPageDictionary;
};

const getUserInitials = (username: string) => username.slice(0, 2).toUpperCase();

export function CooperativeProgressPage({
  lang,
  progress,
  profileDataByUserId,
  showLeaderboardPlacement,
  showStreaks,
  showAchievements,
  showPowerups,
  dictionary,
}: CooperativeProgressPageProps) {
  const numberFormatter = new Intl.NumberFormat(lang);

  return (
    <main className="flex flex-1 justify-center bg-zinc-50 px-4 py-8 dark:bg-black sm:px-6 sm:py-12">
      <div className="flex w-full max-w-4xl flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>{dictionary.heading}</CardTitle>
          </CardHeader>
          <CardContent>
            <CooperativeProgressBar
              lang={lang}
              progress={progress}
              dictionary={{
                inProgressTooltip: dictionary.progressInProgressTooltip,
                overGoalTooltip: dictionary.progressOverGoalTooltip,
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{dictionary.topContributorsHeading}</CardTitle>
          </CardHeader>
          <CardContent>
            {progress.topContributors.length === 0 ? (
              <p className="text-sm text-muted-foreground">{dictionary.emptyContributors}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14">{dictionary.rankColumn}</TableHead>
                    <TableHead>{dictionary.userColumn}</TableHead>
                    <TableHead className="w-24 text-right">{dictionary.pointsColumn}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {progress.topContributors.map((contributor, index) => {
                    const profile = profileDataByUserId[contributor.userId];

                    if (!profile) {
                      return null;
                    }

                    return (
                      <TableRow key={contributor.userId}>
                        <TableCell className="font-semibold text-foreground/80">
                          {numberFormatter.format(index + 1)}
                        </TableCell>
                        <TableCell className="font-medium">
                          <UserProfilePopover
                            lang={lang}
                            profile={profile}
                            dictionary={dictionary.profile}
                            showLeaderboardPlacement={showLeaderboardPlacement}
                            showStreak={showStreaks}
                            showAchievements={showAchievements}
                            showPowerups={showPowerups}
                            triggerClassName="h-auto max-w-full gap-3 rounded-lg p-1 pr-2"
                          >
                            <Avatar className="size-8 border border-border bg-background">
                              {profile.profilePicture ? (
                                <AvatarImage src={profile.profilePicture} alt={profile.username} />
                              ) : null}
                              <AvatarFallback aria-hidden>
                                {getUserInitials(profile.username)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="min-w-0 truncate">{profile.username}</span>
                          </UserProfilePopover>
                        </TableCell>
                        <TableCell
                          className={cn(
                            "w-24 text-right tabular-nums",
                            contributor.totalPoints >= progress.goalPoints &&
                              "font-semibold text-amber-600 dark:text-amber-400",
                          )}
                        >
                          {numberFormatter.format(contributor.totalPoints)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
