import {
  getAchievementableFeatures,
  getAchievementablePowerups,
  type AchievementableFeatureId,
  type FeatureConfigState,
} from "@/lib/feature-flags";

export const ACHIEVEMENT_TITLE_MAX_LENGTH = 255;
export const ACHIEVEMENT_IMAGE_MAX_LENGTH = 65535;
export const ACHIEVEMENT_IMAGE_SIZE = 84;

export const ACHIEVEMENT_CRITERIA_TYPES = ["count", "streak"] as const;

export const ACHIEVEMENT_OPERATORS = ["<", "<=", "==", ">=", ">"] as const;
export const ACHIEVEMENT_LEADERBOARDS = ["individual", "team"] as const;

export type AchievementCriteriaType = (typeof ACHIEVEMENT_CRITERIA_TYPES)[number];
export type AchievementOperator = (typeof ACHIEVEMENT_OPERATORS)[number];
export type AchievementLeaderboard = (typeof ACHIEVEMENT_LEADERBOARDS)[number];
export type AchievementFeature = AchievementableFeatureId;

export type AchievementPerformanceMetric = {
  id: string;
  shortName: string;
  type: number;
  enumPossibilities: string | null;
};

export type AchievementTimeFrame = {
  from: string;
  to: string;
};

export type AchievementParsedDuration = Partial<{
  years: number;
  months: number;
  weeks: number;
  days: number;
  hours: number;
}> & {
  normalized: string;
};

export type AchievementCriteria =
  | {
      mode: "manual";
    }
  | {
      mode: "defined";
      metric: string;
      validValues: number | number[];
      type: AchievementCriteriaType;
      timeFrame: AchievementTimeFrame | string | null;
      operator: AchievementOperator;
      count: number;
    }
  | {
      mode: "feature";
      feature: AchievementFeature;
      value: number;
      powerup: string | null;
      timeFrame: AchievementTimeFrame | null;
    }
  | {
      mode: "position";
      leaderboard: AchievementLeaderboard;
      operator: AchievementOperator;
      position: number;
    };

export type AchievementCriteriaInput =
  | {
      mode: "manual";
    }
  | {
      mode: "defined";
      metric: string;
      validValues: string | number[];
      type: string;
      timeFrameFrom: string;
      timeFrameTo: string;
      count: string;
    }
  | {
      mode: "feature";
      feature: string;
      value: string;
      powerup: string;
      timeFrameFrom: string;
      timeFrameTo: string;
    }
  | {
      mode: "position";
      leaderboard: string;
      operator: string;
      position: string;
    };

export type AchievementInput = {
  title: string;
  description: string;
  image: string;
  criteria: AchievementCriteriaInput;
};

const durationUnits = [
  ["years", "y", "year", "years"],
  ["months", "mo", "month", "months"],
  ["weeks", "w", "week", "weeks"],
  ["days", "d", "day", "days"],
  ["hours", "h", "hour", "hours"],
] as const;

const dateKeyPattern = /^\d{4}-\d{2}-\d{2}$/;

const isAchievementCriteriaType = (value: string): value is AchievementCriteriaType =>
  ACHIEVEMENT_CRITERIA_TYPES.includes(value as AchievementCriteriaType);

const isAchievementOperator = (value: string): value is AchievementOperator =>
  ACHIEVEMENT_OPERATORS.includes(value as AchievementOperator);

const isAchievementLeaderboard = (value: string): value is AchievementLeaderboard =>
  ACHIEVEMENT_LEADERBOARDS.includes(value as AchievementLeaderboard);

export const parseAchievementDateKey = (value: string): Date | null => {
  if (!dateKeyPattern.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map((part) => Number(part));

  if (!year || !month || !day) {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
};

export const isAchievementTimeFrame = (value: unknown): value is AchievementTimeFrame => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const maybeTimeFrame = value as Record<string, unknown>;
  return typeof maybeTimeFrame.from === "string" && typeof maybeTimeFrame.to === "string";
};

export const splitEnumPossibilities = (value: string | null | undefined) =>
  (value ?? "")
    .split(";")
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "");

export const isValidAchievementTimeFrame = (
  from: string,
  to: string,
): boolean => {
  if (from === "" && to === "") {
    return true;
  }

  const fromDate = parseAchievementDateKey(from);
  const toDate = parseAchievementDateKey(to);

  if (!fromDate || !toDate) {
    return false;
  }

  return toDate.getTime() - fromDate.getTime() >= 24 * 60 * 60 * 1000;
};

