"use client";

import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type ChangeEvent, useActionState, useMemo, useState, useTransition } from "react";

import type {
  ContributionMetricEntry,
  TrackContributionFormValues,
  TrackContributionsActionState,
} from "@/app/[lang]/track-contributions/actions";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  useFeatureEnabled,
  useFeatureSettingEnabled,
  useFeatureSettingValue,
} from "@/components/feature-config-provider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type TrackContributionsFormProps = {
  action: (
    state: TrackContributionsActionState,
    formData: FormData,
  ) => Promise<TrackContributionsActionState>;
  dictionary: {
    heading: string;
    noMeetingError: string;
    noMetrics: string;
    previousMeetingButton: string;
    nextMeetingButton: string;
    meetingDateButton: string;
    loading: string;
    lastModified: string;
    never: string;
    cancelButton: string;
    saveButton: string;
    saveSuccess: string;
    saveError: string;
    activatedPointMultiplicatorTooltip: string;
    smallPointMultiplicatorSize: string;
    mediumPointMultiplicatorSize: string;
    largePointMultiplicatorSize: string;
  };
  lang: string;
  formDisabled: boolean;
  showNoMeetingError: boolean;
  meetingId: string | null;
  metrics: ContributionMetricEntry[];
  initialValues: TrackContributionFormValues;
  hasExistingContribution: boolean;
  lastModified: string;
  selectedMeetingDate: string | null;
  fallbackSelectedMeetingDateLabel: string;
  availableMeetingDates: string[];
  previousMeetingDate: string | null;
  nextMeetingDate: string | null;
  activatedPointMultiplicator: string | null;
};

const INTEGER_MIN_VALUE = 0;
const INTEGER_MAX_VALUE = 10_000;
const initialState: TrackContributionsActionState = { status: "idle" };

const pointMultiplicatorPowerupIds = [
  "small-point-multiplicator",
  "medium-point-multiplicator",
  "large-point-multiplicator",
] as const;

type PointMultiplicatorPowerupId = (typeof pointMultiplicatorPowerupIds)[number];

const pointMultiplicatorSizeKeys = {
  "small-point-multiplicator": "smallPointMultiplicatorSize",
  "medium-point-multiplicator": "mediumPointMultiplicatorSize",
  "large-point-multiplicator": "largePointMultiplicatorSize",
} as const satisfies Record<
  PointMultiplicatorPowerupId,
  "smallPointMultiplicatorSize" | "mediumPointMultiplicatorSize" | "largePointMultiplicatorSize"
>;

const getMetricFormKey = (metricId: string) => `metric:${metricId}`;

const isPointMultiplicatorPowerupId = (value: string | null): value is PointMultiplicatorPowerupId =>
  value !== null && pointMultiplicatorPowerupIds.some((powerupId) => powerupId === value);

const getEnumPossibilities = (value: string | null) =>
  value
    ?.split(";")
    .map((possibility) => possibility.trim())
    .filter(Boolean) ?? [];

const parseDateKey = (value: string): Date => {
  const [year, month, day] = value.split("-").map((part) => Number(part));
  return new Date(year, month - 1, day);
};

const toDateKey = (value: Date): string => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const replaceMeetingDate = (question: string, selectedMeetingDateLabel: string) =>
  question.replaceAll("[date]", selectedMeetingDateLabel);

const formatMultiplicatorFactor = (value: unknown) => {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;

  return Number.isFinite(parsed) ? parsed.toFixed(1) : "1.0";
};

