"use client";

import { CalendarIcon, ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { QuizEntry, QuizInput, SaveQuizResult } from "@/app/[lang]/admin/quiz-management/actions";
import { JsonCodeEditor } from "@/components/json-code-editor";
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

type QuizDraft = {
  title: string;
  validFromDate: string;
  validFromTime: string;
  validToDate: string;
  validToTime: string;
  points: string;
  data: string;
};

type QuizManagementProps = {
  lang: Locale;
  rows: QuizEntry[];
  createAction: (lang: unknown, input: unknown) => Promise<SaveQuizResult>;
  updateAction: (lang: unknown, id: unknown, input: unknown) => Promise<SaveQuizResult>;
  deleteAction: (lang: unknown, id: unknown) => Promise<SaveQuizResult>;
  dictionary: {
    heading: string;
    createTooltip: string;
    noEntries: string;
    newCardTitle: string;
    editCardTitle: string;
    titleLabel: string;
    idLabel: string;
    validFromLabel: string;
    validToLabel: string;
    pointsLabel: string;
    dataLabel: string;
    modifiedLabel: string;
    modifiedByFallback: string;
    datePickerPlaceholder: string;
    noValidToLabel: string;
    cancelButton: string;
    saveButton: string;
    saveSuccess: string;
    saveError: string;
    updateSuccess: string;
    updateError: string;
    deleteButtonAriaLabel: string;
    editButtonAriaLabel: string;
    deletePopoverTitle: string;
    deletePopoverDescription: string;
    deleteConfirmButton: string;
    deleteCancelButton: string;
    deleteError: string;
    showDataButton: string;
    hideDataButton: string;
  };
};

const toDateKey = (value: Date) => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toTimeKey = (value: Date) => {
  const hour = `${value.getHours()}`.padStart(2, "0");
  const minute = `${value.getMinutes()}`.padStart(2, "0");
  return `${hour}:${minute}`;
};

const parseDateKey = (value: string) => {
  const [year, month, day] = value.split("-").map((part) => Number(part));

  if (!year || !month || !day) {
    return undefined;
  }

  const date = new Date(year, month - 1, day);

  return Number.isNaN(date.getTime()) ? undefined : date;
};

const addWeeks = (value: Date, weeks: number) => {
  const nextDate = new Date(value);
  nextDate.setDate(nextDate.getDate() + weeks * 7);
  return nextDate;
};

const toIsoTimestamp = (dateKey: string, timeKey: string) => {
  const [year, month, day] = dateKey.split("-").map((part) => Number(part));
  const [hour, minute] = timeKey.split(":").map((part) => Number(part));

  if (!year || !month || !day || !Number.isInteger(hour) || !Number.isInteger(minute)) {
    return null;
  }

  const timestamp = new Date(year, month - 1, day, hour, minute, 0, 0);
  return Number.isNaN(timestamp.getTime()) ? null : timestamp.toISOString();
};

const defaultDraft = (): QuizDraft => {
  const now = new Date();
  const validTo = addWeeks(now, 4);

  return {
    title: "",
    validFromDate: toDateKey(now),
    validFromTime: toTimeKey(now),
    validToDate: toDateKey(validTo),
    validToTime: toTimeKey(validTo),
    points: "0",
    data: "[]",
  };
};

const draftFromEntry = (entry: QuizEntry): QuizDraft => {
  const validFrom = new Date(entry.validFrom);
  const validTo = entry.validTo ? new Date(entry.validTo) : null;

  return {
    title: entry.title,
    validFromDate: toDateKey(validFrom),
    validFromTime: toTimeKey(validFrom),
    validToDate: validTo ? toDateKey(validTo) : "",
    validToTime: validTo ? toTimeKey(validTo) : "",
    points: String(entry.points),
    data: JSON.stringify(entry.data, null, 2),
  };
};

const inputFromDraft = (draft: QuizDraft): QuizInput | null => {
  const validFrom = toIsoTimestamp(draft.validFromDate, draft.validFromTime);
  const validTo =
    draft.validToDate === "" && draft.validToTime === ""
      ? null
      : toIsoTimestamp(draft.validToDate, draft.validToTime);

  if (!validFrom || (validTo === null && (draft.validToDate !== "" || draft.validToTime !== ""))) {
    return null;
  }

  return {
    title: draft.title,
    validFrom,
    validTo,
    points: draft.points,
    data: draft.data,
  };
};

export function QuizManagement({
  lang,
  rows,
  createAction,
  updateAction,
  deleteAction,
  dictionary,
}: QuizManagementProps) {
  const router = useRouter();
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newDraft, setNewDraft] = useState(defaultDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<QuizDraft | null>(null);
  const [expandedDataIds, setExpandedDataIds] = useState<Set<string>>(() => new Set());
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saveSuccess" | "saveError" | "updateSuccess" | "updateError" | "deleteError">("idle");
  const [isPending, startTransition] = useTransition();

  const formatTimestamp = (value: string | null) => {
    if (!value) {
      return dictionary.noValidToLabel;
    }

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat(lang, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(parsed);
  };

  const sortedRows = useMemo(
    () => [...rows].sort((left, right) => right.modifiedAt.localeCompare(left.modifiedAt)),
    [rows],
  );

  const handleCreate = () => {
    const input = inputFromDraft(newDraft);

    if (!input) {
      setStatus("saveError");
      return;
    }

    startTransition(async () => {
      const result = await createAction(lang, input);

      if (result === "success") {
        setNewDraft(defaultDraft());
        setIsAddingNew(false);
        setStatus("saveSuccess");
        router.refresh();
        return;
      }

      setStatus("saveError");
    });
  };

  const handleUpdate = (id: string) => {
    if (!editDraft) {
      return;
    }

    const input = inputFromDraft(editDraft);

    if (!input) {
      setStatus("updateError");
      return;
    }

    startTransition(async () => {
      const result = await updateAction(lang, id, input);

      if (result === "success") {
        setEditingId(null);
        setEditDraft(null);
        setStatus("updateSuccess");
        router.refresh();
        return;
      }

      setStatus("updateError");
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteAction(lang, id);

      if (result === "success") {
        setConfirmingDeleteId(null);
        setStatus("idle");
        router.refresh();
        return;
      }

      setConfirmingDeleteId(null);
      setStatus("deleteError");
    });
  };

  const toggleData = (id: string) => {
    setExpandedDataIds((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  };

  return (
    <TooltipProvider>
      <section className="w-full space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{dictionary.heading}</h1>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label={dictionary.createTooltip}
                  onClick={() => {
                    setStatus("idle");
                    setNewDraft(defaultDraft());
                    setIsAddingNew(true);
                  }}
                  disabled={isPending || isAddingNew}
                >
                  <Plus />
                </Button>
              }
            />
            <TooltipContent>{dictionary.createTooltip}</TooltipContent>
          </Tooltip>
        </div>

        {isAddingNew ? (
          <QuizFormCard
            title={dictionary.newCardTitle}
            draft={newDraft}
            onDraftChange={setNewDraft}
            onCancel={() => {
              setIsAddingNew(false);
              setNewDraft(defaultDraft());
            }}
            onSave={handleCreate}
            isPending={isPending}
            dictionary={dictionary}
          />
        ) : null}

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{dictionary.noEntries}</p>
        ) : null}

        <div className="space-y-3">
          {sortedRows.map((row) =>
            editingId === row.id && editDraft ? (
              <QuizFormCard
                key={row.id}
                title={dictionary.editCardTitle}
                draft={editDraft}
                onDraftChange={setEditDraft}
                onCancel={() => {
                  setEditingId(null);
                  setEditDraft(null);
                }}
                onSave={() => handleUpdate(row.id)}
                isPending={isPending}
                dictionary={dictionary}
              />
            ) : (
              <Card key={row.id} className="border border-border bg-background">
                <CardHeader>
                  <CardTitle>{row.title}</CardTitle>
                  <CardAction className="flex gap-1">
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={dictionary.editButtonAriaLabel}
                            title={dictionary.editButtonAriaLabel}
                            onClick={() => {
                              setStatus("idle");
                              setEditingId(row.id);
                              setEditDraft(draftFromEntry(row));
                            }}
                            disabled={isPending}
                          >
                            <Pencil />
                          </Button>
                        }
                      />
                      <TooltipContent>{dictionary.editButtonAriaLabel}</TooltipContent>
                    </Tooltip>
                    <Popover
                      open={confirmingDeleteId === row.id}
                      onOpenChange={(open) => setConfirmingDeleteId(open ? row.id : null)}
                    >
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <PopoverTrigger
                              render={
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label={dictionary.deleteButtonAriaLabel}
                                  title={dictionary.deleteButtonAriaLabel}
                                  disabled={isPending}
                                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                >
                                  <Trash2 />
                                </Button>
                              }
                            />
                          }
                        />
                        <TooltipContent>{dictionary.deleteButtonAriaLabel}</TooltipContent>
                      </Tooltip>
                      <PopoverContent align="end" className="w-80">
                        <PopoverHeader>
                          <PopoverTitle>{dictionary.deletePopoverTitle}</PopoverTitle>
                          <PopoverDescription>
                            {dictionary.deletePopoverDescription.replace("{title}", row.title)}
                          </PopoverDescription>
                        </PopoverHeader>
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setConfirmingDeleteId(null)}
                            disabled={isPending}
                          >
                            {dictionary.deleteCancelButton}
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            onClick={() => handleDelete(row.id)}
                            disabled={isPending}
                          >
                            {dictionary.deleteConfirmButton}
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </CardAction>
                </CardHeader>
                <CardContent className="space-y-3">
                  <dl className="grid gap-2 text-sm sm:grid-cols-2">
                    <QuizMeta label={dictionary.idLabel} value={row.id} monospace />
                    <QuizMeta label={dictionary.validFromLabel} value={formatTimestamp(row.validFrom)} />
                    <QuizMeta label={dictionary.validToLabel} value={formatTimestamp(row.validTo)} />
                    <QuizMeta label={dictionary.pointsLabel} value={String(row.points)} />
                  </dl>

                  <div className="space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => toggleData(row.id)}
                      className="w-full justify-between sm:w-auto"
                    >
                      {expandedDataIds.has(row.id) ? dictionary.hideDataButton : dictionary.showDataButton}
                      <ChevronDown
                        className={expandedDataIds.has(row.id) ? "rotate-180 transition-transform" : "transition-transform"}
                      />
                    </Button>
                    {expandedDataIds.has(row.id) ? (
                      <JsonCodeEditor
                        value={JSON.stringify(row.data, null, 2)}
                        readOnly
                        ariaLabel={dictionary.dataLabel}
                      />
                    ) : null}
                  </div>

                  <p className="text-sm text-muted-foreground">
                    {dictionary.modifiedLabel}: {formatTimestamp(row.modifiedAt)} by{" "}
                    {row.modifiedByUsername ?? dictionary.modifiedByFallback}
                  </p>
                </CardContent>
              </Card>
            ),
          )}
        </div>

        {status === "saveSuccess" ? (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">{dictionary.saveSuccess}</p>
        ) : null}
        {status === "saveError" ? <p className="text-sm text-destructive">{dictionary.saveError}</p> : null}
        {status === "updateSuccess" ? (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">{dictionary.updateSuccess}</p>
        ) : null}
        {status === "updateError" ? <p className="text-sm text-destructive">{dictionary.updateError}</p> : null}
        {status === "deleteError" ? <p className="text-sm text-destructive">{dictionary.deleteError}</p> : null}
      </section>
    </TooltipProvider>
  );
}

