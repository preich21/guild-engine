"use client";

import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { useActionState, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type {
  CreateGuildMeetingActionState,
  DeleteGuildMeetingResult,
  GuildMeetingEntry,
} from "@/app/[lang]/admin/meetings/actions";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Locale } from "@/i18n/config";

type GuildMeetingsTableProps = {
  lang: Locale;
  rows: GuildMeetingEntry[];
  createAction: (
    state: CreateGuildMeetingActionState,
    formData: FormData,
  ) => Promise<CreateGuildMeetingActionState>;
  deleteAction: (lang: unknown, id: unknown) => Promise<DeleteGuildMeetingResult>;
  dictionary: {
    heading: string;
    addNewButton: string;
    noEntries: string;
    idLabel: string;
    dateLabel: string;
    timeLabel: string;
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
    deleteDisabledTooltip: string;
    deleteConfirmButton: string;
    deleteError: string;
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
  dictionary,
}: GuildMeetingsTableProps) {
  const router = useRouter();
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [selectedMeetingDate, setSelectedMeetingDate] = useState<string>("");
  const defaultMeetingTime = useMemo(() => {
    const firstMeetingTimestamp = rows[0]?.timestamp;

    if (!firstMeetingTimestamp) {
      return "12:00";
    }

    const parsed = new Date(firstMeetingTimestamp);

    if (Number.isNaN(parsed.getTime())) {
      return "12:00";
    }

    const hour = `${parsed.getUTCHours()}`.padStart(2, "0");
    const minute = `${parsed.getUTCMinutes()}`.padStart(2, "0");
    return `${hour}:${minute}`;
  }, [rows]);
  const [selectedMeetingTime, setSelectedMeetingTime] = useState<string>(defaultMeetingTime);
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);
  const [confirmingDeleteRowId, setConfirmingDeleteRowId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState(false);
  const [state, formAction, createPending] = useActionState(
    async (previousState: CreateGuildMeetingActionState, formData: FormData) => {
      const nextState = await createAction(previousState, formData);

      if (nextState.status === "success") {
        setSelectedMeetingDate("");
        setSelectedMeetingTime(defaultMeetingTime);
        setIsDatePopoverOpen(false);
        setIsAddingNew(false);
        router.refresh();
      }

      return nextState;
    },
    initialState,
  );
  const [isDeletePending, startDeleteTransition] = useTransition();

  const isBusy = createPending || isDeletePending;

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

  const todayKey = useMemo(() => toDateKey(new Date()), []);

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

  const handleCancelNewCard = () => {
    setSelectedMeetingDate("");
    setSelectedMeetingTime(defaultMeetingTime);
    setIsDatePopoverOpen(false);
    setIsAddingNew(false);
  };

  const handleDeleteMeeting = (meetingId: string) => {
    setDeleteError(false);

    startDeleteTransition(async () => {
      const result = await deleteAction(lang, meetingId);

      if (result === "success") {
        setConfirmingDeleteRowId(null);
        router.refresh();
        return;
      }

      setConfirmingDeleteRowId(null);
      setDeleteError(true);
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
            setSelectedMeetingTime(defaultMeetingTime);
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
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-col gap-2">
                <Label>{dictionary.dateLabel}</Label>
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
                      disabled={(date) => {
                        const dateKey = toDateKey(date);
                        return dateKey < todayKey || existingMeetingDateSet.has(dateKey);
                      }}
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
              <div className="flex flex-col gap-2">
                <Label htmlFor="meeting-time">{dictionary.timeLabel}</Label>
                <Input
                  id="meeting-time"
                  name="meetingTime"
                  type="time"
                  value={selectedMeetingTime}
                  onChange={(event) => setSelectedMeetingTime(event.target.value)}
                  required
                  className="h-10"
                />
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
                <Button
                  type="submit"
                  disabled={isBusy || selectedMeetingDate === "" || selectedMeetingTime === ""}
                  className="w-full sm:w-auto"
                >
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
          const deleteButton = (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={dictionary.deleteButtonAriaLabel}
              title={dictionary.deleteButtonAriaLabel}
              onClick={() => {
                setDeleteError(false);
                setConfirmingDeleteRowId(row.id);
              }}
              disabled={isBusy || row.hasTrackedContributions}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 />
            </Button>
          );

          return (
            <Card key={row.id} className="border border-border bg-background">
              <CardHeader>
                <div className="space-y-1">
                  <CardTitle>{formatMeetingTimestamp(row.timestamp)}</CardTitle>
                </div>
                <CardAction>
                  {row.hasTrackedContributions ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger render={<span className="inline-flex" />}>{deleteButton}</TooltipTrigger>
                        <TooltipContent>{dictionary.deleteDisabledTooltip}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <Popover
                      open={confirmingDeleteRowId === row.id}
                      onOpenChange={(open) => setConfirmingDeleteRowId(open ? row.id : null)}
                    >
                      <PopoverTrigger render={deleteButton} />
                      <PopoverContent align="end" className="w-80">
                        <PopoverHeader>
                          <PopoverTitle>{dictionary.deletePopoverTitle}</PopoverTitle>
                          <PopoverDescription>{dictionary.deletePopoverDescription}</PopoverDescription>
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
                          <Button
                            type="button"
                            variant="destructive"
                            onClick={() => handleDeleteMeeting(row.id)}
                            disabled={isBusy}
                          >
                            {dictionary.deleteConfirmButton}
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </CardAction>
              </CardHeader>
              <CardContent className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{dictionary.idLabel}: </span>
                  <span className="font-mono text-xs">{row.id}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{dictionary.dateLabel}: </span>
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
    </section>
  );
}

