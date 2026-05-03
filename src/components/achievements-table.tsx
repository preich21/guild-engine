"use client";

import Image from "next/image";
import { CalendarIcon, ChevronDown, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { useActionState, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import featureConfiguration from "@/config/feature-configuration.json";
import type {
  AchievementEntry,
  AchievementPerformanceMetricEntry,
  CreateAchievementActionState,
} from "@/app/[lang]/admin/achievements/actions";
import {
  ACHIEVEMENT_CRITERIA_TYPES,
  ACHIEVEMENT_IMAGE_SIZE,
  ACHIEVEMENT_TITLE_MAX_LENGTH,
  getDefaultAchievementCriteriaInput,
  isValidAchievementTimeFrame,
  parseAchievementDateKey,
  splitEnumPossibilities,
  toAchievementCriteriaInput,
  validateAchievementInput,
  type AchievementCriteria,
  type AchievementCriteriaInput,
  type AchievementCriteriaType,
  type AchievementFeature,
  type AchievementLeaderboard,
} from "@/lib/achievements";
import { useFeatureConfig } from "@/components/feature-config-provider";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
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
import {
  getAchievementableFeatures,
  getAchievementablePowerups,
  type AchievementableFeatureId,
} from "@/lib/feature-flags";

type DraftAchievement = {
  title: string;
  description: string;
  image: string;
  criteria: AchievementCriteriaInput;
};

type AchievementsTableProps = {
  lang: Locale;
  rows: AchievementEntry[];
  performanceMetrics: AchievementPerformanceMetricEntry[];
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
    basedOnFeatureLabel: string;
    basedOnPositionLabel: string;
    featureLabel: string;
    featurePoints: string;
    featureIndividualLeaderboardPosition: string;
    featureTeamLeaderboardPosition: string;
    featureLevel: string;
    featureAchievementsCount: string;
    featurePowerupUsage: string;
    valueLabel: string;
    powerupLabel: string;
    metricLabel: string;
    validValuesLabel: string;
    validValuesAtLeastLabel: string;
    validValuesPlaceholder: string;
    typeLabel: string;
    typePlaceholder: string;
    typeCount: string;
    typeStreak: string;
    timeFrameLabel: string;
    timeFrameFromLabel: string;
    timeFrameToLabel: string;
    datePickerPlaceholder: string;
    timeFrameInvalid: string;
    operatorLabel: string;
    countLabel: string;
    streakDurationLabel: string;
    countPlaceholder: string;
    leaderboardLabel: string;
    leaderboardIndividual: string;
    leaderboardTeam: string;
    positionLabel: string;
    positionPlaceholder: string;
    allTimeLabel: string;
    manualAwardedSummary: string;
    basedOnMetricsSummary: string;
    basedOnFeatureSummary: string;
    basedOnPositionSummary: string;
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

const getDefaultValidValuesInput = (metric: AchievementPerformanceMetricEntry | undefined) =>
  metric?.type === 0 ? [] : "0";

const defaultDefinedCriteria = (
  performanceMetrics: AchievementPerformanceMetricEntry[],
): Extract<AchievementCriteriaInput, { mode: "defined" }> => ({
  mode: "defined",
  metric: performanceMetrics[0]?.id ?? "",
  validValues: getDefaultValidValuesInput(performanceMetrics[0]),
  type: ACHIEVEMENT_CRITERIA_TYPES[0],
  timeFrameFrom: "",
  timeFrameTo: "",
  count: "",
});

const defaultFeatureCriteria = (
  features: Array<{ type: AchievementableFeatureId }>,
  powerups: Array<{ id: string }>,
): Extract<AchievementCriteriaInput, { mode: "feature" }> => {
  const feature = features[0]?.type ?? "";

  return {
    mode: "feature",
    feature,
    value: "0",
    powerup: feature === "powerup-usage" ? powerups[0]?.id ?? "" : "",
    timeFrameFrom: "",
    timeFrameTo: "",
  };
};

type LocalizedText = Record<Locale, string>;

const localize = (value: LocalizedText, lang: Locale) => value[lang] ?? value.en;

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

const toDateKey = (value: Date) => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addDays = (value: Date, days: number) => {
  const nextDate = new Date(value);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
};

export function AchievementsTable({
  lang,
  rows,
  performanceMetrics,
  createAction,
  updateAction,
  deleteAction,
  dictionary,
}: AchievementsTableProps) {
  const { state: featureConfigState } = useFeatureConfig();
  const achievementableFeatures = useMemo(
    () => getAchievementableFeatures(featureConfigState),
    [featureConfigState],
  );
  const achievementablePowerups = useMemo(
    () => getAchievementablePowerups(featureConfigState),
    [featureConfigState],
  );
  const powerupLabels = useMemo(() => {
    const powerupFeature = featureConfiguration.features.find((feature) => feature.id === "powerups");

    return Object.fromEntries(
      (powerupFeature?.configuration ?? []).flatMap((setting) =>
        "label" in setting ? [[setting.id, localize(setting.label as LocalizedText, lang)]] : [],
      ),
    );
  }, [lang]);
  const performanceMetricsById = useMemo(
    () => new Map(performanceMetrics.map((metric) => [metric.id, metric])),
    [performanceMetrics],
  );
  const metricLabels = useMemo(
    () => Object.fromEntries(performanceMetrics.map((metric) => [metric.id, metric.shortName])),
    [performanceMetrics],
  );
  const criteriaTypeLabels: Record<AchievementCriteriaType, string> = {
    count: dictionary.typeCount,
    streak: dictionary.typeStreak,
  };
  const featureLabels: Record<AchievementableFeatureId, string> = {
    points: dictionary.featurePoints,
    "individual-leaderboard-position": dictionary.featureIndividualLeaderboardPosition,
    "team-leaderboard-position": dictionary.featureTeamLeaderboardPosition,
    level: dictionary.featureLevel,
    "achievements-count": dictionary.featureAchievementsCount,
    "powerup-usage": dictionary.featurePowerupUsage,
  };
  const leaderboardLabels: Record<AchievementLeaderboard, string> = {
    individual: dictionary.leaderboardIndividual,
    team: dictionary.leaderboardTeam,
  };
  const router = useRouter();
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingAchievementId, setEditingAchievementId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftAchievement>(() => defaultDraftAchievement());
  const [imageError, setImageError] = useState(false);
  const [openDatePicker, setOpenDatePicker] = useState<string | null>(null);
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
        setOpenDatePicker(null);
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
  const validation = validateAchievementInput(draft, performanceMetrics, featureConfigState);
  const isFormValid = validation.isValid && !imageError;

  const resetEditorState = () => {
    setDraft(defaultDraftAchievement());
    setEditingAchievementId(null);
    setIsAddingNew(false);
    setImageError(false);
    setOpenDatePicker(null);
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
    setOpenDatePicker(null);
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
    setOpenDatePicker(null);
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
    setOpenDatePicker(null);
    setDraft((currentDraft) => ({
      ...currentDraft,
      criteria:
        value === "defined"
          ? defaultDefinedCriteria(performanceMetrics)
          : value === "feature"
            ? defaultFeatureCriteria(achievementableFeatures, achievementablePowerups)
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

  const handleDefinedMetricChange = (value: string) => {
    setDraft((currentDraft) => {
      if (currentDraft.criteria.mode !== "defined") {
        return currentDraft;
      }
      const selectedMetric = performanceMetricsById.get(value);

      return {
        ...currentDraft,
        criteria: {
          ...currentDraft.criteria,
          metric: value,
          validValues: getDefaultValidValuesInput(selectedMetric),
        },
      };
    });
  };

  const handleDefinedTypeChange = (value: AchievementCriteriaType) => {
    setOpenDatePicker(null);
    setDraft((currentDraft) => {
      if (currentDraft.criteria.mode !== "defined") {
        return currentDraft;
      }

      return {
        ...currentDraft,
        criteria: {
          ...currentDraft.criteria,
          type: value,
          timeFrameFrom: value === "count" ? currentDraft.criteria.timeFrameFrom : "",
          timeFrameTo: value === "count" ? currentDraft.criteria.timeFrameTo : "",
        },
      };
    });
  };

  const handleDefinedTimeFrameChange = (
    key: "timeFrameFrom" | "timeFrameTo",
    value: string,
  ) => {
    setDraft((currentDraft) => {
      if (currentDraft.criteria.mode !== "defined") {
        return currentDraft;
      }

      const nextCriteria = {
        ...currentDraft.criteria,
        [key]: value,
      };

      if (
        key === "timeFrameFrom" &&
        nextCriteria.timeFrameTo !== "" &&
        !isValidAchievementTimeFrame(nextCriteria.timeFrameFrom, nextCriteria.timeFrameTo)
      ) {
        nextCriteria.timeFrameTo = "";
      }

      return {
        ...currentDraft,
        criteria: nextCriteria,
      };
    });
  };

  const handleDefinedValidValueToggle = (index: number, checked: boolean) => {
    setDraft((currentDraft) => {
      if (currentDraft.criteria.mode !== "defined" || !Array.isArray(currentDraft.criteria.validValues)) {
        return currentDraft;
      }

      const nextValues = checked
        ? [...currentDraft.criteria.validValues, index]
        : currentDraft.criteria.validValues.filter((entry) => entry !== index);

      return {
        ...currentDraft,
        criteria: {
          ...currentDraft.criteria,
          validValues: [...new Set(nextValues)].sort((first, second) => first - second),
        },
      };
    });
  };

  const handleFeatureCriteriaChange = <
    Key extends keyof Extract<AchievementCriteriaInput, { mode: "feature" }>,
  >(
    key: Key,
    value: Extract<AchievementCriteriaInput, { mode: "feature" }>[Key],
  ) => {
    setDraft((currentDraft) => {
      if (currentDraft.criteria.mode !== "feature") {
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

  const handleFeatureChange = (feature: AchievementFeature) => {
    setDraft((currentDraft) => {
      if (currentDraft.criteria.mode !== "feature") {
        return currentDraft;
      }

      return {
        ...currentDraft,
        criteria: {
          ...currentDraft.criteria,
          feature,
          powerup: feature === "powerup-usage" ? achievementablePowerups[0]?.id ?? "" : "",
        },
      };
    });
  };

  const handleFeatureTimeFrameChange = (
    key: "timeFrameFrom" | "timeFrameTo",
    value: string,
  ) => {
    setDraft((currentDraft) => {
      if (currentDraft.criteria.mode !== "feature") {
        return currentDraft;
      }

      const nextCriteria = {
        ...currentDraft.criteria,
        [key]: value,
      };

      if (
        key === "timeFrameFrom" &&
        nextCriteria.timeFrameTo !== "" &&
        !isValidAchievementTimeFrame(nextCriteria.timeFrameFrom, nextCriteria.timeFrameTo)
      ) {
        nextCriteria.timeFrameTo = "";
      }

      return {
        ...currentDraft,
        criteria: nextCriteria,
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
            <span>{valueLabels[value] ?? label}</span>
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

  const formatDateLabel = (value: string) => {
    const parsedDate = parseAchievementDateKey(value);

    if (!parsedDate) {
      return dictionary.datePickerPlaceholder;
    }

    return new Intl.DateTimeFormat(lang, {
      dateStyle: "medium",
      timeZone: "UTC",
    }).format(parsedDate);
  };

  const formatCriteriaTimeFrame = (criteria: AchievementCriteria) => {
    if (
      (criteria.mode !== "defined" && criteria.mode !== "feature") ||
      !criteria.timeFrame
    ) {
      return dictionary.allTimeLabel;
    }

    if (typeof criteria.timeFrame === "string") {
      return criteria.timeFrame;
    }

    return `${formatDateLabel(criteria.timeFrame.from)} - ${formatDateLabel(criteria.timeFrame.to)}`;
  };

  const formatCriteriaValidValues = (
    criteria: Extract<AchievementCriteria, { mode: "defined" }>,
  ) => {
    const metric = performanceMetricsById.get(criteria.metric);

    if (Array.isArray(criteria.validValues)) {
      const options = splitEnumPossibilities(metric?.enumPossibilities);
      return criteria.validValues
        .map((entry) => options[entry] ?? String(entry))
        .join(", ");
    }

    return String(criteria.validValues);
  };

  const renderEditorCard = (mode: "create" | "edit") => {
    const idPrefix = mode === "create" ? "new-achievement" : `edit-achievement-${editingAchievementId ?? "draft"}`;
    const definedCriteria = draft.criteria.mode === "defined" ? draft.criteria : null;
    const featureCriteria = draft.criteria.mode === "feature" ? draft.criteria : null;
    const selectedFromDate =
      definedCriteria?.timeFrameFrom ? parseAchievementDateKey(definedCriteria.timeFrameFrom) ?? undefined : undefined;
    const selectedToDate =
      definedCriteria?.timeFrameTo ? parseAchievementDateKey(definedCriteria.timeFrameTo) ?? undefined : undefined;
    const minimumToDate = selectedFromDate ? addDays(selectedFromDate, 1) : undefined;
    const selectedFeatureFromDate =
      featureCriteria?.timeFrameFrom ? parseAchievementDateKey(featureCriteria.timeFrameFrom) ?? undefined : undefined;
    const selectedFeatureToDate =
      featureCriteria?.timeFrameTo ? parseAchievementDateKey(featureCriteria.timeFrameTo) ?? undefined : undefined;
    const minimumFeatureToDate = selectedFeatureFromDate ? addDays(selectedFeatureFromDate, 1) : undefined;
    const selectedPerformanceMetric = definedCriteria
      ? performanceMetricsById.get(definedCriteria.metric)
      : undefined;
    const selectedMetricEnumOptions = splitEnumPossibilities(selectedPerformanceMetric?.enumPossibilities);
    const selectedValidValueLabels = Array.isArray(definedCriteria?.validValues)
      ? definedCriteria.validValues
          .map((entry) => selectedMetricEnumOptions[entry])
          .filter((entry): entry is string => Boolean(entry))
      : [];
    const isDefinedTimeFrameValid =
      definedCriteria && definedCriteria.type === "count"
        ? isValidAchievementTimeFrame(definedCriteria.timeFrameFrom, definedCriteria.timeFrameTo)
        : true;
    const isFeatureTimeFrameValid = featureCriteria
      ? isValidAchievementTimeFrame(featureCriteria.timeFrameFrom, featureCriteria.timeFrameTo)
      : true;

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
              <div className="relative flex size-21 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
                {draft.image ? (
                  <Image
                    src={draft.image}
                    alt=""
                    fill
                    sizes={`${ACHIEVEMENT_IMAGE_SIZE}px`}
                    unoptimized
                    className="object-cover"
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
              {achievementableFeatures.length > 0 ? (
                <div className="flex items-center gap-3">
                  <RadioGroupItem id={`${idPrefix}-criteria-feature`} value="feature" />
                  <Label htmlFor={`${idPrefix}-criteria-feature`}>{dictionary.basedOnFeatureLabel}</Label>
                </div>
              ) : null}
            </RadioGroup>

            {draft.criteria.mode === "defined" ? (
              <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
                <div className="space-y-2">
                  <Label>{dictionary.metricLabel}</Label>
                  {renderSingleSelect({
                    value: draft.criteria.metric,
                    values: performanceMetrics.map((metric) => metric.id),
                    valueLabels: metricLabels,
                    label: dictionary.metricLabel,
                    disabled: isBusy || performanceMetrics.length === 0,
                    onValueChange: handleDefinedMetricChange,
                  })}
                </div>

                {selectedPerformanceMetric?.type === 0 ? (
                  <div className="space-y-2">
                    <Label>{dictionary.validValuesLabel}</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        disabled={isBusy || selectedMetricEnumOptions.length === 0}
                        render={
                          <Button type="button" variant="outline" className="w-full justify-between">
                            <span className="min-w-0 truncate">
                              {selectedValidValueLabels.length > 0
                                ? selectedValidValueLabels.join(", ")
                                : dictionary.validValuesPlaceholder}
                            </span>
                            <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="start" className="min-w-(--anchor-width)">
                        {selectedMetricEnumOptions.map((option, index) => (
                          <DropdownMenuCheckboxItem
                            key={`${option}-${index}`}
                            checked={
                              Array.isArray(definedCriteria?.validValues) &&
                              definedCriteria.validValues.includes(index)
                            }
                            onCheckedChange={(checked) => handleDefinedValidValueToggle(index, checked)}
                          >
                            {option}
                          </DropdownMenuCheckboxItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor={`${idPrefix}-valid-values`}>{dictionary.validValuesAtLeastLabel}</Label>
                    <Input
                      id={`${idPrefix}-valid-values`}
                      type="number"
                      min={0}
                      step={1}
                      inputMode="numeric"
                      value={
                        typeof draft.criteria.validValues === "string"
                          ? draft.criteria.validValues
                          : "0"
                      }
                      disabled={isBusy || !selectedPerformanceMetric}
                      onChange={(event) => handleDefinedCriteriaChange("validValues", event.target.value)}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>{dictionary.typeLabel}</Label>
                  {renderSingleSelect({
                    value: draft.criteria.type as AchievementCriteriaType,
                    values: ACHIEVEMENT_CRITERIA_TYPES,
                    valueLabels: criteriaTypeLabels,
                    label: dictionary.typeLabel,
                    disabled: isBusy,
                    onValueChange: handleDefinedTypeChange,
                  })}
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`${idPrefix}-count`}>
                    {draft.criteria.type === "streak" ? dictionary.streakDurationLabel : dictionary.countLabel}
                  </Label>
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

                {draft.criteria.type === "count" ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-foreground">{dictionary.timeFrameLabel}</Label>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>{dictionary.timeFrameFromLabel}</Label>
                        <Popover
                          open={openDatePicker === `${idPrefix}-from`}
                          onOpenChange={(open) => setOpenDatePicker(open ? `${idPrefix}-from` : null)}
                        >
                          <PopoverTrigger
                            render={
                              <Button
                                type="button"
                                variant="outline"
                                className="w-full justify-between"
                                disabled={isBusy}
                              >
                                <span>{definedCriteria ? formatDateLabel(definedCriteria.timeFrameFrom) : dictionary.datePickerPlaceholder}</span>
                                <CalendarIcon className="size-4 text-muted-foreground" aria-hidden="true" />
                              </Button>
                            }
                          />
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={selectedFromDate}
                              onSelect={(date) => {
                                if (!date) {
                                  return;
                                }

                                handleDefinedTimeFrameChange("timeFrameFrom", toDateKey(date));
                                setOpenDatePicker(null);
                              }}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="space-y-2">
                        <Label>{dictionary.timeFrameToLabel}</Label>
                        <Popover
                          open={openDatePicker === `${idPrefix}-to`}
                          onOpenChange={(open) => setOpenDatePicker(open ? `${idPrefix}-to` : null)}
                        >
                          <PopoverTrigger
                            render={
                              <Button
                                type="button"
                                variant="outline"
                                className="w-full justify-between"
                                disabled={isBusy || !selectedFromDate}
                              >
                                <span>{definedCriteria ? formatDateLabel(definedCriteria.timeFrameTo) : dictionary.datePickerPlaceholder}</span>
                                <CalendarIcon className="size-4 text-muted-foreground" aria-hidden="true" />
                              </Button>
                            }
                          />
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={selectedToDate}
                              onSelect={(date) => {
                                if (!date) {
                                  return;
                                }

                                handleDefinedTimeFrameChange("timeFrameTo", toDateKey(date));
                                setOpenDatePicker(null);
                              }}
                              disabled={(date) => Boolean(minimumToDate && date < minimumToDate)}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    {!isDefinedTimeFrameValid ? (
                      <p className="text-sm text-destructive">{dictionary.timeFrameInvalid}</p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            {draft.criteria.mode === "feature" ? (
              <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
                <div className="space-y-2">
                  <Label>{dictionary.featureLabel}</Label>
                  {renderSingleSelect({
                    value: draft.criteria.feature as AchievementFeature,
                    values: achievementableFeatures.map((feature) => feature.type),
                    valueLabels: featureLabels,
                    label: dictionary.featureLabel,
                    disabled: isBusy || achievementableFeatures.length === 0,
                    onValueChange: handleFeatureChange,
                  })}
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`${idPrefix}-feature-value`}>{dictionary.valueLabel}</Label>
                  <Input
                    id={`${idPrefix}-feature-value`}
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    value={draft.criteria.value}
                    disabled={isBusy}
                    onChange={(event) => handleFeatureCriteriaChange("value", event.target.value)}
                  />
                </div>

                {draft.criteria.feature === "powerup-usage" ? (
                  <div className="space-y-2">
                    <Label>{dictionary.powerupLabel}</Label>
                    {renderSingleSelect({
                      value: draft.criteria.powerup,
                      values: achievementablePowerups.map((powerup) => powerup.id),
                      valueLabels: powerupLabels,
                      label: dictionary.powerupLabel,
                      disabled: isBusy || achievementablePowerups.length === 0,
                      onValueChange: (value) => handleFeatureCriteriaChange("powerup", value),
                    })}
                  </div>
                ) : null}

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">{dictionary.timeFrameLabel}</Label>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>{dictionary.timeFrameFromLabel}</Label>
                      <Popover
                        open={openDatePicker === `${idPrefix}-feature-from`}
                        onOpenChange={(open) => setOpenDatePicker(open ? `${idPrefix}-feature-from` : null)}
                      >
                        <PopoverTrigger
                          render={
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full justify-between"
                              disabled={isBusy}
                            >
                              <span>{featureCriteria ? formatDateLabel(featureCriteria.timeFrameFrom) : dictionary.datePickerPlaceholder}</span>
                              <CalendarIcon className="size-4 text-muted-foreground" aria-hidden="true" />
                            </Button>
                          }
                        />
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={selectedFeatureFromDate}
                            onSelect={(date) => {
                              if (!date) {
                                return;
                              }

                              handleFeatureTimeFrameChange("timeFrameFrom", toDateKey(date));
                              setOpenDatePicker(null);
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label>{dictionary.timeFrameToLabel}</Label>
                      <Popover
                        open={openDatePicker === `${idPrefix}-feature-to`}
                        onOpenChange={(open) => setOpenDatePicker(open ? `${idPrefix}-feature-to` : null)}
                      >
                        <PopoverTrigger
                          render={
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full justify-between"
                              disabled={isBusy || !selectedFeatureFromDate}
                            >
                              <span>{featureCriteria ? formatDateLabel(featureCriteria.timeFrameTo) : dictionary.datePickerPlaceholder}</span>
                              <CalendarIcon className="size-4 text-muted-foreground" aria-hidden="true" />
                            </Button>
                          }
                        />
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={selectedFeatureToDate}
                            onSelect={(date) => {
                              if (!date) {
                                return;
                              }

                              handleFeatureTimeFrameChange("timeFrameTo", toDateKey(date));
                              setOpenDatePicker(null);
                            }}
                            disabled={(date) => Boolean(minimumFeatureToDate && date < minimumFeatureToDate)}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {!isFeatureTimeFrameValid ? (
                    <p className="text-sm text-destructive">{dictionary.timeFrameInvalid}</p>
                  ) : null}
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
                  <div className="relative flex size-21 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
                    <Image
                      src={row.image}
                      alt=""
                      fill
                      sizes={`${ACHIEVEMENT_IMAGE_SIZE}px`}
                      unoptimized
                      className="object-cover"
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
                        {metricLabels[row.criteria.metric] ?? row.criteria.metric}
                      </p>
                      <p>
                        <span className="font-medium text-foreground">{dictionary.validValuesLabel}: </span>
                        {formatCriteriaValidValues(row.criteria)}
                      </p>
                      <p>
                        <span className="font-medium text-foreground">{dictionary.typeLabel}: </span>
                        {criteriaTypeLabels[row.criteria.type]}
                      </p>
                      <p>
                        <span className="font-medium text-foreground">
                          {row.criteria.type === "streak" ? dictionary.streakDurationLabel : dictionary.countLabel}:{" "}
                        </span>
                        {row.criteria.count}
                      </p>
                      {row.criteria.type === "count" ? (
                        <p>
                          <span className="font-medium text-foreground">{dictionary.timeFrameLabel}: </span>
                          {formatCriteriaTimeFrame(row.criteria)}
                        </p>
                      ) : null}
                    </div>
                  ) : row.criteria.mode === "feature" ? (
                    <div className="space-y-2 rounded-lg border border-border bg-muted/40 px-3 py-3 text-sm text-muted-foreground">
                      <p>
                        <span className="font-medium text-foreground">{dictionary.basedOnFeatureSummary}: </span>
                        {featureLabels[row.criteria.feature]}
                      </p>
                      <p>
                        <span className="font-medium text-foreground">{dictionary.valueLabel}: </span>
                        {row.criteria.value}
                      </p>
                      {row.criteria.feature === "powerup-usage" && row.criteria.powerup ? (
                        <p>
                          <span className="font-medium text-foreground">{dictionary.powerupLabel}: </span>
                          {powerupLabels[row.criteria.powerup] ?? row.criteria.powerup}
                        </p>
                      ) : null}
                      <p>
                        <span className="font-medium text-foreground">{dictionary.timeFrameLabel}: </span>
                        {formatCriteriaTimeFrame(row.criteria)}
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
