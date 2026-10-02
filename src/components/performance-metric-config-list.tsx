"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowUpDown,
  Ban,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  Pencil,
  Plus,
  RotateCcw,
} from "lucide-react";
import { useActionState, useId, useState } from "react";
import { useRouter } from "next/navigation";

import type {
  CreatePerformanceMetricActionState,
  PerformanceMetricEntry,
  SetPerformanceMetricDisableTimestampActionState,
  UpdatePerformanceMetricActionState,
  UpdatePerformanceMetricOrderActionState,
} from "@/app/[lang]/admin/performance-metric-config/actions";
import { useFeatureEnabled } from "@/components/feature-config-provider";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import type { Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

type PerformanceMetricConfigListProps = {
  lang: Locale;
  rows: PerformanceMetricEntry[];
  createAction: (
    state: CreatePerformanceMetricActionState,
    formData: FormData,
  ) => Promise<CreatePerformanceMetricActionState>;
  reorderAction: (
    state: UpdatePerformanceMetricOrderActionState,
    formData: FormData,
  ) => Promise<UpdatePerformanceMetricOrderActionState>;
  updateAction: (
    state: UpdatePerformanceMetricActionState,
    formData: FormData,
  ) => Promise<UpdatePerformanceMetricActionState>;
  disableAction: (
    state: SetPerformanceMetricDisableTimestampActionState,
    formData: FormData,
  ) => Promise<SetPerformanceMetricDisableTimestampActionState>;
  dictionary: {
    heading: string;
    addNewButton: string;
    noEntries: string;
    newCardTitle: string;
    shortNameLabel: string;
    questionLabel: string;
    typeLabel: string;
    enumPossibilitiesLabel: string;
    enumPossibilitiesPlaceholder: string;
    enumPointsLabel: string;
    enumPointsPlaceholder: string;
    integerPointsLabel: string;
    shortNamePlaceholder: string;
    questionPlaceholder: string;
    idLabel: string;
    timestampAddedLabel: string;
    typeEnum: string;
    typeInteger: string;
    typeUnknown: string;
    cancelButton: string;
    saveButton: string;
    saveSuccess: string;
    saveError: string;
    reorderButton: string;
    dragHandleLabel: string;
    reorderCancelButton: string;
    reorderSaveButton: string;
    reorderSaveSuccess: string;
    reorderSaveError: string;
    editButton: string;
    duplicateButton: string;
    disableButton: string;
    enableButton: string;
    editCardTitle: string;
    pointsChangeWarning: string;
    disablePopoverTitle: string;
    disablePopoverDescription: string;
    disableConfirmButton: string;
    showDisabledButton: string;
    hideDisabledButton: string;
    disabledFromLabel: string;
    updateSuccess: string;
    updateError: string;
    disableSuccess: string;
    enableSuccess: string;
    disableError: string;
  };
};

type DraftPerformanceMetric = {
  shortName: string;
  question: string;
  type: "0" | "1";
  enumPossibilities: string;
  points: string;
};

const initialState: CreatePerformanceMetricActionState = { status: "idle" };
const initialReorderState: UpdatePerformanceMetricOrderActionState = { status: "idle" };
const initialUpdateState: UpdatePerformanceMetricActionState = { status: "idle" };
const initialDisableState: SetPerformanceMetricDisableTimestampActionState = { status: "idle" };

const defaultDraft = (): DraftPerformanceMetric => ({
  shortName: "",
  question: "",
  type: "0",
  enumPossibilities: "",
  points: "",
});

const getTypeLabel = (
  type: number,
  dictionary: PerformanceMetricConfigListProps["dictionary"],
) => {
  if (type === 0) {
    return dictionary.typeEnum;
  }

  if (type === 1) {
    return dictionary.typeInteger;
  }

  return dictionary.typeUnknown;
};

const splitSemicolonValues = (value: string) =>
  value
    .split(";")
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "");

const isNonNegativeIntegerString = (value: string) => {
  if (!/^\d+$/.test(value)) {
    return false;
  }

  const parsed = Number(value);

  return Number.isSafeInteger(parsed) && parsed >= 0;
};

type Dictionary = PerformanceMetricConfigListProps["dictionary"];

const formatTimestamp = (lang: Locale, value: string) =>
  new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

