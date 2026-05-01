"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type {
  FutureGuildMeeting,
  OpenLootboxActionResult,
  UsePowerupActionResult,
} from "@/app/[lang]/user/[uuid]/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ScrollArea,
  ScrollAreaContent,
  ScrollAreaViewport,
  ScrollBar,
} from "@/components/ui/scroll-area";
import type { Locale } from "@/i18n/config";
import { useFeatureSettingValue } from "@/components/feature-config-provider";
import { cn } from "@/lib/utils";
import type { UserProfilePowerups } from "@/lib/user-profile";

export type PowerupItem = {
  key: keyof UserProfilePowerups;
  imageId: string;
  label: string;
  description: string | null;
  count: number;
};

export type UserProfilePowerupsDictionary = {
  cancelPowerupDialogButton: string;
  usePowerupNowButton: string;
  usePowerupButton: string;
  lootboxOpenError: string;
  powerupUseError: string;
  noFutureMeetings: string;
  meetingSelectionLabel: string;
  smallPointMultiplicatorUseDescription: string;
  mediumPointMultiplicatorUseDescription: string;
  largePointMultiplicatorUseDescription: string;
  roleShieldUseDescription: string;
  streakFreezeAutomaticDescription: string;
  pointMultiplicatorAlreadyActivatedTooltip: string;
  roleShieldAlreadyActivatedTooltip: string;
};

type UserProfilePowerupsProps = {
  lang: Locale;
  userId: string;
  items: PowerupItem[];
  canUsePowerups: boolean;
  futureGuildMeetings: FutureGuildMeeting[];
  dictionary: UserProfilePowerupsDictionary;
  openLootboxAction?: (
    lang: Locale,
    targetUserId: string,
  ) => Promise<OpenLootboxActionResult>;
  utilizePowerupAction?: (
    lang: Locale,
    meetingId: string,
    powerupId: string,
  ) => Promise<UsePowerupActionResult>;
};

const getUpdatedItems = (items: PowerupItem[], awardedPowerupId: string) =>
  items.map((item) => {
    if (item.imageId === "lootbox") {
      return { ...item, count: Math.max(0, item.count - 1) };
    }

    if (item.imageId === awardedPowerupId) {
      return { ...item, count: item.count + 1 };
    }

    return item;
  });

const getUsedPowerupItems = (items: PowerupItem[], usedPowerupId: string) =>
  items.map((item) =>
    item.imageId === usedPowerupId ? { ...item, count: Math.max(0, item.count - 1) } : item,
  );

const usablePowerupIds = new Set([
  "small-point-multiplicator",
  "medium-point-multiplicator",
  "large-point-multiplicator",
  "role-shield",
]);

const powerupUseDescriptionKeys = {
  "small-point-multiplicator": "smallPointMultiplicatorUseDescription",
  "medium-point-multiplicator": "mediumPointMultiplicatorUseDescription",
  "large-point-multiplicator": "largePointMultiplicatorUseDescription",
  "role-shield": "roleShieldUseDescription",
} as const satisfies Record<string, keyof UserProfilePowerupsDictionary>;

const pointMultiplicatorPowerupIds = {
  "small-point-multiplicator": true,
  "medium-point-multiplicator": true,
  "large-point-multiplicator": true,
} as const;

const isUsablePowerupId = (
  powerupId: string,
): powerupId is keyof typeof powerupUseDescriptionKeys => powerupId in powerupUseDescriptionKeys;

const isPointMultiplicatorPowerupId = (
  powerupId: string,
): powerupId is keyof typeof pointMultiplicatorPowerupIds => powerupId in pointMultiplicatorPowerupIds;