function QuizMeta({ label, value, monospace = false }: { label: string; value: string; monospace?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase text-muted-foreground">{label}</dt>
      <dd className={monospace ? "truncate font-mono text-xs text-foreground" : "text-foreground"}>{value}</dd>
    </div>
  );
}

function QuizFormCard({
  title,
  draft,
  onDraftChange,
  onCancel,
  onSave,
  isPending,
  dictionary,
}: {
  title: string;
  draft: QuizDraft;
  onDraftChange: (draft: QuizDraft) => void;
  onCancel: () => void;
  onSave: () => void;
  isPending: boolean;
  dictionary: QuizManagementProps["dictionary"];
}) {
  const validFromDate = useMemo(() => parseDateKey(draft.validFromDate), [draft.validFromDate]);
  const validToDate = useMemo(() => parseDateKey(draft.validToDate), [draft.validToDate]);
  const [validFromOpen, setValidFromOpen] = useState(false);
  const [validToOpen, setValidToOpen] = useState(false);

  const validFromLabel = validFromDate
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(validFromDate)
    : dictionary.datePickerPlaceholder;
  const validToLabel = validToDate
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(validToDate)
    : dictionary.noValidToLabel;

  const validToMinimumKey = draft.validFromDate;

  return (
    <Card className="border border-border bg-background">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor={`${title}-title`}>{dictionary.titleLabel}</Label>
            <Input
              id={`${title}-title`}
              value={draft.title}
              onChange={(event) => onDraftChange({ ...draft, title: event.target.value })}
              maxLength={255}
              required
            />
          </div>

          <DateTimeField
            label={dictionary.validFromLabel}
            dateLabel={validFromLabel}
            date={validFromDate}
            time={draft.validFromTime}
            open={validFromOpen}
            onOpenChange={setValidFromOpen}
            onDateChange={(dateKey) => {
              const nextDraft = { ...draft, validFromDate: dateKey };

              if (nextDraft.validToDate && nextDraft.validToDate <= dateKey) {
                const nextValidTo = parseDateKey(dateKey);

                if (nextValidTo) {
                  nextValidTo.setDate(nextValidTo.getDate() + 1);
                  nextDraft.validToDate = toDateKey(nextValidTo);
                }
              }

              onDraftChange(nextDraft);
            }}
            onTimeChange={(time) => onDraftChange({ ...draft, validFromTime: time })}
            dictionary={dictionary}
          />

          <DateTimeField
            label={dictionary.validToLabel}
            dateLabel={validToLabel}
            date={validToDate}
            time={draft.validToTime}
            open={validToOpen}
            onOpenChange={setValidToOpen}
            disabledDate={(date) => toDateKey(date) <= validToMinimumKey}
            onDateChange={(dateKey) =>
              onDraftChange({
                ...draft,
                validToDate: dateKey,
                validToTime: draft.validToTime || draft.validFromTime,
              })
            }
            onTimeChange={(time) => onDraftChange({ ...draft, validToTime: time })}
            onClear={() => onDraftChange({ ...draft, validToDate: "", validToTime: "" })}
            dictionary={dictionary}
          />

          <div className="flex flex-col gap-2">
            <Label htmlFor={`${title}-points`}>{dictionary.pointsLabel}</Label>
            <Input
              id={`${title}-points`}
              type="number"
              min={0}
              max={32767}
              step={1}
              value={draft.points}
              onChange={(event) => onDraftChange({ ...draft, points: event.target.value })}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>{dictionary.dataLabel}</Label>
          <JsonCodeEditor
            value={draft.data}
            onChange={(data) => onDraftChange({ ...draft, data })}
            ariaLabel={dictionary.dataLabel}
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending} className="w-full sm:w-auto">
            {dictionary.cancelButton}
          </Button>
          <Button type="button" onClick={onSave} disabled={isPending} className="w-full sm:w-auto">
            {dictionary.saveButton}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DateTimeField({
  label,
  dateLabel,
  date,
  time,
  open,
  onOpenChange,
  disabledDate,
  onDateChange,
  onTimeChange,
  onClear,
  dictionary,
}: {
  label: string;
  dateLabel: string;
  date?: Date;
  time: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disabledDate?: (date: Date) => boolean;
  onDateChange: (dateKey: string) => void;
  onTimeChange: (time: string) => void;
  onClear?: () => void;
  dictionary: QuizManagementProps["dictionary"];
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <Popover open={open} onOpenChange={onOpenChange}>
          <PopoverTrigger
            render={
              <Button type="button" variant="outline" className="h-10 justify-start">
                <CalendarIcon />
                {dateLabel}
              </Button>
            }
          />
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              disabled={disabledDate}
              onSelect={(nextDate) => {
                if (!nextDate) {
                  return;
                }

                onDateChange(toDateKey(nextDate));
                onOpenChange(false);
              }}
            />
          </PopoverContent>
        </Popover>
        <Input type="time" value={time} onChange={(event) => onTimeChange(event.target.value)} className="h-10" />
      </div>
      {onClear ? (
        <Button type="button" variant="ghost" size="sm" onClick={onClear} className="w-fit px-0">
          {dictionary.noValidToLabel}
        </Button>
      ) : null}
    </div>
  );
}