const isPointsDraftValid = (points: string, isEnumType: boolean, enumPossibilities: string) => {
  if (!isEnumType) {
    return isNonNegativeIntegerString(points);
  }

  const pointValues = splitSemicolonValues(points);

  return (
    pointValues.length > 0 &&
    pointValues.length === splitSemicolonValues(enumPossibilities).length &&
    pointValues.every(isNonNegativeIntegerString)
  );
};

function PointsField({
  id,
  isEnumType,
  value,
  onChange,
  disabled,
  dictionary,
}: {
  id: string;
  isEnumType: boolean;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  dictionary: Dictionary;
}) {
  if (isEnumType) {
    return (
      <div className="space-y-2">
        <Label htmlFor={id}>{dictionary.enumPointsLabel}</Label>
        <Textarea
          id={id}
          name="points"
          maxLength={255}
          rows={1}
          className="min-h-8 resize-y"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={dictionary.enumPointsPlaceholder}
          required
          disabled={disabled}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{dictionary.integerPointsLabel}</Label>
      <Input
        id={id}
        name="points"
        type="number"
        min={0}
        step={1}
        value={value}
        onChange={(event) => {
          const nextValue = event.target.valueAsNumber;
          onChange(Number.isNaN(nextValue) ? "0" : String(Math.max(0, Math.trunc(nextValue))));
        }}
        required
        disabled={disabled}
      />
    </div>
  );
}

function PerformanceMetricDetails({
  lang,
  row,
  dictionary,
}: {
  lang: Locale;
  row: PerformanceMetricEntry;
  dictionary: Dictionary;
}) {
  return (
    <dl className="space-y-2 text-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:gap-2">
        <dt className="font-medium text-foreground">{dictionary.questionLabel}:</dt>
        <dd className="break-words text-muted-foreground">{row.question}</dd>
      </div>
      <div className="flex flex-col gap-1 sm:flex-row sm:gap-2">
        <dt className="font-medium text-foreground">{dictionary.idLabel}:</dt>
        <dd className="break-all text-muted-foreground">{row.id}</dd>
      </div>
      <div className="flex flex-col gap-1 sm:flex-row sm:gap-2">
        <dt className="font-medium text-foreground">{dictionary.enumPossibilitiesLabel}:</dt>
        <dd className="break-words text-muted-foreground">{row.enumPossibilities ?? "--"}</dd>
      </div>
      <div className="flex flex-col gap-1 sm:flex-row sm:gap-2">
        <dt className="font-medium text-foreground">{dictionary.integerPointsLabel}:</dt>
        <dd className="break-words text-muted-foreground">{row.points ?? "--"}</dd>
      </div>
      <div className="flex flex-col gap-1 sm:flex-row sm:gap-2">
        <dt className="font-medium text-foreground">{dictionary.timestampAddedLabel}:</dt>
        <dd className="break-words text-muted-foreground" suppressHydrationWarning>
          {formatTimestamp(lang, row.timestampAdded)}
        </dd>
      </div>
      <div className="flex flex-col gap-1 sm:flex-row sm:gap-2">
        <dt className="font-medium text-foreground">{dictionary.typeLabel}:</dt>
        <dd className="text-muted-foreground">{getTypeLabel(row.type, dictionary)}</dd>
      </div>
      {row.disableTimestamp ? (
        <div className="flex flex-col gap-1 sm:flex-row sm:gap-2">
          <dt className="font-medium text-foreground">{dictionary.disabledFromLabel}:</dt>
          <dd className="text-muted-foreground" suppressHydrationWarning>
            {formatTimestamp(lang, row.disableTimestamp)}
          </dd>
        </div>
      ) : null}
    </dl>
  );
}

function SortablePerformanceMetricCard({
  lang,
  row,
  dictionary,
  disabled,
}: {
  lang: Locale;
  row: PerformanceMetricEntry;
  dictionary: Dictionary;
  disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: row.id, disabled });

  return (
    <Card
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        row.disableTimestamp && "opacity-60",
        isDragging && "relative z-10 opacity-60 ring-2 ring-ring",
      )}
    >
      <CardHeader>
        <CardTitle className={row.disableTimestamp ? "text-muted-foreground line-through" : undefined}>
          {row.shortName}
        </CardTitle>
        <CardAction>
          <Button
            ref={setActivatorNodeRef}
            type="button"
            size="icon"
            variant="ghost"
            className="cursor-grab touch-none active:cursor-grabbing"
            aria-label={dictionary.dragHandleLabel.replace("{name}", row.shortName)}
            title={dictionary.dragHandleLabel.replace("{name}", row.shortName)}
            disabled={disabled}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" aria-hidden="true" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <PerformanceMetricDetails lang={lang} row={row} dictionary={dictionary} />
      </CardContent>
    </Card>
  );
}

