"use client";

import Image from "next/image";
import { Pencil } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type {
  AwardAchievement,
  AwardAchievementUserRow,
} from "@/app/[lang]/admin/award-achievements/actions";
import { AchievementStack } from "@/components/achievement-stack";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  ScrollArea,
  ScrollAreaContent,
  ScrollAreaViewport,
  ScrollBar,
} from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import type { Locale } from "@/i18n/config";

type AwardAchievementsTableProps = {
  lang: Locale;
  rows: AwardAchievementUserRow[];
  achievements: AwardAchievement[];
  updateAction: (
    lang: unknown,
    userId: unknown,
    selectedAchievementIds: unknown,
  ) => Promise<boolean>;
  dictionary: {
    heading: string;
    noUsers: string;
    noAchievements: string;
    editButtonAriaLabel: string;
    dialogTitle: string;
    dialogDescription: string;
    cancelButton: string;
    saveButton: string;
    saveError: string;
    saveSuccess: string;
    confirmAwardHeading: string;
    confirmRemoveHeading: string;
    confirmNoChanges: string;
    confirmQuestion: string;
    confirmYesButton: string;
    confirmNoButton: string;
    showManualOnlyLabel: string;
  };
};

const formatMessage = (template: string, values: Record<string, string>) =>
  Object.entries(values).reduce(
    (message, [key, value]) => message.replaceAll(`{${key}}`, value),
    template,
  );

