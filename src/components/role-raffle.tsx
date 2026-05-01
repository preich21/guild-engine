"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import { useFeatureEnabled } from "@/components/feature-config-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea, ScrollAreaContent, ScrollAreaViewport, ScrollBar } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { RoleRaffleUser } from "@/lib/role-raffle";

type RoleRaffleProps = {
  users: RoleRaffleUser[];
  dictionary: {
    heading: string;
    selectUsersButton: string;
    spinButton: string;
    selectUsersTitle: string;
    selectUsersDescription: string;
    selectAllButton: string;
    deselectAllButton: string;
    roleShieldDisabledTooltip: string;
    cancelButton: string;
    selectButton: string;
    emptyState: string;
    winnerTitle: string;
    winnerDescription: string;
    winnerPointSystemDescription: string;
    dismissButton: string;
  };
};

const WHEEL_COLORS = [
  "#b7c0cb",
  "#d4dae1",
  "#aeb9c6",
  "#c5ced7",
  "#9eabb9",
  "#dce2e7",
];

const WHEEL_SIZE = 480;
const WHEEL_CENTER = WHEEL_SIZE / 2;
const WHEEL_RADIUS = 220;
const WHEEL_LABEL_RADIUS = 145;
const SPIN_DURATION_MS = 4_200;

const polarToCartesian = (angleDegrees: number, radius: number) => {
  const angleRadians = ((angleDegrees - 90) * Math.PI) / 180;

  return {
    x: WHEEL_CENTER + radius * Math.cos(angleRadians),
    y: WHEEL_CENTER + radius * Math.sin(angleRadians),
  };
};

const getSegmentPath = (startAngle: number, endAngle: number) => {
  const start = polarToCartesian(startAngle, WHEEL_RADIUS);
  const end = polarToCartesian(endAngle, WHEEL_RADIUS);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${WHEEL_CENTER} ${WHEEL_CENTER}`,
    `L ${start.x} ${start.y}`,
    `A ${WHEEL_RADIUS} ${WHEEL_RADIUS} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
    "Z",
  ].join(" ");
};

const getRandomIndex = (length: number) => Math.floor(Math.random() * length);