export const getDefaultAchievementCriteriaInput = (): AchievementCriteriaInput => ({
  mode: "manual",
});

export const toAchievementCriteriaInput = (criteria: AchievementCriteria): AchievementCriteriaInput =>
  criteria.mode === "manual"
    ? { mode: "manual" }
    : criteria.mode === "defined"
      ? {
          mode: "defined",
          metric: criteria.metric,
          validValues: Array.isArray(criteria.validValues)
            ? criteria.validValues
            : String(criteria.validValues),
          type: criteria.type,
          timeFrameFrom: isAchievementTimeFrame(criteria.timeFrame) ? criteria.timeFrame.from : "",
          timeFrameTo: isAchievementTimeFrame(criteria.timeFrame) ? criteria.timeFrame.to : "",
          count: String(criteria.count),
        }
      : criteria.mode === "feature"
        ? {
            mode: "feature",
            feature: criteria.feature,
            value: String(criteria.value),
            powerup: criteria.powerup ?? "",
            timeFrameFrom: isAchievementTimeFrame(criteria.timeFrame) ? criteria.timeFrame.from : "",
            timeFrameTo: isAchievementTimeFrame(criteria.timeFrame) ? criteria.timeFrame.to : "",
          }
      : {
          mode: "position",
          leaderboard: criteria.leaderboard,
          operator: criteria.operator,
          position: String(criteria.position),
        };

export const parseAchievementCriteriaInput = (value: string): AchievementCriteriaInput | null => {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;

    if (!parsed || typeof parsed !== "object" || typeof parsed.mode !== "string") {
      return null;
    }

    if (parsed.mode === "manual") {
      return { mode: "manual" };
    }

    if (
      parsed.mode === "defined" &&
      typeof parsed.metric === "string" &&
      typeof parsed.type === "string" &&
      typeof parsed.count === "string"
    ) {
      const validValues =
        typeof parsed.validValues === "string"
          ? parsed.validValues
          : typeof parsed.validValues === "number"
            ? String(parsed.validValues)
            : Array.isArray(parsed.validValues) && parsed.validValues.every((entry) => typeof entry === "number")
              ? parsed.validValues
              : null;

      if (validValues === null) {
        return null;
      }

      if (
        typeof parsed.timeFrameFrom === "string" &&
        typeof parsed.timeFrameTo === "string"
      ) {
        return {
          mode: "defined",
          metric: parsed.metric,
          validValues,
          type: parsed.type,
          timeFrameFrom: parsed.timeFrameFrom,
          timeFrameTo: parsed.timeFrameTo,
          count: parsed.count,
        };
      }

      if (
        typeof parsed.timeFrame === "string" &&
        typeof parsed.operator === "string"
      ) {
        return {
          mode: "defined",
          metric: parsed.metric,
          validValues,
          type: parsed.type,
          timeFrameFrom: "",
          timeFrameTo: "",
          count: parsed.count,
        };
      }
    }

    if (
      parsed.mode === "feature" &&
      typeof parsed.feature === "string" &&
      typeof parsed.value === "string" &&
      typeof parsed.powerup === "string" &&
      typeof parsed.timeFrameFrom === "string" &&
      typeof parsed.timeFrameTo === "string"
    ) {
      return {
        mode: "feature",
        feature: parsed.feature,
        value: parsed.value,
        powerup: parsed.powerup,
        timeFrameFrom: parsed.timeFrameFrom,
        timeFrameTo: parsed.timeFrameTo,
      };
    }

    if (
      parsed.mode === "position" &&
      typeof parsed.leaderboard === "string" &&
      typeof parsed.operator === "string" &&
      typeof parsed.position === "string"
    ) {
      return {
        mode: "position",
        leaderboard: parsed.leaderboard,
        operator: parsed.operator,
        position: parsed.position,
      };
    }
  } catch {}

  return null;
};

