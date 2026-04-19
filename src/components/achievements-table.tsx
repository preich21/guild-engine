"use client";

import Image from "next/image";
import { ChevronDown, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type {
  AchievementEntry,
  CreateAchievementActionState,
} from "@/app/[lang]/admin/achievements/actions";
import {
  ACHIEVEMENT_CRITERIA_TYPES,
  ACHIEVEMENT_IMAGE_SIZE,
  ACHIEVEMENT_LEADERBOARDS,
  ACHIEVEMENT_METRICS,
  ACHIEVEMENT_OPERATORS,
  ACHIEVEMENT_TITLE_MAX_LENGTH,
  getDefaultAchievementCriteriaInput,
  parseAchievementDuration,
  toAchievementCriteriaInput,
  validateAchievementInput,
  type AchievementCriteria,
  type AchievementCriteriaInput,
  type AchievementCriteriaType,
  type AchievementLeaderboard,
  type AchievementMetric,
  type AchievementOperator,
} from "@/lib/achievements";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import type { Locale } from "@/i18n/config";

type DraftAchievement = {
  title: string;
  description: string;
  image: string;
  criteria: AchievementCriteriaInput;
};

type AchievementsTableProps = {
  lang: Locale;
  rows: AchievementEntry[];
  createAction: (
    state: CreateAchievementActionState,
    formData: FormData,
  ) => Promise<CreateAchievementActionState>;
  updateAction: (lang: unknown, id: unknown, input: DraftAchievement) => Promise<boolean>;
  deleteAction: (lang: unknown, id: unknown) => Promise<boolean>;
  dictionary: {
    heading: string;
    addNewButton: string;
    noEntries: string;
    titleLabel: string;
    descriptionLabel: string;
    imageLabel: string;
    criteriaLabel: string;
    idLabel: string;
    newCardTitle: string;
    imageUploadButton: string;
    imageUploadHint: string;
    imageRequirementHint: string;
    titlePlaceholder: string;
    descriptionPlaceholder: string;
    manualAwardedLabel: string;
    basedOnMetricsLabel: string;
    basedOnPositionLabel: string;
    metricLabel: string;
    metricPoints: string;
    metricAttendanceAny: string;
    metricAttendanceVirtually: string;
    metricAttendanceOnSite: string;
    metricProtocolForced: string;
    metricProtocolVoluntary: string;
    metricProtocolAny: string;
    metricModeration: string;
    metricWorkingGroup: string;
    metricTwl: string;
    metricPresentations: string;
    typeLabel: string;
    typePlaceholder: string;
    typeCount: string;
    typeStreak: string;
    timeFrameLabel: string;
    timeFramePlaceholder: string;
    timeFrameParsedHint: string;
    timeFrameInvalid: string;
    operatorLabel: string;
    countLabel: string;
    countPlaceholder: string;
    leaderboardLabel: string;
    leaderboardIndividual: string;
    leaderboardTeam: string;
    positionLabel: string;
    positionPlaceholder: string;
    allTimeLabel: string;
    manualAwardedSummary: string;
    basedOnMetricsSummary: string;
    basedOnPositionSummary: string;
    durationYearSingular: string;
    durationYearPlural: string;
    durationMonthSingular: string;
    durationMonthPlural: string;
    durationWeekSingular: string;
    durationWeekPlural: string;
    durationDaySingular: string;
    durationDayPlural: string;
    durationHourSingular: string;
    durationHourPlural: string;
    durationAnd: string;
    cancelButton: string;
    saveButton: string;
    saveSuccess: string;
    saveError: string;
    updateSuccess: string;
    updateError: string;
    validationError: string;
    editButtonAriaLabel: string;
    deleteButtonAriaLabel: string;
    deletePopoverTitle: string;
    deletePopoverDescription: string;
    deleteConfirmButton: string;
    deleteError: string;
  };
};

const initialState: CreateAchievementActionState = { status: "idle" };

const defaultDraftAchievement = (): DraftAchievement => ({
  title: "",
  description: "",
  image: "",
  criteria: getDefaultAchievementCriteriaInput(),
});

const defaultDefinedCriteria = (): Extract<AchievementCriteriaInput, { mode: "defined" }> => ({
  mode: "defined",
  metric: ACHIEVEMENT_METRICS[0],
  type: ACHIEVEMENT_CRITERIA_TYPES[0],
  timeFrame: "",
  operator: ">=",
  count: "",
});

const defaultPositionCriteria = (): Extract<AchievementCriteriaInput, { mode: "position" }> => ({
  mode: "position",
  leaderboard: ACHIEVEMENT_LEADERBOARDS[0],
  operator: "<=",
  position: "",
});

const resizeImageToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new window.Image();

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = ACHIEVEMENT_IMAGE_SIZE;
      canvas.height = ACHIEVEMENT_IMAGE_SIZE;

      const context = canvas.getContext("2d");

      if (!context) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Missing canvas context"));
        return;
      }

      const scale = Math.max(
        ACHIEVEMENT_IMAGE_SIZE / image.width,
        ACHIEVEMENT_IMAGE_SIZE / image.height,
      );
      const width = image.width * scale;
      const height = image.height * scale;
      const x = (ACHIEVEMENT_IMAGE_SIZE - width) / 2;
      const y = (ACHIEVEMENT_IMAGE_SIZE - height) / 2;

      context.clearRect(0, 0, ACHIEVEMENT_IMAGE_SIZE, ACHIEVEMENT_IMAGE_SIZE);
      context.drawImage(image, x, y, width, height);

      const dataUrl = canvas.toDataURL("image/webp", 0.9);

      URL.revokeObjectURL(objectUrl);
      resolve(dataUrl);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not load image"));
    };

    image.src = objectUrl;
  });

