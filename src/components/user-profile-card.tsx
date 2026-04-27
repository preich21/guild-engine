import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Flame } from "lucide-react";

import { AchievementStack } from "@/components/achievement-stack";
import {
  UserProfileEditDialog,
  type UserProfileEditDictionary,
} from "@/components/user-profile-edit-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import type {
  ProfileEditTeam,
  SaveProfileActionState,
} from "@/app/[lang]/user/[uuid]/actions";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ScrollArea,
  ScrollAreaContent,
  ScrollAreaViewport,
  ScrollBar,
} from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";
import type { UserProfileData } from "@/lib/user-profile";

export type UserProfileDictionary = {
  heading: string;
  placementLabel: string;
  placementTooltip: string;
  placementLinkLabel: string;
  streakLabel: string;
  achievementsHeading: string;
  achievementsEmpty: string;
  showAllAchievementsButton: string;
  allAchievementsTitle: string;
  allAchievementsDescription: string;
  allAchievementsEmpty: string;
  openProfileButton: string;
  openProfilePage: string;
  edit: UserProfileEditDictionary;
};

type UserProfileEditProps = {
  teams: ProfileEditTeam[];
  action: (
    state: SaveProfileActionState,
    formData: FormData,
  ) => Promise<SaveProfileActionState>;
};

type UserProfileCardProps = {
  lang: Locale;
  profile: UserProfileData;
  dictionary: UserProfileDictionary;
  mode?: "page" | "popover";
  showLeaderboardPlacement: boolean;
  showStreak: boolean;
  showAchievements: boolean;
  edit?: UserProfileEditProps;
};

const getPlacementCardClassName = (rank: number) => {
  if (rank === 1) {
    return "bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500 text-zinc-950 dark:from-amber-200 dark:via-yellow-300 dark:to-amber-400 dark:text-white";
  }

  if (rank === 2) {
    return "bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 text-zinc-950 dark:from-slate-300 dark:via-slate-400 dark:to-slate-500 dark:text-white";
  }

  if (rank === 3) {
    return "bg-gradient-to-br from-orange-300 via-amber-500 to-orange-700 text-zinc-950 dark:from-orange-300 dark:via-amber-400 dark:to-orange-600 dark:text-white";
  }

  return "bg-gradient-to-br from-zinc-200 via-zinc-300 to-zinc-400 text-zinc-950 dark:from-zinc-700 dark:via-zinc-800 dark:to-zinc-900 dark:text-white";
};

const getStreakCardClassName = (count: number, hasPendingRecentMeeting: boolean) => {
  if (count > 0 && !hasPendingRecentMeeting) {
    return "bg-gradient-to-br from-orange-400 via-orange-500 to-amber-500 text-zinc-950 dark:from-orange-400 dark:via-orange-500 dark:to-amber-500 dark:text-white";
  }

  return "bg-gradient-to-br from-zinc-200 via-zinc-300 to-zinc-400 text-zinc-950 dark:from-zinc-700 dark:via-zinc-800 dark:to-zinc-900 dark:text-white";
};

const getUserInitials = (username: string) => username.slice(0, 2).toUpperCase();