export const parseAchievementDuration = (input: string): AchievementParsedDuration | null => {
  const normalized = input.trim().toLowerCase().replace(/\s+/g, "");

  if (normalized.length === 0) {
    return null;
  }

  const tokenPattern = /(\d+)(y|mo|w|d|h)/g;
  const parsedDuration: AchievementParsedDuration = { normalized };
  let cursor = 0;

  for (const match of normalized.matchAll(tokenPattern)) {
    const [token, rawValue, unit] = match;

    if (match.index !== cursor) {
      return null;
    }

    const value = Number.parseInt(rawValue, 10);

    if (!Number.isInteger(value) || value <= 0) {
      return null;
    }

    const unitEntry = durationUnits.find(([, shortUnit]) => shortUnit === unit);

    if (!unitEntry) {
      return null;
    }

    const [durationKey] = unitEntry;
    parsedDuration[durationKey] = (parsedDuration[durationKey] ?? 0) + value;
    cursor += token.length;
  }

  if (cursor !== normalized.length) {
    return null;
  }

  return parsedDuration;
};

export const formatAchievementDuration = (duration: AchievementParsedDuration): string => {
  const parts = durationUnits.flatMap(([durationKey, , singular, plural]) => {
    const value = duration[durationKey];
    return value ? [`${value} ${value === 1 ? singular : plural}`] : [];
  });

  if (parts.length === 0) {
    return "";
  }

  if (parts.length === 1) {
    return parts[0];
  }

  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
};

const normalizeAchievementCriteria = (criteria: AchievementCriteriaInput): AchievementCriteria => {
  if (criteria.mode === "manual") {
    return { mode: "manual" };
  }

  if (criteria.mode === "position") {
    const trimmedPosition = criteria.position.trim();
    const parsedPosition =
      /^[1-9]\d*$/.test(trimmedPosition) ? Number.parseInt(trimmedPosition, 10) : Number.NaN;

    return {
      mode: "position",
      leaderboard: isAchievementLeaderboard(criteria.leaderboard)
        ? criteria.leaderboard
        : "individual",
      operator: isAchievementOperator(criteria.operator) ? criteria.operator : "<=",
      position: Number.isInteger(parsedPosition) ? parsedPosition : Number.NaN,
    };
  }

  if (criteria.mode === "feature") {
    const trimmedValue = criteria.value.trim();
    const parsedValue = /^\d+$/.test(trimmedValue) ? Number.parseInt(trimmedValue, 10) : Number.NaN;
    const timeFrameFrom = criteria.timeFrameFrom.trim();
    const timeFrameTo = criteria.timeFrameTo.trim();
    const normalizedTimeFrame =
      timeFrameFrom !== "" &&
      timeFrameTo !== "" &&
      isValidAchievementTimeFrame(timeFrameFrom, timeFrameTo)
        ? { from: timeFrameFrom, to: timeFrameTo }
        : null;

    return {
      mode: "feature",
      feature: criteria.feature.trim() as AchievementFeature,
      value: Number.isInteger(parsedValue) ? parsedValue : Number.NaN,
      powerup: criteria.powerup.trim() === "" ? null : criteria.powerup.trim(),
      timeFrame: normalizedTimeFrame,
    };
  }

  const trimmedCount = criteria.count.trim();
  const parsedCount = /^[1-9]\d*$/.test(trimmedCount) ? Number.parseInt(trimmedCount, 10) : Number.NaN;
  const trimmedValidValue =
    typeof criteria.validValues === "string" ? criteria.validValues.trim() : "";
  const parsedValidValue =
    /^\d+$/.test(trimmedValidValue) ? Number.parseInt(trimmedValidValue, 10) : Number.NaN;
  const normalizedType = isAchievementCriteriaType(criteria.type) ? criteria.type : "count";
  const timeFrameFrom = criteria.timeFrameFrom.trim();
  const timeFrameTo = criteria.timeFrameTo.trim();
  const normalizedTimeFrame =
    normalizedType === "count" &&
    timeFrameFrom !== "" &&
    timeFrameTo !== "" &&
    isValidAchievementTimeFrame(timeFrameFrom, timeFrameTo)
      ? { from: timeFrameFrom, to: timeFrameTo }
      : null;

  return {
    mode: "defined",
    metric: criteria.metric.trim(),
    validValues: Array.isArray(criteria.validValues)
      ? [...new Set(criteria.validValues.filter((entry) => Number.isInteger(entry) && entry >= 0))].sort(
          (first, second) => first - second,
        )
      : Number.isInteger(parsedValidValue)
        ? parsedValidValue
        : Number.NaN,
    type: normalizedType,
    timeFrame: normalizedType === "streak" ? null : normalizedTimeFrame,
    operator: ">=",
    count: Number.isInteger(parsedCount) ? parsedCount : Number.NaN,
  };
};

