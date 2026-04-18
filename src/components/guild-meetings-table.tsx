"use client";

import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { useActionState, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type {
  CreateGuildMeetingActionState,
  DeleteGuildMeetingResult,
  GuildMeetingEntry,
} from "@/app/[lang]/admin/guild-meetings/actions";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { Locale } from "@/i18n/config";

type GuildMeetingsTableProps = {
  lang: Locale;
  rows: GuildMeetingEntry[];
  createAction: (
    state: CreateGuildMeetingActionState,
    formData: FormData,
  ) => Promise<CreateGuildMeetingActionState>;
  deleteAction: (lang: unknown, id: unknown) => Promise<DeleteGuildMeetingResult>;
  migrateAndDeleteAction: (
    lang: unknown,
    sourceGuildMeetingId: unknown,
    targetGuildMeetingId: unknown,
  ) => Promise<boolean>;
  dictionary: {
    heading: string;
    addNewButton: string;
    noEntries: string;
    idLabel: string;
    dateTimeLabel: string;
    fixedTimeHint: string;
    newCardTitle: string;
    datePickerButton: string;
    datePickerPlaceholder: string;
    cancelButton: string;
    saveButton: string;
    saveSuccess: string;
    saveError: string;
    deleteButtonAriaLabel: string;
    deletePopoverTitle: string;
    deletePopoverDescription: string;
    deleteWithMigrationDescription: string;
    continueButton: string;
    deleteConfirmButton: string;
    deleteError: string;
    migrationDialogTitle: string;
    migrationDialogDescription: string;
    migrationTargetLabel: string;
    migrationEmptyState: string;
    migrateAndDeleteButton: string;
    migrateAndDeleteError: string;
  };
};

const initialState: CreateGuildMeetingActionState = { status: "idle" };

const toDateKey = (value: Date) => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateKey = (value: string) => {
  const [year, month, day] = value.split("-").map((part) => Number(part));

  if (!year || !month || !day) {
    return undefined;
  }

  const date = new Date(year, month - 1, day);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return undefined;
  }

  return date;
};