export function UserProfileCard({
  lang,
  profile,
  dictionary,
  mode = "page",
  showLeaderboardPlacement,
  showStreak,
  showAchievements,
  edit,
}: UserProfileCardProps) {
  const earnedAchievementIds = new Set(profile.achievements.map((achievement) => achievement.id));
  const leaderboardHref = `/${lang}/leaderboard/individual?highlight=${profile.userId}#leaderboard-user-${profile.userId}`;
  const fullProfileHref = `/${lang}/user/${profile.userId}`;

  return (
    <section className={cn("space-y-6 p-4 sm:p-6", mode === "page" && "px-0 py-0")}>
      <h1 className="sr-only">{dictionary.heading.replace("{username}", profile.username)}</h1>

      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar className="size-20 border border-border bg-background shadow-sm sm:size-24">
            {profile.profilePicture ? (
              <AvatarImage src={profile.profilePicture} alt={profile.username} />
            ) : null}
            <AvatarFallback className="text-lg font-semibold">
              {getUserInitials(profile.username)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0">
            <p className="truncate text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {profile.username}
            </p>
          </div>
        </div>

        {mode === "popover" ? (
          <Button
            variant="ghost"
            size="icon-sm"
            nativeButton={false}
            render={<Link href={fullProfileHref} />}
            aria-label={dictionary.openProfilePage}
            title={dictionary.openProfilePage}
          >
            <ExternalLink aria-hidden="true" />
          </Button>
        ) : edit ? (
          <UserProfileEditDialog
            lang={lang}
            userId={profile.userId}
            username={profile.username}
            profilePicture={profile.profilePicture}
            description={profile.description}
            teamId={profile.teamId}
            teams={edit.teams}
            dictionary={dictionary.edit}
            action={edit.action}
          />
        ) : null}
      </div>

      {profile.description ? (
        <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground sm:text-base">
          {profile.description}
        </p>
      ) : null}

      {showLeaderboardPlacement || showStreak ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {showLeaderboardPlacement ? (
            <Card className={cn("border-0 shadow-lg ring-1 ring-black/5", getPlacementCardClassName(profile.rank))}>
              <CardContent className="flex min-h-40 flex-col justify-between p-6">
                <p className="text-sm font-semibold opacity-80">{dictionary.placementLabel}</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Link
                          href={leaderboardHref}
                          className={cn(
                            buttonVariants({ variant: "ghost" }),
                            "h-auto w-fit px-0 py-0 text-5xl font-black tracking-tight text-current hover:bg-transparent hover:text-current focus-visible:ring-background/30 sm:text-6xl",
                          )}
                          aria-label={dictionary.placementLinkLabel}
                          title={dictionary.placementLinkLabel}
                        >
                          #{profile.rank}
                        </Link>
                      }
                    />
                    <TooltipContent>{dictionary.placementTooltip}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardContent>
            </Card>
          ) : null}

          {showStreak ? (
            <Card
              className={cn(
                "border-0 shadow-lg ring-1 ring-black/5",
                getStreakCardClassName(
                  profile.attendanceStreak.count,
                  profile.attendanceStreak.hasPendingRecentMeeting,
                ),
              )}
            >
              <CardContent className="flex min-h-40 flex-col justify-between p-6">
                <p className="text-sm font-semibold opacity-80">{dictionary.streakLabel}</p>
                <div className="flex items-center gap-3 text-5xl font-black tracking-tight sm:text-6xl">
                  <Flame aria-hidden="true" className="size-10 sm:size-12" />
                  <span>{profile.attendanceStreak.count}</span>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}

      {showAchievements ? (
        <Card className="shadow-md ring-1 ring-foreground/10">
          <CardHeader>
            <CardTitle>{dictionary.achievementsHeading}</CardTitle>
            <CardAction>
              <Dialog>
                <DialogTrigger
                  render={
                    <Button type="button" variant="outline" className="w-full sm:w-auto">
                      {dictionary.showAllAchievementsButton}
                    </Button>
                  }
                />
                <DialogContent className="w-[min(95vw,42rem)]">
                  <DialogHeader>
                    <DialogTitle>{dictionary.allAchievementsTitle}</DialogTitle>
                    <DialogDescription>{dictionary.allAchievementsDescription}</DialogDescription>
                  </DialogHeader>

                  {profile.allAchievements.length === 0 ? (
                    <p className="rounded-lg border border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
                      {dictionary.allAchievementsEmpty}
                    </p>
                  ) : (
                    <ScrollArea className="max-h-[60vh]">
                      <ScrollAreaViewport>
                        <ScrollAreaContent className="space-y-3 pr-4">
                          {profile.allAchievements.map((achievement) => {
                            const isEarned = earnedAchievementIds.has(achievement.id);

                            return (
                              <div
                                key={achievement.id}
                                className="flex items-start gap-3 rounded-xl border border-border/70 bg-muted/30 p-3"
                              >
                                <div
                                  className={cn(
                                    "relative size-14 shrink-0 overflow-hidden rounded-xl border border-border bg-background shadow-sm",
                                    !isEarned && "grayscale opacity-50",
                                  )}
                                >
                                  <Image
                                    src={achievement.image}
                                    alt=""
                                    fill
                                    sizes="56px"
                                    unoptimized
                                    className="object-cover"
                                  />
                                </div>
                                <div className="min-w-0 space-y-1">
                                  <p className="font-medium text-foreground">{achievement.title}</p>
                                  {achievement.description ? (
                                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                                      {achievement.description}
                                    </p>
                                  ) : null}
                                </div>
                              </div>
                            );
                          })}
                        </ScrollAreaContent>
                      </ScrollAreaViewport>
                      <ScrollBar orientation="vertical" />
                    </ScrollArea>
                  )}
                </DialogContent>
              </Dialog>
            </CardAction>
          </CardHeader>
          <CardContent>
            <AchievementStack
              achievements={profile.achievements}
              emptyLabel={dictionary.achievementsEmpty}
            />
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}