function EditPerformanceMetricCard({
  lang,
  row,
  dictionary,
  pointSystemEnabled,
  formAction,
  pending,
  onCancel,
}: {
  lang: Locale;
  row: PerformanceMetricEntry;
  dictionary: Dictionary;
  pointSystemEnabled: boolean;
  formAction: (formData: FormData) => void;
  pending: boolean;
  onCancel: () => void;
}) {
  const formId = useId();
  const [shortName, setShortName] = useState(row.shortName);
  const [question, setQuestion] = useState(row.question);
  const [points, setPoints] = useState(row.points ?? "");
  const isEnumType = row.type === 0;
  const pointsChanged = pointSystemEnabled && points !== (row.points ?? "");
  const isFormValid =
    shortName.trim() !== "" &&
    shortName.length <= 30 &&
    question.trim() !== "" &&
    question.length <= 255 &&
    (!pointSystemEnabled ||
      (points.length <= 255 && isPointsDraftValid(points, isEnumType, row.enumPossibilities ?? "")));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dictionary.editCardTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-5">
          <input type="hidden" name="lang" value={lang} />
          <input type="hidden" name="id" value={row.id} />

          <div className="space-y-2">
            <Label htmlFor={`${formId}-short-name`}>{dictionary.shortNameLabel}</Label>
            <Input
              id={`${formId}-short-name`}
              name="shortName"
              maxLength={30}
              value={shortName}
              onChange={(event) => setShortName(event.target.value)}
              required
              disabled={pending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${formId}-question`}>{dictionary.questionLabel}</Label>
            <Textarea
              id={`${formId}-question`}
              name="question"
              rows={1}
              maxLength={255}
              className="min-h-8 resize-y"
              value={question}
              placeholder={dictionary.questionPlaceholder}
              onChange={(event) => setQuestion(event.target.value)}
              required
              disabled={pending}
            />
          </div>

          {isEnumType ? (
            <div className="space-y-2 text-sm">
              <p className="font-medium text-foreground">{dictionary.enumPossibilitiesLabel}</p>
              <p className="break-words text-muted-foreground">{row.enumPossibilities ?? "--"}</p>
            </div>
          ) : null}

          {pointSystemEnabled ? (
            <PointsField
              id={`${formId}-points`}
              isEnumType={isEnumType}
              value={points}
              onChange={setPoints}
              disabled={pending}
              dictionary={dictionary}
            />
          ) : null}

          {pointsChanged ? (
            <p
              role="alert"
              className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {dictionary.pointsChangeWarning}
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={onCancel} disabled={pending}>
              {dictionary.cancelButton}
            </Button>
            <Button type="submit" className="w-full sm:w-auto" disabled={pending || !isFormValid}>
              {dictionary.saveButton}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function PerformanceMetricCardActions({
  lang,
  row,
  dictionary,
  disabled,
  disableFormAction,
  onEdit,
  onDuplicate,
}: {
  lang: Locale;
  row: PerformanceMetricEntry;
  dictionary: Dictionary;
  disabled: boolean;
  disableFormAction: (formData: FormData) => void;
  onEdit: () => void;
  onDuplicate: () => void;
}) {
  const [disablePopoverOpen, setDisablePopoverOpen] = useState(false);
  const editLabel = dictionary.editButton.replace("{name}", row.shortName);
  const duplicateLabel = dictionary.duplicateButton.replace("{name}", row.shortName);
  const disableLabel = dictionary.disableButton.replace("{name}", row.shortName);
  const enableLabel = dictionary.enableButton.replace("{name}", row.shortName);
  const isMetricDisabled = row.disableTimestamp !== null;

  return (
    <div className="flex gap-1">
      {isMetricDisabled ? null : (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={onEdit}
          disabled={disabled}
          aria-label={editLabel}
          title={editLabel}
        >
          <Pencil className="size-4" aria-hidden="true" />
        </Button>
      )}
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={onDuplicate}
        disabled={disabled}
        aria-label={duplicateLabel}
        title={duplicateLabel}
      >
        <Copy className="size-4" aria-hidden="true" />
      </Button>
      {isMetricDisabled ? (
        <form action={disableFormAction}>
          <input type="hidden" name="lang" value={lang} />
          <input type="hidden" name="id" value={row.id} />
          <input type="hidden" name="disabled" value="false" />
          <Button
            type="submit"
            size="icon"
            variant="ghost"
            disabled={disabled}
            aria-label={enableLabel}
            title={enableLabel}
          >
            <RotateCcw className="size-4" aria-hidden="true" />
          </Button>
        </form>
      ) : (
        <Popover open={disablePopoverOpen} onOpenChange={setDisablePopoverOpen}>
          <PopoverTrigger
            render={
              <Button
                type="button"
                size="icon"
                variant="ghost"
                disabled={disabled}
                aria-label={disableLabel}
                title={disableLabel}
              >
                <Ban className="size-4" aria-hidden="true" />
              </Button>
            }
          />
          <PopoverContent align="end" className="w-80">
            <PopoverHeader>
              <PopoverTitle>{dictionary.disablePopoverTitle}</PopoverTitle>
              <PopoverDescription>
                {dictionary.disablePopoverDescription.replace("{name}", row.shortName)}
              </PopoverDescription>
            </PopoverHeader>
            <form
              action={disableFormAction}
              onSubmit={() => setDisablePopoverOpen(false)}
              className="flex justify-end gap-2"
            >
              <input type="hidden" name="lang" value={lang} />
              <input type="hidden" name="id" value={row.id} />
              <input type="hidden" name="disabled" value="true" />
              <Button type="button" variant="outline" onClick={() => setDisablePopoverOpen(false)}>
                {dictionary.cancelButton}
              </Button>
              <Button type="submit" variant="destructive">
                {dictionary.disableConfirmButton}
              </Button>
            </form>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

export function PerformanceMetricConfigList({
  lang,
  rows,
  createAction,
  reorderAction,
  updateAction,
  disableAction,
  dictionary,
}: PerformanceMetricConfigListProps) {
  const formId = useId();
  const router = useRouter();
  const pointSystemEnabled = Boolean(useFeatureEnabled("point-system"));
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [draft, setDraft] = useState<DraftPerformanceMetric>(() => defaultDraft());
  const [duplicateOfId, setDuplicateOfId] = useState<string | null>(null);
  const [showDisabled, setShowDisabled] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (previousState: CreatePerformanceMetricActionState, formData: FormData) => {
      const nextState = await createAction(previousState, formData);

      if (nextState.status === "success") {
        setDraft(defaultDraft());
        setDuplicateOfId(null);
        setIsAddingNew(false);
        router.refresh();
      }

      return nextState;
    },
    initialState,
  );

  const [isReordering, setIsReordering] = useState(false);
  const [orderedRows, setOrderedRows] = useState<PerformanceMetricEntry[]>(rows);
  const [reorderState, reorderFormAction, reorderPending] = useActionState(
    async (previousState: UpdatePerformanceMetricOrderActionState, formData: FormData) => {
      const nextState = await reorderAction(previousState, formData);

      if (nextState.status === "success") {
        setIsReordering(false);
        router.refresh();
      }

      return nextState;
    },
    initialReorderState,
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [updateState, updateFormAction, updatePending] = useActionState(
    async (previousState: UpdatePerformanceMetricActionState, formData: FormData) => {
      const nextState = await updateAction(previousState, formData);

      if (nextState.status === "success") {
        setEditingId(null);
        router.refresh();
      }

      return nextState;
    },
    initialUpdateState,
  );
  const [disableState, disableFormAction, disablePending] = useActionState(
    async (previousState: SetPerformanceMetricDisableTimestampActionState, formData: FormData) => {
      const nextState = await disableAction(previousState, formData);

      if (nextState.status !== "error") {
        router.refresh();
      }

      return nextState;
    },
    initialDisableState,
  );
  const isBusy = isAddingNew || isReordering || editingId !== null || pending || updatePending || disablePending;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const visibleRows = rows.filter((row) => showDisabled || row.disableTimestamp === null);
  const isEnumType = draft.type === "0";
  const isPointsValid =
    !pointSystemEnabled || isPointsDraftValid(draft.points, isEnumType, draft.enumPossibilities);
  const isFormValid =
    draft.shortName.trim() !== "" &&
    draft.shortName.length <= 30 &&
    draft.question.trim() !== "" &&
    draft.question.length <= 255 &&
    (!isEnumType || (draft.enumPossibilities.trim() !== "" && draft.enumPossibilities.length <= 511)) &&
    draft.points.length <= 255 &&
    isPointsValid;

  const handleStartCreate = (initialDraft: DraftPerformanceMetric = defaultDraft(), sourceId: string | null = null) => {
    setDraft(initialDraft);
    setDuplicateOfId(sourceId);
    setIsAddingNew(true);
  };

  const handleDuplicate = (row: PerformanceMetricEntry) => {
    handleStartCreate({
      shortName: row.shortName,
      question: row.question,
      type: row.type === 1 ? "1" : "0",
      enumPossibilities: row.enumPossibilities ?? "",
      points: row.points ?? (row.type === 1 ? "0" : ""),
    }, row.id);
  };

  const handleCancelCreate = () => {
    setDraft(defaultDraft());
    setDuplicateOfId(null);
    setIsAddingNew(false);
  };

  const handleStartReorder = () => {
    setOrderedRows(rows);
    setIsReordering(true);
  };

  const handleCancelReorder = () => {
    setOrderedRows(rows);
    setIsReordering(false);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) {
      return;
    }

    setOrderedRows((current) => {
      const oldIndex = current.findIndex((row) => row.id === active.id);
      const newIndex = current.findIndex((row) => row.id === over.id);

      return oldIndex < 0 || newIndex < 0 ? current : arrayMove(current, oldIndex, newIndex);
    });
  };

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{dictionary.heading}</h1>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={() => setShowDisabled((current) => !current)}
            aria-pressed={showDisabled}
            aria-label={showDisabled ? dictionary.hideDisabledButton : dictionary.showDisabledButton}
            title={showDisabled ? dictionary.hideDisabledButton : dictionary.showDisabledButton}
          >
            {showDisabled ? (
              <Eye className="size-4" aria-hidden="true" />
            ) : (
              <EyeOff className="size-4" aria-hidden="true" />
            )}
          </Button>
          <Separator orientation="vertical" className="h-6 data-vertical:self-center" />
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={handleStartReorder}
            disabled={isBusy || rows.length < 2}
            aria-label={dictionary.reorderButton}
            title={dictionary.reorderButton}
          >
            <ArrowUpDown className="size-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={() => handleStartCreate()}
            disabled={isBusy}
            aria-label={dictionary.addNewButton}
            title={dictionary.addNewButton}
          >
            <Plus className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {isAddingNew ? (
          <Card>
            <CardHeader>
              <CardTitle>{dictionary.newCardTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <form id={formId} action={formAction} className="space-y-5">
                <input type="hidden" name="lang" value={lang} />
                <input type="hidden" name="type" value={draft.type} />
                {duplicateOfId ? <input type="hidden" name="duplicateOfId" value={duplicateOfId} /> : null}

                <div className="space-y-2">
                  <Label htmlFor={`${formId}-short-name`}>{dictionary.shortNameLabel}</Label>
                  <Input
                    id={`${formId}-short-name`}
                    name="shortName"
                    maxLength={30}
                    value={draft.shortName}
                    placeholder={dictionary.shortNamePlaceholder}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, shortName: event.target.value }))
                    }
                    required
                    disabled={pending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`${formId}-question`}>{dictionary.questionLabel}</Label>
                  <Textarea
                    id={`${formId}-question`}
                    name="question"
                    rows={1}
                    maxLength={255}
                    className="min-h-8 resize-y"
                    value={draft.question}
                    placeholder={dictionary.questionPlaceholder}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, question: event.target.value }))
                    }
                    required
                    disabled={pending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`${formId}-type`}>{dictionary.typeLabel}</Label>
                  <div id={`${formId}-type`}>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full justify-between"
                            disabled={pending}
                            aria-label={dictionary.typeLabel}
                          >
                            <span>{draft.type === "0" ? dictionary.typeEnum : dictionary.typeInteger}</span>
                            <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="start" className="min-w-[var(--anchor-width)]">
                        <DropdownMenuRadioGroup
                          value={draft.type}
                          onValueChange={(value) => {
                            if (value === "0" || value === "1") {
                              setDraft((current) => ({ ...current, type: value, points: value === "1" ? "0" : "" }));
                            }
                          }}
                        >
                          <DropdownMenuRadioItem value="0">{dictionary.typeEnum}</DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="1">{dictionary.typeInteger}</DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {isEnumType ? (
                  <div className="space-y-2">
                    <Label htmlFor={`${formId}-enum-possibilities`}>
                      {dictionary.enumPossibilitiesLabel}
                    </Label>
                    <Textarea
                      id={`${formId}-enum-possibilities`}
                      name="enumPossibilities"
                      maxLength={511}
                      rows={1}
                      className="min-h-8 resize-y"
                      value={draft.enumPossibilities}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          enumPossibilities: event.target.value,
                        }))
                      }
                      placeholder={dictionary.enumPossibilitiesPlaceholder}
                      required
                      disabled={pending}
                    />
                  </div>
                ) : null}

                {pointSystemEnabled ? (
                  <PointsField
                    id={`${formId}-points`}
                    isEnumType={isEnumType}
                    value={draft.points}
                    onChange={(points) => setDraft((current) => ({ ...current, points }))}
                    disabled={pending}
                    dictionary={dictionary}
                  />
                ) : null}

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={handleCancelCreate}
                    disabled={pending}
                  >
                    {dictionary.cancelButton}
                  </Button>
                  <Button type="submit" className="w-full sm:w-auto" disabled={pending || !isFormValid}>
                    {dictionary.saveButton}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : null}

        {state.status === "success" ? (
          <p className="text-sm text-muted-foreground">{dictionary.saveSuccess}</p>
        ) : null}
        {state.status === "error" ? (
          <p className="text-sm text-destructive">{dictionary.saveError}</p>
        ) : null}
        {reorderState.status === "success" && !isReordering ? (
          <p className="text-sm text-muted-foreground">{dictionary.reorderSaveSuccess}</p>
        ) : null}
        {reorderState.status === "error" ? (
          <p className="text-sm text-destructive">{dictionary.reorderSaveError}</p>
        ) : null}
        {updateState.status === "success" && editingId === null ? (
          <p className="text-sm text-muted-foreground">{dictionary.updateSuccess}</p>
        ) : null}
        {updateState.status === "error" ? (
          <p className="text-sm text-destructive">{dictionary.updateError}</p>
        ) : null}
        {disableState.status === "disabled" ? (
          <p className="text-sm text-muted-foreground">{dictionary.disableSuccess}</p>
        ) : null}
        {disableState.status === "enabled" ? (
          <p className="text-sm text-muted-foreground">{dictionary.enableSuccess}</p>
        ) : null}
        {disableState.status === "error" ? (
          <p className="text-sm text-destructive">{dictionary.disableError}</p>
        ) : null}

        {visibleRows.length === 0 && !isAddingNew && !isReordering ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
            {dictionary.noEntries}
          </p>
        ) : null}

        {isReordering ? (
          <form action={reorderFormAction} className="space-y-4">
            <input type="hidden" name="lang" value={lang} />
            <input type="hidden" name="orderedIds" value={JSON.stringify(orderedRows.map((row) => row.id))} />
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={orderedRows.map((row) => row.id)} strategy={verticalListSortingStrategy}>
                {orderedRows.map((row) => (
                  <SortablePerformanceMetricCard
                    key={row.id}
                    lang={lang}
                    row={row}
                    dictionary={dictionary}
                    disabled={reorderPending}
                  />
                ))}
              </SortableContext>
            </DndContext>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={handleCancelReorder}
                disabled={reorderPending}
              >
                {dictionary.reorderCancelButton}
              </Button>
              <Button type="submit" className="w-full sm:w-auto" disabled={reorderPending}>
                {dictionary.reorderSaveButton}
              </Button>
            </div>
          </form>
        ) : (
          visibleRows.map((row) =>
            editingId === row.id ? (
              <EditPerformanceMetricCard
                key={row.id}
                lang={lang}
                row={row}
                dictionary={dictionary}
                pointSystemEnabled={pointSystemEnabled}
                formAction={updateFormAction}
                pending={updatePending}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <Card key={row.id} className={row.disableTimestamp ? "opacity-60" : undefined}>
                <CardHeader>
                  <CardTitle className={row.disableTimestamp ? "text-muted-foreground line-through" : undefined}>
                    {row.shortName}
                  </CardTitle>
                  <CardAction>
                    <PerformanceMetricCardActions
                      lang={lang}
                      row={row}
                      dictionary={dictionary}
                      disabled={isBusy}
                      disableFormAction={disableFormAction}
                      onEdit={() => setEditingId(row.id)}
                      onDuplicate={() => handleDuplicate(row)}
                    />
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <PerformanceMetricDetails lang={lang} row={row} dictionary={dictionary} />
                </CardContent>
              </Card>
            ),
          )
        )}
      </div>
    </section>
  );
}