export function TrackContributionsForm({
  action,
  dictionary,
  lang,
  formDisabled,
  showNoMeetingError,
  meetingId,
  metrics,
  initialValues,
  hasExistingContribution,
  lastModified,
  selectedMeetingDate,
  fallbackSelectedMeetingDateLabel,
  availableMeetingDates,
  previousMeetingDate,
  nextMeetingDate,
  activatedPointMultiplicator,
}: TrackContributionsFormProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, formAction, pending] = useActionState(
    async (previousState: TrackContributionsActionState, formData: FormData) => {
      const nextState = await action(previousState, formData);

      if (nextState.status === "success") {
        router.refresh();
      }

      return nextState;
    },
    initialState,
  );
  const [isNavigating, startNavigationTransition] = useTransition();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [values, setValues] = useState<TrackContributionFormValues>(initialValues);
  const powerupsEnabled = useFeatureEnabled("powerups");
  const knownPointMultiplicator = isPointMultiplicatorPowerupId(activatedPointMultiplicator)
    ? activatedPointMultiplicator
    : null;
  const activatedPointMultiplicatorEnabled = useFeatureSettingEnabled(
    "powerups",
    knownPointMultiplicator ?? "small-point-multiplicator",
  );
  const multiplicatorFactor = useFeatureSettingValue(
    "powerups",
    `${knownPointMultiplicator ?? "small-point-multiplicator"}-multiplicator`,
  );

  const isLoading = pending || isNavigating;
  const isSubmissionBlocked = formDisabled || pending || metrics.length === 0;
  const availableMeetingDateSet = useMemo(() => new Set(availableMeetingDates), [availableMeetingDates]);
  const selectedDate = selectedMeetingDate ? parseDateKey(selectedMeetingDate) : undefined;
  const selectedMeetingDateLabel = selectedMeetingDate
    ? new Intl.DateTimeFormat(lang, { dateStyle: "medium" }).format(parseDateKey(selectedMeetingDate))
    : fallbackSelectedMeetingDateLabel;
  const shouldShowPointMultiplicator =
    Boolean(powerupsEnabled) && knownPointMultiplicator !== null && activatedPointMultiplicatorEnabled;
  const activatedPointMultiplicatorTooltip =
    shouldShowPointMultiplicator && knownPointMultiplicator
      ? dictionary.activatedPointMultiplicatorTooltip
          .replace("{size}", dictionary[pointMultiplicatorSizeKeys[knownPointMultiplicator]])
          .replace("{factor}", formatMultiplicatorFactor(multiplicatorFactor))
      : null;

  const handleReset = () => {
    setValues(initialValues);
  };

  const navigateToMeeting = (nextMeetingDate: string) => {
    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.set("meeting", nextMeetingDate);

    startNavigationTransition(() => {
      router.push(`${pathname}?${nextSearchParams.toString()}`);
    });
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    if (!date) {
      return;
    }

    const nextMeetingDate = toDateKey(date);

    if (!availableMeetingDateSet.has(nextMeetingDate)) {
      return;
    }

    setIsCalendarOpen(false);
    navigateToMeeting(nextMeetingDate);
  };

  const handleValueChange = (metricId: string, value: string) => {
    setValues((currentValues) => ({
      ...currentValues,
      [metricId]: value,
    }));
  };

  const handleIntegerChange =
    (metricId: string) => (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.valueAsNumber;

      if (Number.isNaN(nextValue)) {
        handleValueChange(metricId, String(INTEGER_MIN_VALUE));
        return;
      }

      handleValueChange(
        metricId,
        String(Math.min(INTEGER_MAX_VALUE, Math.max(INTEGER_MIN_VALUE, Math.trunc(nextValue)))),
      );
    };

  const isFormValid =
    meetingId !== null &&
    metrics.length > 0 &&
    metrics.every((metric) => {
      const value = values[metric.id];

      if (metric.type === 0) {
        const possibilities = getEnumPossibilities(metric.enumPossibilities);
        const parsed = Number(value);

        return possibilities.length > 0 && Number.isInteger(parsed) && parsed >= 0 && parsed < possibilities.length;
      }

      if (metric.type === 1) {
        const parsed = Number(value);

        return Number.isInteger(parsed) && parsed >= INTEGER_MIN_VALUE && parsed <= INTEGER_MAX_VALUE;
      }

      return false;
    });
  const hasFormChanges = metrics.some((metric) => (values[metric.id] ?? "") !== (initialValues[metric.id] ?? ""));
  const isSaveDisabled =
    isSubmissionBlocked || !isFormValid || (hasExistingContribution && !hasFormChanges);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="lang" value={lang} />
      {meetingId ? <input type="hidden" name="meetingId" value={meetingId} /> : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{dictionary.heading}</h1>

          {shouldShowPointMultiplicator && knownPointMultiplicator && activatedPointMultiplicatorTooltip ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <span
                      className="relative inline-flex size-6 shrink-0 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                      aria-label={activatedPointMultiplicatorTooltip}
                      tabIndex={0}
                    />
                  }
                >
                  <Image
                    src={`/powerups/${knownPointMultiplicator}.png`}
                    alt=""
                    width={24}
                    height={24}
                    className="size-6 object-contain"
                  />
                </TooltipTrigger>
                <TooltipContent>{activatedPointMultiplicatorTooltip}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}
        </div>

        <div className="flex items-center gap-2 self-start">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => previousMeetingDate && navigateToMeeting(previousMeetingDate)}
            disabled={!previousMeetingDate || isLoading}
            aria-label={dictionary.previousMeetingButton}
            title={dictionary.previousMeetingButton}
          >
            <ChevronLeft className="size-4" />
          </Button>

          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 min-w-36 justify-center px-3"
                  disabled={availableMeetingDates.length === 0 || isLoading}
                  aria-label={dictionary.meetingDateButton}
                  title={dictionary.meetingDateButton}
                >
                  {selectedMeetingDateLabel}
                </Button>
              }
            />
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleCalendarSelect}
                disabled={(date) => !availableMeetingDateSet.has(toDateKey(date))}
              />
            </PopoverContent>
          </Popover>

          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => nextMeetingDate && navigateToMeeting(nextMeetingDate)}
            disabled={!nextMeetingDate || isLoading}
            aria-label={dictionary.nextMeetingButton}
            title={dictionary.nextMeetingButton}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status" aria-live="polite">
          <Loader2 className="size-4 animate-spin" />
          {dictionary.loading}
        </p>
      ) : null}

      {showNoMeetingError ? (
        <p className="text-sm text-destructive" role="alert">
          {dictionary.noMeetingError}
        </p>
      ) : null}

      {metrics.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
          {dictionary.noMetrics}
        </p>
      ) : null}

      <div className="space-y-6">
        {metrics.map((metric) => {
          const fieldName = getMetricFormKey(metric.id);
          const value = values[metric.id] ?? "";
          const possibilities = getEnumPossibilities(metric.enumPossibilities);

          return (
            <fieldset key={metric.id} className="space-y-3" disabled={isSubmissionBlocked}>
              <legend className="text-sm text-foreground">
                <span className="font-semibold">{metric.shortName}</span>:{" "}
                {replaceMeetingDate(metric.question, selectedMeetingDateLabel)}
              </legend>

              {metric.type === 0 ? (
                <RadioGroup
                  name={fieldName}
                  value={value}
                  onValueChange={(nextValue) => handleValueChange(metric.id, nextValue)}
                  disabled={isSubmissionBlocked}
                  className="space-y-3"
                >
                  {possibilities.map((possibility, index) => (
                    <RadioOption
                      key={`${metric.id}-${possibility}-${index}`}
                      id={`${fieldName}:${index}`}
                      value={String(index)}
                      label={possibility}
                    />
                  ))}
                </RadioGroup>
              ) : null}

              {metric.type === 1 ? (
                <Input
                  id={fieldName}
                  name={fieldName}
                  type="number"
                  min={INTEGER_MIN_VALUE}
                  max={INTEGER_MAX_VALUE}
                  step={1}
                  value={value}
                  onChange={handleIntegerChange(metric.id)}
                  className="h-10 px-3"
                  disabled={isSubmissionBlocked}
                  required
                />
              ) : null}
            </fieldset>
          );
        })}
      </div>

      {state.status === "success" ? (
        <p className="text-sm text-emerald-600 dark:text-emerald-400" role="status">
          {dictionary.saveSuccess}
        </p>
      ) : null}

      {state.status === "error" ? (
        <p className="text-sm text-destructive" role="alert">
          {dictionary.saveError}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {dictionary.lastModified}: {lastModified || dictionary.never}
        </p>

        <div className="flex w-full flex-col justify-end gap-2 sm:w-auto sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={isSubmissionBlocked}
            className="h-10 w-full sm:w-auto"
          >
            {dictionary.cancelButton}
          </Button>
          <Button
            type="submit"
            disabled={isSaveDisabled}
            className="h-10 w-full sm:w-auto"
          >
            {dictionary.saveButton}
          </Button>
        </div>
      </div>
    </form>
  );
}

type RadioOptionProps = {
  id: string;
  value: string;
  label: string;
};

function RadioOption({ id, value, label }: RadioOptionProps) {
  return (
    <div className="flex items-center gap-2 text-sm text-foreground">
      <RadioGroupItem id={id} value={value} />
      <Label htmlFor={id}>{label}</Label>
    </div>
  );
}