export const normalizeAchievementInput = (input: AchievementInput) => {
  const title = input.title.trim();
  const description = input.description.trim();
  const image = input.image.trim();
  const criteria = normalizeAchievementCriteria(input.criteria);

  return {
    title,
    description,
    image,
    criteria,
  };
};

const hasValidDefinedCriteria = (
  input: AchievementInput,
  criteria: Extract<AchievementCriteria, { mode: "defined" }>,
  performanceMetrics?: AchievementPerformanceMetric[],
) => {
  const metric = performanceMetrics?.find((entry) => entry.id === criteria.metric);

  if (
    criteria.metric.length === 0 ||
    (performanceMetrics !== undefined && !metric) ||
    !isAchievementCriteriaType(criteria.type) ||
    criteria.operator !== ">=" ||
    !Number.isInteger(criteria.count) ||
    criteria.count <= 0
  ) {
    return false;
  }

  if (
    criteria.type === "count" &&
    !isValidAchievementTimeFrame(
      input.criteria.mode === "defined" ? input.criteria.timeFrameFrom.trim() : "",
      input.criteria.mode === "defined" ? input.criteria.timeFrameTo.trim() : "",
    )
  ) {
    return false;
  }

  if (!metric) {
    return (
      (typeof criteria.validValues === "number" &&
        Number.isInteger(criteria.validValues) &&
        criteria.validValues >= 0) ||
      (Array.isArray(criteria.validValues) && criteria.validValues.length > 0)
    );
  }

  if (metric.type === 1) {
    return (
      typeof criteria.validValues === "number" &&
      Number.isInteger(criteria.validValues) &&
      criteria.validValues >= 0
    );
  }

  const enumOptions = splitEnumPossibilities(metric.enumPossibilities);

  return (
    Array.isArray(criteria.validValues) &&
    criteria.validValues.length > 0 &&
    criteria.validValues.every((entry) => Number.isInteger(entry) && entry >= 0 && entry < enumOptions.length)
  );
};

const hasValidFeatureCriteria = (
  input: AchievementInput,
  criteria: Extract<AchievementCriteria, { mode: "feature" }>,
  featureConfigState?: FeatureConfigState,
) => {
  const availableFeatures = featureConfigState
    ? getAchievementableFeatures(featureConfigState).map((feature) => feature.type)
    : null;
  const availablePowerups = featureConfigState
    ? getAchievementablePowerups(featureConfigState).map((powerup) => powerup.id)
    : null;

  if (
    !Number.isInteger(criteria.value) ||
    criteria.value < 0 ||
    (availableFeatures !== null && !availableFeatures.includes(criteria.feature)) ||
    !isValidAchievementTimeFrame(
      input.criteria.mode === "feature" ? input.criteria.timeFrameFrom.trim() : "",
      input.criteria.mode === "feature" ? input.criteria.timeFrameTo.trim() : "",
    )
  ) {
    return false;
  }

  if (criteria.feature === "powerup-usage") {
    return (
      typeof criteria.powerup === "string" &&
      criteria.powerup.length > 0 &&
      (availablePowerups === null || availablePowerups.includes(criteria.powerup))
    );
  }

  return criteria.powerup === null;
};

export const validateAchievementInput = (
  input: AchievementInput,
  performanceMetrics?: AchievementPerformanceMetric[],
  featureConfigState?: FeatureConfigState,
) => {
  const normalized = normalizeAchievementInput(input);
  const hasValidCriteria =
    normalized.criteria.mode === "manual"
      ? true
      : normalized.criteria.mode === "defined"
        ? hasValidDefinedCriteria(input, normalized.criteria, performanceMetrics)
        : normalized.criteria.mode === "feature"
          ? hasValidFeatureCriteria(input, normalized.criteria, featureConfigState)
        : isAchievementLeaderboard(normalized.criteria.leaderboard) &&
          isAchievementOperator(normalized.criteria.operator) &&
          Number.isInteger(normalized.criteria.position) &&
          normalized.criteria.position > 0;

  return {
    normalized,
    isValid:
      normalized.title.length > 0 &&
      normalized.title.length <= ACHIEVEMENT_TITLE_MAX_LENGTH &&
      normalized.image.length > 0 &&
      normalized.image.length <= ACHIEVEMENT_IMAGE_MAX_LENGTH &&
      hasValidCriteria,
  };
};
