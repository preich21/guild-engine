import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Flame } from "lucide-react";

import { AchievementStack } from "@/components/achievement-stack";
import { LevelBar } from "@/components/level-bar";
import {
  UserProfileEditDialog,
  type UserProfileEditDictionary,
} from "@/components/user-profile-edit-dialog";
import {
  UserProfilePowerups as UserProfilePowerupsList,
  type PowerupItem,
  type UserProfilePowerupsDictionary,
} from "@/components/user-profile-powerups";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import type {
  FutureGuildMeeting,
  OpenLootboxActionResult,
  ProfileEditTeam,
  RolePresentReceiver,
  SaveProfileActionState,
  UsePowerupActionResult,
  UsePowerupSettings,
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
import featureConfiguration from "@/config/feature-configuration.json";
import type { Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";
import type { UserProfileData, UserProfilePowerups } from "@/lib/user-profile";
import { getStreakCardClassName, getStreakDisplayState } from "@/lib/streak-ui";

export type UserProfileDictionary = {
  heading: string;
  placementLabel: string;
  placementTooltip: string;
  placementLinkLabel: string;
  levelLabel: string;
  levelProgressTooltip: string;
  streakLabel: string;
  achievementsHeading: string;
  achievementsEmpty: string;
  showAllAchievementsButton: string;
  allAchievementsTitle: string;
  allAchievementsDescription: string;
  allAchievementsEmpty: string;
  powerupsHeading: string;
  lootboxLabel: string;
  lootboxDescription: string;
  powerupsDialog: UserProfilePowerupsDictionary;
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

type UserProfilePowerupsProps = {
  canUsePowerups: boolean;
  futureGuildMeetings: FutureGuildMeeting[];
  rolePresentReceivers: RolePresentReceiver[];
  openLootboxAction?: (
    lang: Locale,
    targetUserId: string,
  ) => Promise<OpenLootboxActionResult>;
  utilizePowerupAction?: (
    lang: Locale,
    meetingId: string,
    powerupId: string,
    settings?: UsePowerupSettings,
  ) => Promise<UsePowerupActionResult>;
};

type UserProfileCardProps = {
  lang: Locale;
  profile: UserProfileData;
  dictionary: UserProfileDictionary;
  mode?: "page" | "popover";
  showLeaderboardPlacement: boolean;
  showStreak: boolean;
  showAchievements: boolean;
  showPowerups: boolean;
  enabledPowerupIds: string[];
  edit?: UserProfileEditProps;
  powerups?: UserProfilePowerupsProps;
};

type PowerupConfigurationEntry = {
  id: string;
  label?: Partial<Record<Locale, string>>;
  description?: Partial<Record<Locale, string>>;
};

const powerupConfiguration = featureConfiguration.features.find(
  (feature) => feature.id === "powerups",
)?.configuration as PowerupConfigurationEntry[] | undefined;

const getPowerupDisplayName = (powerupId: string, lang: Locale) =>
  powerupConfiguration?.find((entry) => entry.id === powerupId)?.label?.[lang] ?? powerupId;

const getPowerupDescription = (powerupId: string, lang: Locale) =>
  powerupConfiguration?.find((entry) => entry.id === powerupId)?.description?.[lang] ?? null;

const getPowerupItems = (
  powerups: UserProfilePowerups,
  lang: Locale,
  dictionary: UserProfileDictionary,
  enabledPowerupIds: string[],
) => {
  const orderedPowerups: PowerupItem[] = [
    {
      key: "lootboxes",
      imageId: "lootbox",
      label: dictionary.lootboxLabel,
      description: dictionary.lootboxDescription,
      count: powerups.lootboxes,
    },
    {
      key: "streakFreezes",
      imageId: "streak-freeze",
      label: getPowerupDisplayName("streak-freeze", lang),
      description: getPowerupDescription("streak-freeze", lang),
      count: powerups.streakFreezes,
    },
    {
      key: "smallPointMultiplicators",
      imageId: "small-point-multiplicator",
      label: getPowerupDisplayName("small-point-multiplicator", lang),
      description: getPowerupDescription("small-point-multiplicator", lang),
      count: powerups.smallPointMultiplicators,
    },
    {
      key: "mediumPointMultiplicators",
      imageId: "medium-point-multiplicator",
      label: getPowerupDisplayName("medium-point-multiplicator", lang),
      description: getPowerupDescription("medium-point-multiplicator", lang),
      count: powerups.mediumPointMultiplicators,
    },
    {
      key: "largePointMultiplicators",
      imageId: "large-point-multiplicator",
      label: getPowerupDisplayName("large-point-multiplicator", lang),
      description: getPowerupDescription("large-point-multiplicator", lang),
      count: powerups.largePointMultiplicators,
    },
    {
      key: "roleShields",
      imageId: "role-shield",
      label: getPowerupDisplayName("role-shield", lang),
      description: getPowerupDescription("role-shield", lang),
      count: powerups.roleShields,
    },
    {
      key: "rolePresents",
      imageId: "role-present",
      label: getPowerupDisplayName("role-present", lang),
      description: getPowerupDescription("role-present", lang),
      count: powerups.rolePresents,
    },
  ];

  return orderedPowerups
    .filter((powerup) => powerup.imageId === "lootbox" || enabledPowerupIds.includes(powerup.imageId))
    .sort((first, second) => Number(second.count > 0) - Number(first.count > 0));
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

const getUserInitials = (username: string) => username.slice(0, 2).toUpperCase();

export function UserProfileCard({
  lang,
  profile,
  dictionary,
  mode = "page",
  showLeaderboardPlacement,
  showStreak,
  showAchievements,
  showPowerups,
  enabledPowerupIds,
  edit,
  powerups,
}: UserProfileCardProps) {
  const earnedAchievementIds = new Set(profile.achievements.map((achievement) => achievement.id));
  const leaderboardHref = `/${lang}/leaderboard/individual?highlight=${profile.userId}#leaderboard-user-${profile.userId}`;
  const fullProfileHref = `/${lang}/user/${profile.userId}`;
  const powerupItems = getPowerupItems(profile.powerups, lang, dictionary, enabledPowerupIds);
  const streakDisplayState = getStreakDisplayState({
    count: profile.attendanceStreak.count,
    hasPendingRecentMeeting: profile.attendanceStreak.hasPendingRecentMeeting,
    latestMeetingWasStreakFreeze: profile.attendanceStreak.latestMeetingWasStreakFreeze,
  });

  return (
    <section className={cn("space-y-6 p-4 sm:p-6", mode === "page" && "px-0 py-0")}>
      <h1 className="sr-only">{dictionary.heading.replace("{username}", profile.username)}</h1>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar className="size-20 border border-border bg-background shadow-sm sm:size-24">
            {profile.profilePicture ? (
              <AvatarImage src={profile.profilePicture} alt={profile.username} />
            ) : null}
            <AvatarFallback className="text-lg font-semibold">
              {getUserInitials(profile.username)}
            </AvatarFallback>
          </Avatar>

          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
            <p className="truncate text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {profile.username}
            </p>
            {profile.levelProgress ? (
              <LevelBar
                lang={lang}
                progress={profile.levelProgress}
                dictionary={{
                  levelLabel: dictionary.levelLabel,
                  progressTooltip: dictionary.levelProgressTooltip,
                }}
                className="w-full max-w-xs sm:w-56"
              />
            ) : null}
          </div>
        </div>

        <div className="flex w-full min-w-0 items-start justify-end gap-3 sm:w-auto">
          {mode === "popover" ? (
            <Button
              variant="ghost"
              size="icon-sm"
              nativeButton={false}
              render={<Link href={fullProfileHref} />}
              aria-label={dictionary.openProfilePage}
              title={dictionary.openProfilePage}
              className="shrink-0"
            >
              <ExternalLink aria-hidden="true" />
            </Button>
          ) : edit ? (
            <div className="shrink-0">
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
            </div>
          ) : null}
        </div>
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
                getStreakCardClassName(streakDisplayState, profile.attendanceStreak.count),
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
                  <DialogHeader className="gap-2 mb-4">
                    <DialogTitle>{dictionary.allAchievementsTitle}</DialogTitle>
                    <DialogDescription>{dictionary.allAchievementsDescription}</DialogDescription>
                  </DialogHeader>

                  {profile.allAchievements.length === 0 ? (
                    <p className="rounded-lg border border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
                      {dictionary.allAchievementsEmpty}
                    </p>
                  ) : (
                    <ScrollArea className="max-h-[60vh]">
                      <ScrollAreaViewport className="max-h-[60vh]">
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

      {showPowerups ? (
        <Card className="shadow-md ring-1 ring-foreground/10">
          <CardHeader>
            <CardTitle>{dictionary.powerupsHeading}</CardTitle>
          </CardHeader>
          <CardContent>
            <UserProfilePowerupsList
              lang={lang}
              userId={profile.userId}
              items={powerupItems}
              canUsePowerups={powerups?.canUsePowerups ?? false}
              futureGuildMeetings={powerups?.futureGuildMeetings ?? []}
              rolePresentReceivers={powerups?.rolePresentReceivers ?? []}
              dictionary={dictionary.powerupsDialog}
              openLootboxAction={powerups?.openLootboxAction}
              utilizePowerupAction={powerups?.utilizePowerupAction}
            />
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}