export function GuildMeetingsTable({
  lang,
  rows,
  createAction,
  deleteAction,
  migrateAndDeleteAction,
  dictionary,
}: GuildMeetingsTableProps) {
  const router = useRouter();
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [selectedMeetingDate, setSelectedMeetingDate] = useState<string>("");
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);
  const [confirmingDeleteRowId, setConfirmingDeleteRowId] = useState<string | null>(null);
  const [migrationSourceMeetingId, setMigrationSourceMeetingId] = useState<string | null>(null);
  const [migrationTargetMeetingId, setMigrationTargetMeetingId] = useState<string>("");
  const [deleteError, setDeleteError] = useState(false);
  const [migrationError, setMigrationError] = useState(false);
  const [state, formAction, createPending] = useActionState(
    async (previousState: CreateGuildMeetingActionState, formData: FormData) => {
      const nextState = await createAction(previousState, formData);

      if (nextState.status === "success") {
        setSelectedMeetingDate("");
        setIsDatePopoverOpen(false);
        setIsAddingNew(false);
        router.refresh();
      }

      return nextState;
    },
    initialState,
  );
  const [isDeletePending, startDeleteTransition] = useTransition();
  const [isMigrationPending, startMigrationTransition] = useTransition();

  const isBusy = createPending || isDeletePending || isMigrationPending;

  const selectedDate = useMemo(() => {
    if (!selectedMeetingDate) {
      return undefined;
    }

    return parseDateKey(selectedMeetingDate);
  }, [selectedMeetingDate]);

  const selectedDateLabel = useMemo(() => {
    if (!selectedDate) {
      return dictionary.datePickerPlaceholder;
    }

    return new Intl.DateTimeFormat(lang, { dateStyle: "medium" }).format(selectedDate);
  }, [dictionary.datePickerPlaceholder, lang, selectedDate]);

  const existingMeetingDateSet = useMemo(() => {
    return new Set(
      rows.map((row) => {
        const parsed = new Date(row.timestamp);

        if (Number.isNaN(parsed.getTime())) {
          return "";
        }

        const year = parsed.getUTCFullYear();
        const month = `${parsed.getUTCMonth() + 1}`.padStart(2, "0");
        const day = `${parsed.getUTCDate()}`.padStart(2, "0");
        return `${year}-${month}-${day}`;
      }),
    );
  }, [rows]);

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

  const meetingRowsForMigration = useMemo(
    () => rows.filter((row) => row.id !== migrationSourceMeetingId),
    [migrationSourceMeetingId, rows],
  );


  const handleCancelNewCard = () => {
    setSelectedMeetingDate("");
    setIsDatePopoverOpen(false);
    setIsAddingNew(false);
  };

  const handleDeleteMeeting = (meetingId: string) => {
    setDeleteError(false);
    setMigrationError(false);

    startDeleteTransition(async () => {
      const result = await deleteAction(lang, meetingId);

      if (result === "success") {
        setConfirmingDeleteRowId(null);
        router.refresh();
        return;
      }

      if (result === "hasSubmissions") {
        setConfirmingDeleteRowId(null);
        setMigrationSourceMeetingId(meetingId);
        setMigrationTargetMeetingId("");
        return;
      }

      setDeleteError(true);
    });
  };

  const handleMigrateAndDelete = () => {
    if (!migrationSourceMeetingId || !migrationTargetMeetingId) {
      return;
    }

    setDeleteError(false);
    setMigrationError(false);

    startMigrationTransition(async () => {
      const success = await migrateAndDeleteAction(lang, migrationSourceMeetingId, migrationTargetMeetingId);

      if (!success) {
        setMigrationError(true);
        return;
      }

      setMigrationSourceMeetingId(null);
      setMigrationTargetMeetingId("");
      router.refresh();
    });
  };

  return (
    <section className="w-full space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{dictionary.heading}</h1>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setDeleteError(false);
            setMigrationError(false);
            setIsAddingNew(true);
          }}
          disabled={isBusy || isAddingNew}
          className="w-full sm:w-auto"
        >
          <Plus />
          {dictionary.addNewButton}
        </Button>
      </div>

      {isAddingNew ? (
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="lang" value={lang} />
          <input type="hidden" name="meetingDate" value={selectedMeetingDate} />

          <Card className="border border-border bg-background">
            <CardHeader>
              <CardTitle>{dictionary.newCardTitle}</CardTitle>
              <CardDescription>{dictionary.fixedTimeHint}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-col gap-2">
                <Label>{dictionary.dateTimeLabel}</Label>
                <Popover open={isDatePopoverOpen} onOpenChange={setIsDatePopoverOpen}>
                  <PopoverTrigger
                    render={
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10 justify-start"
                        aria-label={dictionary.datePickerButton}
                        title={dictionary.datePickerButton}
                      >
                        <CalendarIcon />
                        {selectedDateLabel}
                      </Button>
                    }
                  />
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      aria-label={dictionary.datePickerButton}
                      disabled={(date) => existingMeetingDateSet.has(toDateKey(date))}
                      onSelect={(date) => {
                        if (!date) {
                          return;
                        }

                        setSelectedMeetingDate(toDateKey(date));
                        setIsDatePopoverOpen(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelNewCard}
                  disabled={isBusy}
                  className="w-full sm:w-auto"
                >
                  {dictionary.cancelButton}
                </Button>
                <Button type="submit" disabled={isBusy || selectedMeetingDate === ""} className="w-full sm:w-auto">
                  {dictionary.saveButton}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      ) : null}

      {rows.length === 0 ? <p className="text-sm text-muted-foreground">{dictionary.noEntries}</p> : null}

      <div className="space-y-3">
        {rows.map((row) => {
          const hasSubmissions = row.submissionCount > 0;

          return (
            <Card key={row.id} className="border border-border bg-background">
              <CardHeader>
                <div className="space-y-1">
                  <CardTitle>{formatMeetingTimestamp(row.timestamp)}</CardTitle>
                  <CardDescription>{dictionary.fixedTimeHint}</CardDescription>
                </div>
                <CardAction>
                  <Popover
                    open={confirmingDeleteRowId === row.id}
                    onOpenChange={(open) => setConfirmingDeleteRowId(open ? row.id : null)}
                  >
                    <PopoverTrigger
                      render={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={dictionary.deleteButtonAriaLabel}
                          title={dictionary.deleteButtonAriaLabel}
                          onClick={() => {
                            setDeleteError(false);
                            setMigrationError(false);
                            setConfirmingDeleteRowId(row.id);
                          }}
                          disabled={isBusy}
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 />
                        </Button>
                      }
                    />
                    <PopoverContent align="end" className="w-80">
                      <PopoverHeader>
                        <PopoverTitle>{dictionary.deletePopoverTitle}</PopoverTitle>
                        <PopoverDescription>
                          {hasSubmissions
                            ? dictionary.deleteWithMigrationDescription
                            : dictionary.deletePopoverDescription}
                        </PopoverDescription>
                      </PopoverHeader>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setConfirmingDeleteRowId(null)}
                          disabled={isBusy}
                        >
                          {dictionary.cancelButton}
                        </Button>
                        {hasSubmissions ? (
                          <Button
                            type="button"
                            onClick={() => {
                              setConfirmingDeleteRowId(null);
                              setMigrationSourceMeetingId(row.id);
                              setMigrationTargetMeetingId("");
                            }}
                            disabled={isBusy}
                          >
                            {dictionary.continueButton}
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="destructive"
                            onClick={() => handleDeleteMeeting(row.id)}
                            disabled={isBusy}
                          >
                            {dictionary.deleteConfirmButton}
                          </Button>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </CardAction>
              </CardHeader>
              <CardContent className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{dictionary.idLabel}: </span>
                  <span className="font-mono text-xs">{row.id}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{dictionary.dateTimeLabel}: </span>
                  {formatMeetingTimestamp(row.timestamp)}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {state.status === "success" ? (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">{dictionary.saveSuccess}</p>
      ) : null}

      {state.status === "error" ? <p className="text-sm text-destructive">{dictionary.saveError}</p> : null}
      {deleteError ? <p className="text-sm text-destructive">{dictionary.deleteError}</p> : null}
      {migrationError ? <p className="text-sm text-destructive">{dictionary.migrateAndDeleteError}</p> : null}

      <Dialog
        open={migrationSourceMeetingId !== null}
        onOpenChange={(open) => {
          if (open) {
            return;
          }

          setMigrationSourceMeetingId(null);
          setMigrationTargetMeetingId("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dictionary.migrationDialogTitle}</DialogTitle>
            <DialogDescription>{dictionary.migrationDialogDescription}</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">{dictionary.migrationTargetLabel}</p>

            {meetingRowsForMigration.length === 0 ? (
              <p className="text-sm text-muted-foreground">{dictionary.migrationEmptyState}</p>
            ) : (
              <RadioGroup
                value={migrationTargetMeetingId}
                onValueChange={setMigrationTargetMeetingId}
                className="max-h-64 overflow-y-auto rounded-lg border border-border p-3"
              >
                {meetingRowsForMigration.map((meeting) => {
                  const optionId = `meeting-${meeting.id}`;

                  return (
                    <Label
                      key={meeting.id}
                      htmlFor={optionId}
                      className="flex cursor-pointer items-center gap-3 rounded-md border border-border bg-background px-3 py-2"
                    >
                      <RadioGroupItem id={optionId} value={meeting.id} className="size-5" />
                      <span className="flex flex-col gap-0.5">
                        <span className="text-sm text-foreground">{formatMeetingTimestamp(meeting.timestamp)}</span>
                        <span className="font-mono text-xs text-muted-foreground">{meeting.id}</span>
                      </span>
                    </Label>
                  );
                })}
              </RadioGroup>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setMigrationSourceMeetingId(null);
                setMigrationTargetMeetingId("");
              }}
              disabled={isBusy}
            >
              {dictionary.cancelButton}
            </Button>
            <Button
              type="button"
              onClick={handleMigrateAndDelete}
              disabled={
                isBusy ||
                !migrationSourceMeetingId ||
                migrationTargetMeetingId === "" ||
                meetingRowsForMigration.length === 0
              }
            >
              {dictionary.migrateAndDeleteButton}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}