export function AchievementsTable({
  lang,
  rows,
  createAction,
  updateAction,
  deleteAction,
  dictionary,
}: AchievementsTableProps) {
  const metricLabels: Record<AchievementMetric, string> = {
    points: dictionary.metricPoints,
    attendanceAny: dictionary.metricAttendanceAny,
    attendanceVirtually: dictionary.metricAttendanceVirtually,
    attendanceOnSite: dictionary.metricAttendanceOnSite,
    protocolForced: dictionary.metricProtocolForced,
    protocolVoluntary: dictionary.metricProtocolVoluntary,
    protocolAny: dictionary.metricProtocolAny,
    moderation: dictionary.metricModeration,
    workingGroup: dictionary.metricWorkingGroup,
    twl: dictionary.metricTwl,
    presentations: dictionary.metricPresentations,
  };
  const criteriaTypeLabels: Record<AchievementCriteriaType, string> = {
    count: dictionary.typeCount,
    streak: dictionary.typeStreak,
  };
  const operatorLabels: Record<AchievementOperator, string> = {
    "<": "<",
    "<=": "<=",
    "==": "==",
    ">=": ">=",
    ">": ">",
  };
  const leaderboardLabels: Record<AchievementLeaderboard, string> = {
    individual: dictionary.leaderboardIndividual,
    team: dictionary.leaderboardTeam,
  };
  const durationLabels = {
    years: [dictionary.durationYearSingular, dictionary.durationYearPlural],
    months: [dictionary.durationMonthSingular, dictionary.durationMonthPlural],
    weeks: [dictionary.durationWeekSingular, dictionary.durationWeekPlural],
    days: [dictionary.durationDaySingular, dictionary.durationDayPlural],
    hours: [dictionary.durationHourSingular, dictionary.durationHourPlural],
  } as const;
  const router = useRouter();
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingAchievementId, setEditingAchievementId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftAchievement>(() => defaultDraftAchievement());
  const [imageError, setImageError] = useState(false);
  const [showTimeFrameFeedback, setShowTimeFrameFeedback] = useState(false);
  const [confirmingDeleteRowId, setConfirmingDeleteRowId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState(false);
  const [updateError, setUpdateError] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [state, formAction, createPending] = useActionState(
    async (previousState: CreateAchievementActionState, formData: FormData) => {
      const nextState = await createAction(previousState, formData);

      if (nextState.status === "success") {
        setDraft(defaultDraftAchievement());
        setImageError(false);
        setShowTimeFrameFeedback(false);
        setIsAddingNew(false);
        setUpdateError(false);
        setUpdateSuccess(false);
        router.refresh();
      }

      return nextState;
    },
    initialState,
  );
  const [isDeletePending, startDeleteTransition] = useTransition();
  const [isUpdatePending, startUpdateTransition] = useTransition();

  const isBusy = createPending || isDeletePending || isUpdatePending;
  const validation = validateAchievementInput(draft);
  const isFormValid = validation.isValid && !imageError;

  const resetEditorState = () => {
    setDraft(defaultDraftAchievement());
    setEditingAchievementId(null);
    setIsAddingNew(false);
    setImageError(false);
    setShowTimeFrameFeedback(false);
  };

  const handleCancelEditor = () => {
    resetEditorState();
  };

  const handleImageChange = async (file: File | null) => {
    if (!file) {
      setDraft((currentDraft) => ({ ...currentDraft, image: "" }));
      setImageError(false);
      return;
    }

    try {
      const image = await resizeImageToBase64(file);
      setDraft((currentDraft) => ({ ...currentDraft, image }));
      setImageError(false);
    } catch {
      setDraft((currentDraft) => ({ ...currentDraft, image: "" }));
      setImageError(true);
    }
  };

  const handleDeleteAchievement = (achievementId: string) => {
    setDeleteError(false);

    startDeleteTransition(async () => {
      const deleted = await deleteAction(lang, achievementId);

      if (!deleted) {
        setDeleteError(true);
        return;
      }

      setConfirmingDeleteRowId(null);
      router.refresh();
    });
  };

  const handleStartCreate = () => {
    setDeleteError(false);
    setUpdateError(false);
    setUpdateSuccess(false);
    setIsAddingNew(true);
    setEditingAchievementId(null);
    setDraft(defaultDraftAchievement());
    setImageError(false);
    setShowTimeFrameFeedback(false);
  };

  const handleStartEdit = (row: AchievementEntry) => {
    setDeleteError(false);
    setUpdateError(false);
    setUpdateSuccess(false);
    setIsAddingNew(false);
    setEditingAchievementId(row.id);
    setDraft({
      title: row.title,
      description: row.description ?? "",
      image: row.image,
      criteria: toAchievementCriteriaInput(row.criteria),
    });
    setImageError(false);
    setShowTimeFrameFeedback(false);
  };

  const handleUpdateAchievement = () => {
    if (!editingAchievementId || !isFormValid) {
      return;
    }

    setUpdateError(false);
    setUpdateSuccess(false);

    startUpdateTransition(async () => {
      const updated = await updateAction(lang, editingAchievementId, draft);

      if (!updated) {
        setUpdateError(true);
        return;
      }

      resetEditorState();
      setUpdateSuccess(true);
      router.refresh();
    });
  };

  const handleCriteriaModeChange = (value: string) => {
    setShowTimeFrameFeedback(false);
    setDraft((currentDraft) => ({
      ...currentDraft,
      criteria:
        value === "defined"
          ? defaultDefinedCriteria()
          : value === "position"
            ? defaultPositionCriteria()
            : { mode: "manual" },
    }));
  };

  const handleDefinedCriteriaChange = <
    Key extends keyof Extract<AchievementCriteriaInput, { mode: "defined" }>,
  >(
    key: Key,
    value: Extract<AchievementCriteriaInput, { mode: "defined" }>[Key],
  ) => {
    setDraft((currentDraft) => {
      if (currentDraft.criteria.mode !== "defined") {
        return currentDraft;
      }

      return {
        ...currentDraft,
        criteria: {
          ...currentDraft.criteria,
          [key]: value,
        },
      };
    });
  };

  const handlePositionCriteriaChange = <
    Key extends keyof Extract<AchievementCriteriaInput, { mode: "position" }>,
  >(
    key: Key,
    value: Extract<AchievementCriteriaInput, { mode: "position" }>[Key],
  ) => {
    setDraft((currentDraft) => {
      if (currentDraft.criteria.mode !== "position") {
        return currentDraft;
      }

      return {
        ...currentDraft,
        criteria: {
          ...currentDraft.criteria,
          [key]: value,
        },
      };
    });
  };

  const renderSingleSelect = <Value extends string>({
    value,
    values,
    valueLabels,
    label,
    disabled,
    onValueChange,
  }: {
    value: Value;
    values: readonly Value[];
    valueLabels: Record<Value, string>;
    label: string;
    disabled: boolean;
    onValueChange: (nextValue: Value) => void;
  }) => (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className="w-full justify-between"
            aria-label={label}
            title={label}
          >
            <span>{valueLabels[value]}</span>
            <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="min-w-56">
        <DropdownMenuRadioGroup value={value} onValueChange={(nextValue) => onValueChange(nextValue as Value)}>
          {values.map((option) => (
            <DropdownMenuRadioItem key={option} value={option}>
              {valueLabels[option]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const formatDurationForDisplay = (input: string) => {
    const parsedDuration = parseAchievementDuration(input);

    if (!parsedDuration) {
      return input;
    }

    const parts = (
      [
        ["years", parsedDuration.years],
        ["months", parsedDuration.months],
        ["weeks", parsedDuration.weeks],
        ["days", parsedDuration.days],
        ["hours", parsedDuration.hours],
      ] as const
    ).flatMap(([unit, amount]) => {
      if (!amount) {
        return [];
      }

      const [singular, plural] = durationLabels[unit];
      return [`${amount} ${amount === 1 ? singular : plural}`];
    });

    if (parts.length === 0) {
      return input;
    }

    if (parts.length === 1) {
      return parts[0];
    }

    return `${parts.slice(0, -1).join(", ")} ${dictionary.durationAnd} ${parts[parts.length - 1]}`;
  };

  const formatCriteriaTimeFrame = (criteria: AchievementCriteria) => {
    if (criteria.mode !== "defined" || !criteria.timeFrame) {
      return dictionary.allTimeLabel;
    }

    return formatDurationForDisplay(criteria.timeFrame);
  };

  const timeFrameFeedback =
    draft.criteria.mode === "defined" && draft.criteria.timeFrame.trim() !== ""
      ? parseAchievementDuration(draft.criteria.timeFrame)
      : null;

  const renderEditorCard = (mode: "create" | "edit") => {
    const idPrefix = mode === "create" ? "new-achievement" : `edit-achievement-${editingAchievementId ?? "draft"}`;

    return (
      <Card className="border border-border bg-background">
        <CardHeader>
          <CardTitle>{mode === "create" ? dictionary.newCardTitle : draft.title || dictionary.editButtonAriaLabel}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{dictionary.imageRequirementHint}</p>

          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-image-upload`}>{dictionary.imageLabel}</Label>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex size-21 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
                {draft.image ? (
                  <Image
                    src={draft.image}
                    alt=""
                    width={ACHIEVEMENT_IMAGE_SIZE}
                    height={ACHIEVEMENT_IMAGE_SIZE}
                    unoptimized
                    className="size-21 object-cover"
                  />
                ) : (
                  <Upload className="size-5 text-muted-foreground" aria-hidden="true" />
                )}
              </div>

              <div className="flex-1 space-y-2">
                <Input
                  id={`${idPrefix}-image-upload`}
                  type="file"
                  accept="image/*"
                  aria-label={dictionary.imageUploadButton}
                  title={dictionary.imageUploadButton}
                  disabled={isBusy}
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    void handleImageChange(file);
                  }}
                />
                <p className="text-sm text-muted-foreground">{dictionary.imageUploadHint}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-title`}>{dictionary.titleLabel}</Label>
            <Input
              id={`${idPrefix}-title`}
              value={draft.title}
              maxLength={ACHIEVEMENT_TITLE_MAX_LENGTH}
              placeholder={dictionary.titlePlaceholder}
              disabled={isBusy}
              onChange={(event) => setDraft((currentDraft) => ({ ...currentDraft, title: event.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-description`}>{dictionary.descriptionLabel}</Label>
            <Textarea
              id={`${idPrefix}-description`}
              value={draft.description}
              placeholder={dictionary.descriptionPlaceholder}
              disabled={isBusy}
              onChange={(event) =>
                setDraft((currentDraft) => ({ ...currentDraft, description: event.target.value }))
              }
            />
          </div>

          <fieldset className="space-y-3" disabled={isBusy}>
            <legend className="text-sm font-medium text-foreground">{dictionary.criteriaLabel}</legend>
            <RadioGroup
              value={draft.criteria.mode}
              onValueChange={handleCriteriaModeChange}
              disabled={isBusy}
              className="space-y-3"
            >
              <div className="flex items-center gap-3">
                <RadioGroupItem id={`${idPrefix}-criteria-manual`} value="manual" />
                <Label htmlFor={`${idPrefix}-criteria-manual`}>{dictionary.manualAwardedLabel}</Label>
              </div>
              <div className="flex items-center gap-3">
                <RadioGroupItem id={`${idPrefix}-criteria-defined`} value="defined" />
                <Label htmlFor={`${idPrefix}-criteria-defined`}>{dictionary.basedOnMetricsLabel}</Label>
              </div>
              <div className="flex items-center gap-3">
                <RadioGroupItem id={`${idPrefix}-criteria-position`} value="position" />
                <Label htmlFor={`${idPrefix}-criteria-position`}>{dictionary.basedOnPositionLabel}</Label>
              </div>
            </RadioGroup>

            {draft.criteria.mode === "defined" ? (
              <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
                <div className="space-y-2">
                  <Label>{dictionary.metricLabel}</Label>
                  {renderSingleSelect({
                    value: draft.criteria.metric as AchievementMetric,
                    values: ACHIEVEMENT_METRICS,
                    valueLabels: metricLabels,
                    label: dictionary.metricLabel,
                    disabled: isBusy,
                    onValueChange: (value) => handleDefinedCriteriaChange("metric", value),
                  })}
                </div>

                <div className="space-y-2">
                  <Label>{dictionary.typeLabel}</Label>
                  {renderSingleSelect({
                    value: draft.criteria.type as AchievementCriteriaType,
                    values: ACHIEVEMENT_CRITERIA_TYPES,
                    valueLabels: criteriaTypeLabels,
                    label: dictionary.typeLabel,
                    disabled: isBusy,
                    onValueChange: (value) => handleDefinedCriteriaChange("type", value),
                  })}
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`${idPrefix}-time-frame`}>{dictionary.timeFrameLabel}</Label>
                  <Input
                    id={`${idPrefix}-time-frame`}
                    value={draft.criteria.timeFrame}
                    placeholder={dictionary.timeFramePlaceholder}
                    disabled={isBusy}
                    onBlur={() => setShowTimeFrameFeedback(true)}
                    onChange={(event) => {
                      setShowTimeFrameFeedback(false);
                      handleDefinedCriteriaChange("timeFrame", event.target.value);
                    }}
                  />
                  {showTimeFrameFeedback && draft.criteria.timeFrame.trim() !== "" ? (
                    timeFrameFeedback ? (
                      <p className="text-sm text-muted-foreground">
                        {dictionary.timeFrameParsedHint.replace(
                          "{duration}",
                          formatDurationForDisplay(timeFrameFeedback.normalized),
                        )}
                      </p>
                    ) : (
                      <p className="text-sm text-destructive">{dictionary.timeFrameInvalid}</p>
                    )
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label>{dictionary.operatorLabel}</Label>
                  {renderSingleSelect({
                    value: draft.criteria.operator as AchievementOperator,
                    values: ACHIEVEMENT_OPERATORS,
                    valueLabels: operatorLabels,
                    label: dictionary.operatorLabel,
                    disabled: isBusy,
                    onValueChange: (value) => handleDefinedCriteriaChange("operator", value),
                  })}
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`${idPrefix}-count`}>{dictionary.countLabel}</Label>
                  <Input
                    id={`${idPrefix}-count`}
                    type="number"
                    min={1}
                    step={1}
                    inputMode="numeric"
                    value={draft.criteria.count}
                    placeholder={dictionary.countPlaceholder}
                    disabled={isBusy}
                    onChange={(event) => handleDefinedCriteriaChange("count", event.target.value)}
                  />
                </div>
              </div>
            ) : null}

            {draft.criteria.mode === "position" ? (
              <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
                <div className="space-y-2">
                  <Label>{dictionary.leaderboardLabel}</Label>
                  {renderSingleSelect({
                    value: draft.criteria.leaderboard as AchievementLeaderboard,
                    values: ACHIEVEMENT_LEADERBOARDS,
                    valueLabels: leaderboardLabels,
                    label: dictionary.leaderboardLabel,
                    disabled: isBusy,
                    onValueChange: (value) => handlePositionCriteriaChange("leaderboard", value),
                  })}
                </div>

                <div className="space-y-2">
                  <Label>{dictionary.operatorLabel}</Label>
                  {renderSingleSelect({
                    value: draft.criteria.operator as AchievementOperator,
                    values: ACHIEVEMENT_OPERATORS,
                    valueLabels: operatorLabels,
                    label: dictionary.operatorLabel,
                    disabled: isBusy,
                    onValueChange: (value) => handlePositionCriteriaChange("operator", value),
                  })}
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`${idPrefix}-position`}>{dictionary.positionLabel}</Label>
                  <Input
                    id={`${idPrefix}-position`}
                    type="number"
                    min={1}
                    step={1}
                    inputMode="numeric"
                    value={draft.criteria.position}
                    placeholder={dictionary.positionPlaceholder}
                    disabled={isBusy}
                    onChange={(event) => handlePositionCriteriaChange("position", event.target.value)}
                  />
                </div>
              </div>
            ) : null}
          </fieldset>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelEditor}
              disabled={isBusy}
              className="w-full sm:w-auto"
            >
              {dictionary.cancelButton}
            </Button>
            {mode === "create" ? (
              <Button type="submit" disabled={isBusy || !isFormValid} className="w-full sm:w-auto">
                {dictionary.saveButton}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleUpdateAchievement}
                disabled={isBusy || !isFormValid}
                className="w-full sm:w-auto"
              >
                {dictionary.saveButton}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <section className="w-full space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{dictionary.heading}</h1>
        <Button
          type="button"
          variant="outline"
          onClick={handleStartCreate}
          disabled={isBusy || isAddingNew || editingAchievementId !== null}
          className="w-full sm:w-auto"
        >
          <Plus />
          {dictionary.addNewButton}
        </Button>
      </div>

      {isAddingNew ? (
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="lang" value={lang} />
          <input type="hidden" name="title" value={draft.title} />
          <input type="hidden" name="description" value={draft.description} />
          <input type="hidden" name="image" value={draft.image} />
          <input type="hidden" name="criteria" value={JSON.stringify(draft.criteria)} />
          {renderEditorCard("create")}
        </form>
      ) : null}

      {rows.length === 0 ? <p className="text-sm text-muted-foreground">{dictionary.noEntries}</p> : null}

      <div className="space-y-3">
        {rows.map((row) =>
          editingAchievementId === row.id ? (
            <div key={row.id}>{renderEditorCard("edit")}</div>
          ) : (
            <Card key={row.id} className="border border-border bg-background">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="flex size-21 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
                    <Image
                      src={row.image}
                      alt=""
                      width={ACHIEVEMENT_IMAGE_SIZE}
                      height={ACHIEVEMENT_IMAGE_SIZE}
                      unoptimized
                      className="size-21 object-cover"
                    />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <CardTitle className="wrap-break-word">{row.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{dictionary.idLabel}: </span>
                      <span className="font-mono text-xs">{row.id}</span>
                    </p>
                  </div>
                </div>
                <CardAction className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={dictionary.editButtonAriaLabel}
                    title={dictionary.editButtonAriaLabel}
                    onClick={() => handleStartEdit(row)}
                    disabled={isBusy || isAddingNew || editingAchievementId !== null}
                  >
                    <Pencil />
                  </Button>

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
                            setConfirmingDeleteRowId(row.id);
                          }}
                          disabled={isBusy || editingAchievementId !== null}
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 />
                        </Button>
                      }
                    />
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
                          onClick={() => handleDeleteAchievement(row.id)}
                          disabled={isBusy}
                        >
                          {dictionary.deleteConfirmButton}
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </CardAction>
              </CardHeader>
              <CardContent className="space-y-3">
                {row.description ? (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">{dictionary.descriptionLabel}</p>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">{row.description}</p>
                  </div>
                ) : null}
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">{dictionary.criteriaLabel}</p>
                  {row.criteria.mode === "manual" ? (
                    <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                      {dictionary.manualAwardedSummary}
                    </p>
                  ) : row.criteria.mode === "defined" ? (
                    <div className="space-y-2 rounded-lg border border-border bg-muted/40 px-3 py-3 text-sm text-muted-foreground">
                      <p>
                        <span className="font-medium text-foreground">{dictionary.basedOnMetricsSummary}: </span>
                        {metricLabels[row.criteria.metric]}
                      </p>
                      <p>
                        <span className="font-medium text-foreground">{dictionary.typeLabel}: </span>
                        {criteriaTypeLabels[row.criteria.type]}
                      </p>
                      <p>
                        <span className="font-medium text-foreground">{dictionary.timeFrameLabel}: </span>
                        {formatCriteriaTimeFrame(row.criteria)}
                      </p>
                      <p>
                        <span className="font-medium text-foreground">{dictionary.operatorLabel}: </span>
                        {row.criteria.operator}
                      </p>
                      <p>
                        <span className="font-medium text-foreground">{dictionary.countLabel}: </span>
                        {row.criteria.count}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 rounded-lg border border-border bg-muted/40 px-3 py-3 text-sm text-muted-foreground">
                      <p>
                        <span className="font-medium text-foreground">{dictionary.basedOnPositionSummary}: </span>
                        {leaderboardLabels[row.criteria.leaderboard]}
                      </p>
                      <p>
                        <span className="font-medium text-foreground">{dictionary.operatorLabel}: </span>
                        {row.criteria.operator}
                      </p>
                      <p>
                        <span className="font-medium text-foreground">{dictionary.positionLabel}: </span>
                        {row.criteria.position}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ),
        )}
      </div>

      {state.status === "success" ? (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">{dictionary.saveSuccess}</p>
      ) : null}
      {updateSuccess ? (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">{dictionary.updateSuccess}</p>
      ) : null}
      {state.status === "error" || imageError ? (
        <p className="text-sm text-destructive">
          {imageError ? dictionary.validationError : dictionary.saveError}
        </p>
      ) : null}
      {updateError ? <p className="text-sm text-destructive">{dictionary.updateError}</p> : null}
      {!isFormValid && (isAddingNew || editingAchievementId !== null) && !imageError ? (
        <p className="text-sm text-muted-foreground">{dictionary.validationError}</p>
      ) : null}
      {deleteError ? <p className="text-sm text-destructive">{dictionary.deleteError}</p> : null}
    </section>
  );
}