export function AwardAchievementsTable({
  lang,
  rows,
  achievements,
  updateAction,
  dictionary,
}: AwardAchievementsTableProps) {
  const router = useRouter();
  const [userRows, setUserRows] = useState(rows);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [selectedAchievementIds, setSelectedAchievementIds] = useState<string[]>([]);
  const [showManualOnly, setShowManualOnly] = useState(true);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, startSaveTransition] = useTransition();

  useEffect(() => {
    setUserRows(rows);
  }, [rows]);

  const editingUser = useMemo(
    () => userRows.find((row) => row.id === editingUserId) ?? null,
    [editingUserId, userRows],
  );

  const currentAchievementIdSet = useMemo(
    () => new Set(editingUser?.achievements.map((achievement) => achievement.id) ?? []),
    [editingUser],
  );

  const selectedAchievementIdSet = useMemo(
    () => new Set(selectedAchievementIds),
    [selectedAchievementIds],
  );

  const achievementsToAward = useMemo(
    () =>
      achievements.filter(
        (achievement) =>
          selectedAchievementIdSet.has(achievement.id) && !currentAchievementIdSet.has(achievement.id),
      ),
    [achievements, currentAchievementIdSet, selectedAchievementIdSet],
  );

  const achievementsToRemove = useMemo(
    () =>
      achievements.filter(
        (achievement) =>
          !selectedAchievementIdSet.has(achievement.id) && currentAchievementIdSet.has(achievement.id),
      ),
    [achievements, currentAchievementIdSet, selectedAchievementIdSet],
  );
  const hasPendingChanges = achievementsToAward.length > 0 || achievementsToRemove.length > 0;

  const visibleAchievements = useMemo(
    () =>
      showManualOnly
        ? achievements.filter((achievement) => achievement.criteria.mode === "manual")
        : achievements,
    [achievements, showManualOnly],
  );

  const handleOpenEditor = (user: AwardAchievementUserRow) => {
    setEditingUserId(user.id);
    setSelectedAchievementIds(user.achievements.map((achievement) => achievement.id));
    setShowManualOnly(true);
    setIsConfirmOpen(false);
    setSaveError(false);
    setSaveSuccess(false);
  };

  const handleCloseEditor = () => {
    setEditingUserId(null);
    setSelectedAchievementIds([]);
    setShowManualOnly(true);
    setIsConfirmOpen(false);
    setSaveError(false);
  };

  const handleCheckedChange = (achievementId: string, checked: boolean) => {
    setSelectedAchievementIds((currentIds) => {
      if (checked) {
        return currentIds.includes(achievementId) ? currentIds : [...currentIds, achievementId];
      }

      return currentIds.filter((currentId) => currentId !== achievementId);
    });
  };

  const handleSave = () => {
    if (!editingUser) {
      return;
    }

    setSaveError(false);

    startSaveTransition(async () => {
      const success = await updateAction(lang, editingUser.id, selectedAchievementIds);

      if (!success) {
        setSaveError(true);
        return;
      }

      const nextAchievements = achievements.filter((achievement) =>
        selectedAchievementIdSet.has(achievement.id),
      );

      setUserRows((currentRows) =>
        currentRows.map((row) =>
          row.id === editingUser.id
            ? {
                ...row,
                achievements: nextAchievements.map((achievement) => ({
                  id: achievement.id,
                  title: achievement.title,
                  image: achievement.image,
                })),
              }
            : row,
        ),
      );
      setSaveSuccess(true);
      setIsConfirmOpen(false);
      handleCloseEditor();
      router.refresh();
    });
  };

  return (
    <section className="w-full space-y-4">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{dictionary.heading}</h1>
        {saveSuccess ? <p className="text-sm text-muted-foreground">{dictionary.saveSuccess}</p> : null}
        {saveError ? <p className="text-sm text-destructive">{dictionary.saveError}</p> : null}
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <Table className="w-full">
          <TableBody>
            {userRows.length === 0 ? (
              <TableRow>
                <TableCell className="py-8 text-center text-sm text-muted-foreground" colSpan={4}>
                  {dictionary.noUsers}
                </TableCell>
              </TableRow>
            ) : (
              userRows.map((user) => (
                <TableRow key={user.id} className="group">
                  <TableCell className="w-56 font-mono text-xs text-muted-foreground">{user.id}</TableCell>
                  <TableCell className="w-56 text-sm font-medium text-foreground">{user.username}</TableCell>
                  <TableCell className="w-full">
                    <AchievementStack
                      achievements={user.achievements}
                      emptyLabel={dictionary.noAchievements}
                    />
                  </TableCell>
                  <TableCell className="w-12 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={dictionary.editButtonAriaLabel}
                      title={dictionary.editButtonAriaLabel}
                      className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                      onClick={() => handleOpenEditor(user)}
                    >
                      <Pencil aria-hidden="true" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={Boolean(editingUser)} onOpenChange={(open) => (!open ? handleCloseEditor() : undefined)}>
        <DialogContent className="flex max-h-[85vh] w-[min(95vw,48rem)] flex-col">
          {editingUser ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  {formatMessage(dictionary.dialogTitle, {
                    username: editingUser.username,
                    userId: editingUser.id,
                  })}
                </DialogTitle>
                <DialogDescription>{dictionary.dialogDescription}</DialogDescription>
              </DialogHeader>

              <Separator className="my-4" />

              <div className="flex min-h-0 flex-1 flex-col space-y-3">
                <div className="flex items-center justify-end gap-2">
                  <Label htmlFor="manual-only-achievements" className="text-sm text-muted-foreground">
                    {dictionary.showManualOnlyLabel}
                  </Label>
                  <Switch
                    id="manual-only-achievements"
                    checked={showManualOnly}
                    onCheckedChange={(checked) => setShowManualOnly(checked)}
                    disabled={isSaving}
                  />
                </div>
                <ScrollArea className="min-h-0 flex-1 rounded-lg border border-border bg-background">
                  <ScrollAreaViewport className="max-h-[40vh]">
                    <ScrollAreaContent className="p-3">
                      <div className="space-y-3">
                        {visibleAchievements.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                            {dictionary.noAchievements}
                          </div>
                        ) : (
                          visibleAchievements.map((achievement) => {
                            const isChecked = selectedAchievementIdSet.has(achievement.id);

                            return (
                              <div
                                key={achievement.id}
                                className="flex items-start gap-3 rounded-lg border border-border bg-card p-3"
                              >
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={(checked) =>
                                    handleCheckedChange(achievement.id, checked)
                                  }
                                  aria-label={achievement.title}
                                  className="mt-1"
                                  disabled={isSaving}
                                />
                                <div className="min-w-0 flex-1 space-y-2">
                                  <div className="flex items-center gap-3">
                                    <div className="relative size-12 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                                      <Image
                                        src={achievement.image}
                                        alt=""
                                        fill
                                        sizes="48px"
                                        unoptimized
                                        className="object-cover"
                                      />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-medium text-foreground">
                                        {achievement.title}
                                      </p>
                                    </div>
                                  </div>
                                  {achievement.description ? (
                                    <p className="text-sm text-muted-foreground">
                                      {achievement.description}
                                    </p>
                                  ) : null}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </ScrollAreaContent>
                  </ScrollAreaViewport>
                  <ScrollBar orientation="vertical" />
                </ScrollArea>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseEditor}
                  disabled={isSaving}
                >
                  {dictionary.cancelButton}
                </Button>
                <Popover open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                  <PopoverTrigger
                    render={
                      <Button
                        type="button"
                        disabled={isSaving || achievements.length === 0 || !hasPendingChanges}
                        onClick={() => setIsConfirmOpen(true)}
                      >
                        {dictionary.saveButton}
                      </Button>
                    }
                  />
                  <PopoverContent align="end" className="w-[min(26rem,calc(100vw-2rem))] space-y-3">
                    <p className="text-sm font-medium text-foreground">
                      {formatMessage(dictionary.confirmQuestion, {
                        username: editingUser.username,
                      })}
                    </p>

                    <div className="space-y-2">
                      {achievementsToAward.length > 0 ? (
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {formatMessage(dictionary.confirmAwardHeading, {
                              username: editingUser.username,
                            })}
                          </p>
                          <ul className="mt-1 list-disc pl-5 text-sm text-muted-foreground">
                            {achievementsToAward.map((achievement) => (
                              <li key={achievement.id}>{achievement.title}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      {achievementsToRemove.length > 0 ? (
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {formatMessage(dictionary.confirmRemoveHeading, {
                              username: editingUser.username,
                            })}
                          </p>
                          <ul className="mt-1 list-disc pl-5 text-sm text-muted-foreground">
                            {achievementsToRemove.map((achievement) => (
                              <li key={achievement.id}>{achievement.title}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsConfirmOpen(false)}
                        disabled={isSaving}
                      >
                        {dictionary.confirmNoButton}
                      </Button>
                      <Button type="button" size="sm" onClick={handleSave} disabled={isSaving}>
                        {dictionary.confirmYesButton}
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