export function RoleRaffle({ users, dictionary }: RoleRaffleProps) {
  const [isSelectionOpen, setIsSelectionOpen] = useState(false);
  const [isWinnerOpen, setIsWinnerOpen] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [draftSelectedUserIds, setDraftSelectedUserIds] = useState<string[]>([]);
  const [mustSpin, setMustSpin] = useState(false);
  const [rotationDegrees, setRotationDegrees] = useState(0);
  const [winnerName, setWinnerName] = useState("");
  const spinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingWinnerNameRef = useRef<string | null>(null);
  const checkboxBaseId = useId();
  const isPointSystemEnabled = useFeatureEnabled("point-system");
  const enabledUsers = useMemo(() => users.filter((user) => !user.isRoleShielded), [users]);
  const enabledUserIds = useMemo(() => new Set(enabledUsers.map((user) => user.id)), [enabledUsers]);

  const selectedUsers = useMemo(() => {
    const selectedIdSet = new Set(selectedUserIds);
    return enabledUsers.filter((user) => selectedIdSet.has(user.id));
  }, [enabledUsers, selectedUserIds]);

  const wheelData = useMemo(
    () =>
      selectedUsers.map((user, index) => ({
        id: user.id,
        label: user.username,
        color: WHEEL_COLORS[index % WHEEL_COLORS.length],
      })),
    [selectedUsers],
  );

  const allSelected = enabledUsers.length > 0 && draftSelectedUserIds.length === enabledUsers.length;
  const canSelectDraftUsers = draftSelectedUserIds.length >= 2;
  const canSpin = selectedUsers.length >= 2 && !mustSpin;

  useEffect(
    () => () => {
      if (spinTimeoutRef.current) {
        clearTimeout(spinTimeoutRef.current);
      }
    },
    [],
  );

  const toggleDraftUser = (userId: string, checked: boolean | "indeterminate") => {
    if (!enabledUserIds.has(userId)) {
      return;
    }

    setDraftSelectedUserIds((current) => {
      const nextSet = new Set(current);

      if (checked) {
        nextSet.add(userId);
      } else {
        nextSet.delete(userId);
      }

      return enabledUsers
        .filter((user) => nextSet.has(user.id))
        .map((user) => user.id);
    });
  };

  const handleToggleAll = () => {
    setDraftSelectedUserIds(allSelected ? [] : enabledUsers.map((user) => user.id));
  };

  const handleSelectionOpenChange = (open: boolean) => {
    if (open) {
      setDraftSelectedUserIds(selectedUserIds.filter((userId) => enabledUserIds.has(userId)));
    }

    setIsSelectionOpen(open);
  };

  const handleSelectVictims = () => {
    if (!canSelectDraftUsers) {
      return;
    }

    setSelectedUserIds(draftSelectedUserIds.filter((userId) => enabledUserIds.has(userId)));
    setIsSelectionOpen(false);
  };

  const handleSpin = () => {
    if (!canSpin) {
      return;
    }

    const nextPrizeNumber = getRandomIndex(selectedUsers.length);
    const selectedWinner = selectedUsers[nextPrizeNumber];

    if (!selectedWinner) {
      return;
    }

    pendingWinnerNameRef.current = selectedWinner.username;
    setMustSpin(true);

    const segmentAngle = 360 / selectedUsers.length;
    const targetSegmentCenter = segmentAngle * (nextPrizeNumber + 0.5);
    const currentRotation = ((rotationDegrees % 360) + 360) % 360;
    const targetRotation = 360 - targetSegmentCenter;
    const extraRotation = (targetRotation - currentRotation + 360) % 360;

    setRotationDegrees(rotationDegrees + 360 * 6 + extraRotation);

    if (spinTimeoutRef.current) {
      clearTimeout(spinTimeoutRef.current);
    }

    spinTimeoutRef.current = setTimeout(handleSpinEnd, SPIN_DURATION_MS);
  };

  const handleSpinEnd = () => {
    setMustSpin(false);
    spinTimeoutRef.current = null;

    if (pendingWinnerNameRef.current) {
      setWinnerName(pendingWinnerNameRef.current);
      pendingWinnerNameRef.current = null;
      setIsWinnerOpen(true);
    }
  };

  return (
    <>
      <main className="flex flex-1 justify-center bg-zinc-50 px-4 py-8 dark:bg-black sm:px-6 sm:py-12">
        <Card className="w-full max-w-5xl shadow-md ring-1 ring-foreground/10">
          <CardHeader className="items-center text-center">
            <CardTitle>{dictionary.heading}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="flex justify-center">
              <div className="w-full max-w-176 rounded-[2rem] border border-border bg-muted/30 p-4 shadow-inner sm:p-6">
                {wheelData.length === 0 ? (
                  <div className="flex aspect-square items-center justify-center rounded-[1.5rem] border border-dashed border-border bg-background text-center text-sm text-muted-foreground">
                    <p className="max-w-xs">{dictionary.emptyState}</p>
                  </div>
                ) : (
                  <div className="relative mx-auto aspect-square w-full max-w-120">
                    <div className="absolute left-1/2 top-0 z-10 h-0 w-0 -translate-x-1/2 border-x-[0.9rem] border-t-[1.7rem] border-x-transparent border-t-primary" />
                    <svg
                      viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`}
                      role="img"
                      aria-label={dictionary.heading}
                      className="size-full drop-shadow-md"
                    >
                      <g
                        style={{
                          transform: `rotate(${rotationDegrees}deg)`,
                          transformBox: "fill-box",
                          transformOrigin: "center",
                          transition: mustSpin
                            ? `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.12, 0.72, 0.18, 1)`
                            : undefined,
                        }}
                      >
                        {wheelData.map((segment, index) => {
                          const segmentAngle = 360 / wheelData.length;
                          const startAngle = index * segmentAngle;
                          const endAngle = startAngle + segmentAngle;
                          const labelAngle = startAngle + segmentAngle / 2;
                          const labelPosition = polarToCartesian(labelAngle, WHEEL_LABEL_RADIUS);

                          return (
                            <g key={segment.id}>
                              <path
                                d={getSegmentPath(startAngle, endAngle)}
                                fill={segment.color}
                                stroke="#f8fafc"
                                strokeWidth="3"
                              />
                              <text
                                x={labelPosition.x}
                                y={labelPosition.y}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                className="fill-zinc-950 text-[16px] font-bold"
                                transform={`rotate(${labelAngle} ${labelPosition.x} ${labelPosition.y})`}
                              >
                                {segment.label}
                              </text>
                            </g>
                          );
                        })}
                      </g>
                      <circle
                        cx={WHEEL_CENTER}
                        cy={WHEEL_CENTER}
                        r="46"
                        className="fill-background stroke-border"
                        strokeWidth="4"
                      />
                    </svg>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:min-w-44 sm:w-auto"
                onClick={() => handleSelectionOpenChange(true)}
              >
                {dictionary.selectUsersButton}
              </Button>
              <Button
                type="button"
                className="w-full sm:min-w-44 sm:w-auto"
                onClick={handleSpin}
                disabled={!canSpin}
              >
                {dictionary.spinButton}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      <Dialog open={isSelectionOpen} onOpenChange={handleSelectionOpenChange}>
        <DialogContent className="w-[min(95vw,42rem)]">
          <DialogHeader>
            <DialogTitle>{dictionary.selectUsersTitle}</DialogTitle>
            <DialogDescription className="pb-2">{dictionary.selectUsersDescription}</DialogDescription>
          </DialogHeader>

          <TooltipProvider>
            <ScrollArea className="max-h-[55vh] rounded-lg border border-border bg-background">
              <ScrollAreaViewport>
                <ScrollAreaContent className="p-3">
                  <div className="mb-3 flex justify-end">
                    <Button type="button" variant="ghost" size="sm" onClick={handleToggleAll}>
                      {allSelected ? dictionary.deselectAllButton : dictionary.selectAllButton}
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {users.map((user, index) => {
                      const checkboxId = `${checkboxBaseId}-${index}`;
                      const isChecked = !user.isRoleShielded && draftSelectedUserIds.includes(user.id);
                      const disabledReason = user.isRoleShielded
                        ? dictionary.roleShieldDisabledTooltip.replace("{username}", user.username)
                        : null;
                      const option = (
                        <label
                          key={user.id}
                          htmlFor={checkboxId}
                          className={cn(
                            "flex items-start gap-3 rounded-lg border border-border bg-card p-3",
                            user.isRoleShielded ? "cursor-not-allowed opacity-60" : "cursor-pointer",
                          )}
                        >
                          <Checkbox
                            id={checkboxId}
                            checked={isChecked}
                            disabled={user.isRoleShielded}
                            onCheckedChange={(checked) => toggleDraftUser(user.id, checked)}
                            aria-label={user.username}
                            className="mt-1"
                          />
                          <span className="min-w-0 flex-1 text-sm font-medium text-foreground">
                            {user.username}
                          </span>
                        </label>
                      );

                      return disabledReason ? (
                        <Tooltip key={user.id}>
                          <TooltipTrigger render={option} />
                          <TooltipContent>{disabledReason}</TooltipContent>
                        </Tooltip>
                      ) : (
                        option
                      );
                    })}
                  </div>
                </ScrollAreaContent>
              </ScrollAreaViewport>
              <ScrollBar orientation="vertical" />
            </ScrollArea>
          </TooltipProvider>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleSelectionOpenChange(false)}>
              {dictionary.cancelButton}
            </Button>
            <Button type="button" onClick={handleSelectVictims} disabled={!canSelectDraftUsers}>
              {dictionary.selectButton}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isWinnerOpen} onOpenChange={setIsWinnerOpen}>
        <DialogContent className="w-[min(95vw,30rem)]">
          <DialogHeader>
            <DialogTitle>{dictionary.winnerTitle.replace("{username}", winnerName)}</DialogTitle>
            <DialogDescription className="whitespace-pre-line">
              {dictionary.winnerDescription.replace("{username}", winnerName)}
              {isPointSystemEnabled ? `\n${dictionary.winnerPointSystemDescription}` : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" onClick={() => setIsWinnerOpen(false)}>
              {dictionary.dismissButton}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
