export const ACHIEVEMENT_TITLE_MAX_LENGTH = 255;
export const ACHIEVEMENT_IMAGE_MAX_LENGTH = 65535;
export const ACHIEVEMENT_IMAGE_SIZE = 84;

export const ACHIEVEMENT_METRICS = [
  "points",
  "attendanceAny",
  "attendanceVirtually",
  "attendanceOnSite",
  "protocolForced",
  "protocolVoluntary",
  "protocolAny",
  "moderation",
  "workingGroup",
  "twl",
  "presentations",
] as const;

export const ACHIEVEMENT_CRITERIA_TYPES = ["count", "streak"] as const;

export const ACHIEVEMENT_OPERATORS = ["<", "<=", "==", ">=", ">"] as const;
export const ACHIEVEMENT_LEADERBOARDS = ["individual", "team"] as const;

export type AchievementMetric = (typeof ACHIEVEMENT_METRICS)[number];
export type AchievementCriteriaType = (typeof ACHIEVEMENT_CRITERIA_TYPES)[number];
export type AchievementOperator = (typeof ACHIEVEMENT_OPERATORS)[number];
export type AchievementLeaderboard = (typeof ACHIEVEMENT_LEADERBOARDS)[number];

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
      metric: AchievementMetric;
      type: AchievementCriteriaType;
      timeFrame: AchievementTimeFrame | string | null;
      operator: AchievementOperator;
      count: number;
      minimumPoints: number | null;
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
      type: string;
      timeFrameFrom: string;
      timeFrameTo: string;
      count: string;
      minimumPoints: string;
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

const isAchievementMetric = (value: string): value is AchievementMetric =>
  ACHIEVEMENT_METRICS.includes(value as AchievementMetric);

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
          type: criteria.type,
          timeFrameFrom: isAchievementTimeFrame(criteria.timeFrame) ? criteria.timeFrame.from : "",
          timeFrameTo: isAchievementTimeFrame(criteria.timeFrame) ? criteria.timeFrame.to : "",
          count: String(criteria.count),
          minimumPoints: criteria.minimumPoints ? String(criteria.minimumPoints) : "",
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
      if (
        typeof parsed.timeFrameFrom === "string" &&
        typeof parsed.timeFrameTo === "string" &&
        typeof parsed.minimumPoints === "string"
      ) {
        return {
          mode: "defined",
          metric: parsed.metric,
          type: parsed.type,
          timeFrameFrom: parsed.timeFrameFrom,
          timeFrameTo: parsed.timeFrameTo,
          count: parsed.count,
          minimumPoints: parsed.minimumPoints,
        };
      }

      if (
        typeof parsed.timeFrame === "string" &&
        typeof parsed.operator === "string"
      ) {
        return {
          mode: "defined",
          metric: parsed.metric,
          type: parsed.type,
          timeFrameFrom: "",
          timeFrameTo: "",
          count: parsed.count,
          minimumPoints:
            typeof parsed.minimumPoints === "string"
              ? parsed.minimumPoints
              : typeof parsed.minimumPoints === "number"
                ? String(parsed.minimumPoints)
                : "",
        };
      }
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

  const trimmedCount = criteria.count.trim();
  const parsedCount = /^[1-9]\d*$/.test(trimmedCount) ? Number.parseInt(trimmedCount, 10) : Number.NaN;
  const trimmedMinimumPoints = criteria.minimumPoints.trim();
  const parsedMinimumPoints =
    /^[1-9]\d*$/.test(trimmedMinimumPoints) ? Number.parseInt(trimmedMinimumPoints, 10) : Number.NaN;
  const normalizedMetric =
    criteria.metric === "attendance"
      ? "attendanceAny"
      : isAchievementMetric(criteria.metric)
        ? criteria.metric
        : "attendanceAny";
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
    metric: normalizedMetric,
    type: normalizedType,
    timeFrame: normalizedType === "streak" ? null : normalizedTimeFrame,
    operator: ">=",
    count: Number.isInteger(parsedCount) ? parsedCount : Number.NaN,
    minimumPoints:
      normalizedType === "streak" && normalizedMetric === "points" && Number.isInteger(parsedMinimumPoints)
        ? parsedMinimumPoints
        : null,
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

export const validateAchievementInput = (input: AchievementInput) => {
  const normalized = normalizeAchievementInput(input);
  const hasValidCriteria =
    normalized.criteria.mode === "manual"
      ? true
      : normalized.criteria.mode === "defined"
        ? isAchievementMetric(normalized.criteria.metric) &&
          isAchievementCriteriaType(normalized.criteria.type) &&
          normalized.criteria.operator === ">=" &&
          Number.isInteger(normalized.criteria.count) &&
          normalized.criteria.count > 0 &&
          (normalized.criteria.type === "streak"
            ? normalized.criteria.metric !== "points" ||
              (Number.isInteger(normalized.criteria.minimumPoints) &&
                normalized.criteria.minimumPoints !== null &&
                normalized.criteria.minimumPoints > 0)
            : isValidAchievementTimeFrame(
                input.criteria.mode === "defined" ? input.criteria.timeFrameFrom.trim() : "",
                input.criteria.mode === "defined" ? input.criteria.timeFrameTo.trim() : "",
              ))
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
