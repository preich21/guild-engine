"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { OpenLootboxActionResult } from "@/app/[lang]/user/[uuid]/actions";
import { Button } from "@/components/ui/button";
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
  lootboxOpenError: string;
};

type UserProfilePowerupsProps = {
  lang: Locale;
  userId: string;
  items: PowerupItem[];
  canUsePowerups: boolean;
  dictionary: UserProfilePowerupsDictionary;
  openLootboxAction?: (
    lang: Locale,
    targetUserId: string,
  ) => Promise<OpenLootboxActionResult>;
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

export function UserProfilePowerups({
  lang,
  userId,
  items,
  canUsePowerups,
  dictionary,
  openLootboxAction,
}: UserProfilePowerupsProps) {
  const router = useRouter();
  const [displayItems, setDisplayItems] = useState(items);
  const [selectedPowerup, setSelectedPowerup] = useState<PowerupItem | null>(null);
  const [awardedPowerup, setAwardedPowerup] = useState<PowerupItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isOpening, startOpeningTransition] = useTransition();
  const [error, setError] = useState(false);

  useEffect(() => {
    setDisplayItems(items);
  }, [items]);

  const selectedDisplayPowerup = useMemo(
    () =>
      selectedPowerup
        ? displayItems.find((item) => item.key === selectedPowerup.key) ?? selectedPowerup
        : null,
    [displayItems, selectedPowerup],
  );

  const openPowerupDialog = (powerup: PowerupItem) => {
    setSelectedPowerup(powerup);
    setAwardedPowerup(null);
    setError(false);
    setDialogOpen(true);
  };

  const closeDialog = (nextOpen: boolean) => {
    setDialogOpen(nextOpen);

    if (!nextOpen) {
      setAwardedPowerup(null);
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
            <DialogHeader className="items-start text-left">
              <DialogTitle>{selectedDisplayPowerup.label}</DialogTitle>
              {selectedDisplayPowerup.description ? (
                <DialogDescription>{selectedDisplayPowerup.description}</DialogDescription>
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => closeDialog(false)}>
                {dictionary.cancelPowerupDialogButton}
              </Button>
              <Button
                type="button"
                onClick={handleUseNow}
                disabled={
                  isOpening ||
                  selectedDisplayPowerup.count === 0 ||
                  (selectedDisplayPowerup.imageId === "lootbox" && !openLootboxAction)
                }
              >
                {dictionary.usePowerupNowButton}
              </Button>
            </DialogFooter>

          </DialogContent>
        ) : null}
      </Dialog>
    </TooltipProvider>
  );
}