export function UserProfilePowerups({
  lang,
  userId,
  items,
  canUsePowerups,
  futureGuildMeetings,
  dictionary,
  openLootboxAction,
  utilizePowerupAction,
}: UserProfilePowerupsProps) {
  const router = useRouter();
  const [displayItems, setDisplayItems] = useState(items);
  const [selectedPowerup, setSelectedPowerup] = useState<PowerupItem | null>(null);
  const [awardedPowerup, setAwardedPowerup] = useState<PowerupItem | null>(null);
  const [selectedMeetingId, setSelectedMeetingId] = useState(futureGuildMeetings[0]?.id ?? "");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isOpening, startOpeningTransition] = useTransition();
  const [isUsing, startUsingTransition] = useTransition();
  const [error, setError] = useState(false);
  const configuredAutomaticApplyTimeoutHours = Number(
    useFeatureSettingValue("powerups", "streak-freeze-automatic-apply-timeout"),
  );
  const automaticApplyTimeoutHours =
    Number.isInteger(configuredAutomaticApplyTimeoutHours) && configuredAutomaticApplyTimeoutHours >= 1
      ? configuredAutomaticApplyTimeoutHours
      : 72;

  useEffect(() => {
    setDisplayItems(items);
  }, [items]);

  useEffect(() => {
    if (!futureGuildMeetings.some((meeting) => meeting.id === selectedMeetingId)) {
      setSelectedMeetingId(futureGuildMeetings[0]?.id ?? "");
    }
  }, [futureGuildMeetings, selectedMeetingId]);

  const selectedDisplayPowerup = useMemo(
    () =>
      selectedPowerup
        ? displayItems.find((item) => item.key === selectedPowerup.key) ?? selectedPowerup
        : null,
    [displayItems, selectedPowerup],
  );

  const getMeetingDisabledReason = useCallback(
    (powerupId: string, meeting: FutureGuildMeeting) => {
      if (isPointMultiplicatorPowerupId(powerupId) && meeting.activatedPointMultiplicator) {
        const activatedPowerupLabel =
          displayItems.find((item) => item.imageId === meeting.activatedPointMultiplicator)?.label ??
          meeting.activatedPointMultiplicator;

        return dictionary.pointMultiplicatorAlreadyActivatedTooltip.replace(
          "{powerup}",
          activatedPowerupLabel,
        );
      }

      if (powerupId === "role-shield" && meeting.hasActivatedRoleShield) {
        return dictionary.roleShieldAlreadyActivatedTooltip;
      }

      return null;
    },
    [dictionary, displayItems],
  );

  const getFirstSelectableMeetingId = useCallback(
    (powerupId: string) =>
      futureGuildMeetings.find((meeting) => !getMeetingDisabledReason(powerupId, meeting))?.id ?? "",
    [futureGuildMeetings, getMeetingDisabledReason],
  );

  const openPowerupDialog = (powerup: PowerupItem) => {
    setSelectedPowerup(powerup);
    setAwardedPowerup(null);
    setSelectedMeetingId(getFirstSelectableMeetingId(powerup.imageId));
    setError(false);
    setDialogOpen(true);
  };

  const closeDialog = (nextOpen: boolean) => {
    setDialogOpen(nextOpen);

    if (!nextOpen) {
      setAwardedPowerup(null);
      setSelectedMeetingId(
        selectedDisplayPowerup ? getFirstSelectableMeetingId(selectedDisplayPowerup.imageId) : "",
      );
      setError(false);
    }
  };

  const handleUseNow = () => {
    if (
      !selectedDisplayPowerup ||
      selectedDisplayPowerup.imageId !== "lootbox" ||
      !openLootboxAction
    ) {
      return;
    }

    startOpeningTransition(async () => {
      setError(false);
      setAwardedPowerup(null);

      const result = await openLootboxAction(lang, userId);

      if (result.status === "error") {
        setError(true);
        return;
      }

      const awardedItem =
        displayItems.find((item) => item.imageId === result.awardedPowerupId) ?? null;

      setDisplayItems((currentItems) =>
        getUpdatedItems(currentItems, result.awardedPowerupId),
      );
      setAwardedPowerup(awardedItem);
      router.refresh();
    });
  };

  const handleUsePowerup = () => {
    if (
      !selectedDisplayPowerup ||
      !isUsablePowerupId(selectedDisplayPowerup.imageId) ||
      !selectedMeetingId ||
      !utilizePowerupAction
    ) {
      return;
    }

    startUsingTransition(async () => {
      setError(false);

      const result = await utilizePowerupAction(lang, selectedMeetingId, selectedDisplayPowerup.imageId);

      if (result.status === "error") {
        setError(true);
        return;
      }

      setDisplayItems((currentItems) =>
        getUsedPowerupItems(currentItems, selectedDisplayPowerup.imageId),
      );
      router.refresh();
      closeDialog(false);
    });
  };

  const formatMeetingTimestamp = (timestamp: string) => {
    const parsed = new Date(timestamp);

    if (Number.isNaN(parsed.getTime())) {
      return timestamp;
    }

    return new Intl.DateTimeFormat(lang, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(parsed);
  };

  const selectedMeetingIsDisabled =
    selectedDisplayPowerup && selectedMeetingId
      ? Boolean(
          futureGuildMeetings.find(
            (meeting) =>
              meeting.id === selectedMeetingId &&
              getMeetingDisabledReason(selectedDisplayPowerup.imageId, meeting),
          ),
        )
      : false;
  const selectedPowerupIsStreakFreeze = selectedDisplayPowerup?.imageId === "streak-freeze";

  useEffect(() => {
    if (!selectedDisplayPowerup || !isUsablePowerupId(selectedDisplayPowerup.imageId)) {
      return;
    }

    const selectedMeeting = futureGuildMeetings.find((meeting) => meeting.id === selectedMeetingId);

    if (
      !selectedMeeting ||
      getMeetingDisabledReason(selectedDisplayPowerup.imageId, selectedMeeting)
    ) {
      setSelectedMeetingId(getFirstSelectableMeetingId(selectedDisplayPowerup.imageId));
    }
  }, [
    futureGuildMeetings,
    getFirstSelectableMeetingId,
    getMeetingDisabledReason,
    selectedDisplayPowerup,
    selectedMeetingId,
  ]);

  return (
    <TooltipProvider>
      <ScrollArea className="w-full">
        <ScrollAreaViewport>
          <ScrollAreaContent className="flex min-w-max gap-3 pb-3">
            {displayItems.map((powerup) => {
              const isEmpty = powerup.count === 0;
              const tile = (
                <div
                  className={cn(
                    "relative flex size-24 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/30 p-3 shadow-sm transition-opacity sm:size-28",
                    isEmpty && "opacity-45 grayscale",
                  )}
                  aria-label={powerup.label}
                >
                  <Image
                    src={`/powerups/${powerup.imageId}.png`}
                    alt=""
                    fill
                    sizes="80px"
                    className="p-3 object-contain"
                  />
                  <span
                    className={cn(
                      "absolute right-2 top-2 min-w-6 rounded-full border border-border bg-background px-1.5 py-0.5 text-center text-xs font-semibold leading-none text-foreground shadow-sm tabular-nums",
                      isEmpty && "text-muted-foreground",
                    )}
                  >
                    {powerup.count}
                  </span>
                </div>
              );

              return (
                <Tooltip key={powerup.key}>
                  <TooltipTrigger
                    render={
                      canUsePowerups ? (
                        <button
                          type="button"
                          className="rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                          onClick={() => openPowerupDialog(powerup)}
                          aria-label={powerup.label}
                        >
                          {tile}
                        </button>
                      ) : (
                        tile
                      )
                    }
                  />
                  <TooltipContent>
                    <div className="space-y-1">
                      <p className="font-medium">{powerup.label}</p>
                      {powerup.description ? (
                        <p className="text-background/80">{powerup.description}</p>
                      ) : null}
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </ScrollAreaContent>
        </ScrollAreaViewport>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        {selectedDisplayPowerup ? (
          <DialogContent className="w-[min(95vw,38rem)]">
            {isUsablePowerupId(selectedDisplayPowerup.imageId) ? (
              <>
                <div className="flex items-start justify-between gap-4">
                  <DialogHeader className="min-w-0 flex-1 items-start text-left">
                    <DialogTitle>{selectedDisplayPowerup.label}</DialogTitle>
                    {selectedDisplayPowerup.description ? (
                      <DialogDescription>{selectedDisplayPowerup.description}</DialogDescription>
                    ) : null}
                  </DialogHeader>

                  <div
                    className={cn(
                      "relative flex size-20 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/30 p-3 shadow-sm sm:size-24",
                      selectedDisplayPowerup.count === 0 && "opacity-45 grayscale",
                    )}
                    aria-label={selectedDisplayPowerup.label}
                  >
                    <Image
                      src={`/powerups/${selectedDisplayPowerup.imageId}.png`}
                      alt=""
                      fill
                      sizes="96px"
                      className="p-3 object-contain"
                      priority
                    />
                    <span
                      className={cn(
                        "absolute right-2 top-2 min-w-6 rounded-full border border-border bg-background px-1.5 py-0.5 text-center text-xs font-semibold leading-none text-foreground shadow-sm tabular-nums",
                        selectedDisplayPowerup.count === 0 && "text-muted-foreground",
                      )}
                    >
                      {selectedDisplayPowerup.count}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 py-2">
                  <p className="text-sm leading-6 text-muted-foreground">
                    {dictionary[powerupUseDescriptionKeys[selectedDisplayPowerup.imageId]]}
                  </p>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">
                      {dictionary.meetingSelectionLabel}
                    </p>
                    {futureGuildMeetings.length === 0 ? (
                      <p className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                        {dictionary.noFutureMeetings}
                      </p>
                    ) : (
                      <RadioGroup
                        value={selectedMeetingId}
                        onValueChange={setSelectedMeetingId}
                        className="max-h-64 overflow-y-auto rounded-lg border border-border p-3"
                      >
                        {futureGuildMeetings.map((meeting) => {
                          const optionId = `powerup-meeting-${meeting.id}`;
                          const disabledReason = getMeetingDisabledReason(
                            selectedDisplayPowerup.imageId,
                            meeting,
                          );
                          const option = (
                            <Label
                              key={meeting.id}
                              htmlFor={optionId}
                              className={cn(
                                "flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2",
                                disabledReason
                                  ? "cursor-not-allowed opacity-55"
                                  : "cursor-pointer",
                              )}
                            >
                              <RadioGroupItem
                                id={optionId}
                                value={meeting.id}
                                disabled={Boolean(disabledReason)}
                                className="size-5"
                              />
                              <span className="flex flex-col gap-0.5">
                                <span className="text-sm text-foreground">
                                  {formatMeetingTimestamp(meeting.timestamp)}
                                </span>
                                <span className="font-mono text-xs text-muted-foreground">
                                  {meeting.id}
                                </span>
                              </span>
                            </Label>
                          );

                          return disabledReason ? (
                            <Tooltip key={meeting.id}>
                              <TooltipTrigger render={option} />
                              <TooltipContent>{disabledReason}</TooltipContent>
                            </Tooltip>
                          ) : (
                            option
                          );
                        })}
                      </RadioGroup>
                    )}
                  </div>
                </div>

                {error ? (
                  <p className="text-sm text-destructive">{dictionary.powerupUseError}</p>
                ) : null}
              </>
            ) : (
              <>
                <DialogHeader className="items-start text-left">
                  <DialogTitle>{selectedDisplayPowerup.label}</DialogTitle>
                  {selectedDisplayPowerup.description || selectedPowerupIsStreakFreeze ? (
                    <DialogDescription className="space-y-2">
                      {selectedDisplayPowerup.description ? (
                        <span className="block">{selectedDisplayPowerup.description}</span>
                      ) : null}
                      {selectedPowerupIsStreakFreeze ? (
                        <span className="block">
                          {dictionary.streakFreezeAutomaticDescription.replace(
                            "{hours}",
                            String(automaticApplyTimeoutHours),
                          )}
                        </span>
                      ) : null}
                    </DialogDescription>
                  ) : null}
                </DialogHeader>

                <div className="flex min-h-72 items-center justify-center py-6">
                  <div className="relative">
                    <div
                      className={cn(
                        "relative flex size-48 items-center justify-center rounded-lg border border-border bg-muted/30 p-8 shadow-sm sm:size-64",
                        isOpening && selectedDisplayPowerup.imageId === "lootbox" && "animate-bounce",
                        (selectedDisplayPowerup.count === 0 || awardedPowerup) && "opacity-45 grayscale",
                      )}
                      aria-label={selectedDisplayPowerup.label}
                    >
                      <Image
                        src={`/powerups/${selectedDisplayPowerup.imageId}.png`}
                        alt=""
                        fill
                        sizes="192px"
                        className="p-8 object-contain"
                        priority
                      />
                      <span
                        className={cn(
                          "absolute right-4 top-4 min-w-10 rounded-full border border-border bg-background px-2 py-1 text-center text-base font-semibold leading-none text-foreground shadow-sm tabular-nums",
                          (selectedDisplayPowerup.count === 0 || awardedPowerup) && "text-muted-foreground",
                        )}
                      >
                        {selectedDisplayPowerup.count}
                      </span>
                    </div>

                    {isOpening && selectedDisplayPowerup.imageId === "lootbox" ? (
                      <div className="pointer-events-none absolute inset-8 rounded-full bg-primary/20 animate-ping" />
                    ) : null}

                    {awardedPowerup ? (
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
                              <div className="relative size-36 animate-in zoom-in-95 sm:size-44">
                                <Image
                                  src={`/powerups/${awardedPowerup.imageId}.png`}
                                  alt=""
                                  fill
                                  sizes="176px"
                                  className="object-contain drop-shadow-lg"
                                />
                              </div>
                            </div>
                          }
                        />
                        <TooltipContent>
                          <div className="space-y-1">
                            <p className="font-medium">{awardedPowerup.label}</p>
                            {awardedPowerup.description ? (
                              <p className="text-background/80">{awardedPowerup.description}</p>
                            ) : null}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ) : null}
                  </div>
                </div>

                {error ? (
                  <p className="text-sm text-destructive">{dictionary.lootboxOpenError}</p>
                ) : null}
              </>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => closeDialog(false)}>
                {dictionary.cancelPowerupDialogButton}
              </Button>
              {selectedPowerupIsStreakFreeze ? null : (
                <Button
                  type="button"
                  onClick={
                    isUsablePowerupId(selectedDisplayPowerup.imageId)
                      ? handleUsePowerup
                      : handleUseNow
                  }
                  disabled={
                    isOpening ||
                    isUsing ||
                    selectedDisplayPowerup.count === 0 ||
                    (selectedDisplayPowerup.imageId === "lootbox" && !openLootboxAction) ||
                    (usablePowerupIds.has(selectedDisplayPowerup.imageId) &&
                      (!utilizePowerupAction ||
                        !selectedMeetingId ||
                        selectedMeetingIsDisabled ||
                        futureGuildMeetings.length === 0))
                  }
                >
                  {isUsablePowerupId(selectedDisplayPowerup.imageId)
                    ? dictionary.usePowerupButton
                    : dictionary.usePowerupNowButton}
                </Button>
              )}
            </DialogFooter>

          </DialogContent>
        ) : null}
      </Dialog>
    </TooltipProvider>
  );
}
