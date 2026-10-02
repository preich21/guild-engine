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
import { ArrowUpDown, ChevronDown, GripVertical, Plus } from "lucide-react";
import { useActionState, useId, useState } from "react";
import { useRouter } from "next/navigation";

import type {
  CreatePerformanceMetricActionState,
  PerformanceMetricEntry,
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
import { Textarea } from "@/components/ui/textarea";
import type { Locale } from "@/i18n/config";

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

function PerformanceMetricDetails({
  row,
  dictionary,
}: {
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
        <dd className="break-words text-muted-foreground">{row.timestampAdded}</dd>
      </div>
      <div className="flex flex-col gap-1 sm:flex-row sm:gap-2">
        <dt className="font-medium text-foreground">{dictionary.typeLabel}:</dt>
        <dd className="text-muted-foreground">{getTypeLabel(row.type, dictionary)}</dd>
      </div>
    </dl>
  );
}

function SortablePerformanceMetricCard({
  row,
  dictionary,
  disabled,
}: {
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
      className={isDragging ? "relative z-10 opacity-60 ring-2 ring-ring" : undefined}
    >
      <CardHeader>
        <CardTitle>{row.shortName}</CardTitle>
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
        <PerformanceMetricDetails row={row} dictionary={dictionary} />
      </CardContent>
    </Card>
  );
}

export function PerformanceMetricConfigList({
  lang,
  rows,
  createAction,
  reorderAction,
  dictionary,
}: PerformanceMetricConfigListProps) {
  const formId = useId();
  const router = useRouter();
  const pointSystemEnabled = Boolean(useFeatureEnabled("point-system"));
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [draft, setDraft] = useState<DraftPerformanceMetric>(() => defaultDraft());
  const [state, formAction, pending] = useActionState(
    async (previousState: CreatePerformanceMetricActionState, formData: FormData) => {
      const nextState = await createAction(previousState, formData);

      if (nextState.status === "success") {
        setDraft(defaultDraft());
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
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const isEnumType = draft.type === "0";
  const enumPossibilityValues = splitSemicolonValues(draft.enumPossibilities);
  const enumPointValues = splitSemicolonValues(draft.points);
  const isPointsValid =
    !pointSystemEnabled ||
    (isEnumType
      ? enumPointValues.length > 0 &&
        enumPointValues.length === enumPossibilityValues.length &&
        enumPointValues.every(isNonNegativeIntegerString)
      : isNonNegativeIntegerString(draft.points));
  const isFormValid =
    draft.shortName.trim() !== "" &&
    draft.shortName.length <= 30 &&
    draft.question.trim() !== "" &&
    draft.question.length <= 255 &&
    (!isEnumType || (draft.enumPossibilities.trim() !== "" && draft.enumPossibilities.length <= 511)) &&
    draft.points.length <= 255 &&
    isPointsValid;

  const handleStartCreate = () => {
    setDraft(defaultDraft());
    setIsAddingNew(true);
  };

  const handleCancelCreate = () => {
    setDraft(defaultDraft());
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
        <div className="flex shrink-0 gap-2">
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={handleStartReorder}
            disabled={isReordering || isAddingNew || pending || rows.length < 2}
            aria-label={dictionary.reorderButton}
            title={dictionary.reorderButton}
          >
            <ArrowUpDown className="size-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={handleStartCreate}
            disabled={isAddingNew || isReordering || pending}
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
                  isEnumType ? (
                    <div className="space-y-2">
                      <Label htmlFor={`${formId}-points`}>{dictionary.enumPointsLabel}</Label>
                      <Textarea
                        id={`${formId}-points`}
                        name="points"
                        maxLength={255}
                        rows={1}
                        className="min-h-8 resize-y"
                        value={draft.points}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            points: event.target.value,
                          }))
                        }
                        placeholder={dictionary.enumPointsPlaceholder}
                        required
                        disabled={pending}
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor={`${formId}-points`}>{dictionary.integerPointsLabel}</Label>
                      <Input
                        id={`${formId}-points`}
                        name="points"
                        type="number"
                        min={0}
                        step={1}
                        value={draft.points}
                        onChange={(event) => {
                          const nextValue = event.target.valueAsNumber;
                          setDraft((current) => ({
                            ...current,
                            points: Number.isNaN(nextValue)
                              ? "0"
                              : String(Math.max(0, Math.trunc(nextValue))),
                          }));
                        }}
                        required
                        disabled={pending}
                      />
                    </div>
                  )
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

        {rows.length === 0 && !isAddingNew ? (
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
          rows.map((row) => (
            <Card key={row.id}>
              <CardHeader>
                <CardTitle>{row.shortName}</CardTitle>
                <CardAction />
              </CardHeader>
              <CardContent>
                <PerformanceMetricDetails row={row} dictionary={dictionary} />
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </section>
  );
}
