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
      timeFrame: string | null;
      operator: AchievementOperator;
      count: number;
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
      timeFrame: string;
      operator: string;
      count: string;
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

const isAchievementMetric = (value: string): value is AchievementMetric =>
  ACHIEVEMENT_METRICS.includes(value as AchievementMetric);

const isAchievementCriteriaType = (value: string): value is AchievementCriteriaType =>
  ACHIEVEMENT_CRITERIA_TYPES.includes(value as AchievementCriteriaType);

const isAchievementOperator = (value: string): value is AchievementOperator =>
  ACHIEVEMENT_OPERATORS.includes(value as AchievementOperator);

const isAchievementLeaderboard = (value: string): value is AchievementLeaderboard =>
  ACHIEVEMENT_LEADERBOARDS.includes(value as AchievementLeaderboard);

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
        timeFrame: criteria.timeFrame ?? "",
        operator: criteria.operator,
        count: String(criteria.count),
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
      typeof parsed.timeFrame === "string" &&
      typeof parsed.operator === "string" &&
      typeof parsed.count === "string"
    ) {
      return {
        mode: "defined",
        metric: parsed.metric,
        type: parsed.type,
        timeFrame: parsed.timeFrame,
        operator: parsed.operator,
        count: parsed.count,
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

  const timeFrame = criteria.timeFrame.trim().toLowerCase().replace(/\s+/g, "");
  const trimmedCount = criteria.count.trim();
  const parsedCount = /^[1-9]\d*$/.test(trimmedCount) ? Number.parseInt(trimmedCount, 10) : Number.NaN;
  const normalizedMetric =
    criteria.metric === "attendance"
      ? "attendanceAny"
      : isAchievementMetric(criteria.metric)
        ? criteria.metric
        : "attendanceAny";

  return {
    mode: "defined",
    metric: normalizedMetric,
    type: isAchievementCriteriaType(criteria.type) ? criteria.type : "count",
    timeFrame: timeFrame === "" ? null : timeFrame,
    operator: isAchievementOperator(criteria.operator) ? criteria.operator : ">=",
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

export const validateAchievementInput = (input: AchievementInput) => {
  const normalized = normalizeAchievementInput(input);
  const hasValidCriteria =
    normalized.criteria.mode === "manual"
      ? true
      : normalized.criteria.mode === "defined"
        ? isAchievementMetric(normalized.criteria.metric) &&
          isAchievementCriteriaType(normalized.criteria.type) &&
          isAchievementOperator(normalized.criteria.operator) &&
          Number.isInteger(normalized.criteria.count) &&
          normalized.criteria.count > 0 &&
          (normalized.criteria.timeFrame === null ||
            parseAchievementDuration(normalized.criteria.timeFrame) !== null)
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
