"use server";

import { revalidatePath } from "next/cache";
import { asc, eq, max } from "drizzle-orm";

import { requireAdminAccess } from "@/app/[lang]/admin/actions";
import { performanceMetrics } from "@/db/schema";
import { hasLocale } from "@/i18n/config";
import { db } from "@/lib/db";
import { getCurrentFeatureConfig } from "@/lib/feature-config-server";
import { isFeatureEnabled } from "@/lib/feature-flags";

export type PerformanceMetricEntry = {
  id: string;
  shortName: string;
  question: string;
  type: number;
  enumPossibilities: string | null;
  points: string | null;
  timestampAdded: string;
  sortOrder: number;
};

export type CreatePerformanceMetricActionState = {
  status: "idle" | "success" | "error";
};

export type UpdatePerformanceMetricOrderActionState = {
  status: "idle" | "success" | "error";
};

const PERFORMANCE_METRIC_SHORT_NAME_MAX_LENGTH = 30;
const PERFORMANCE_METRIC_QUESTION_MAX_LENGTH = 255;
const PERFORMANCE_METRIC_ENUM_POSSIBILITIES_MAX_LENGTH = 511;
const PERFORMANCE_METRIC_POINTS_MAX_LENGTH = 255;

const normalizeRequiredString = (value: FormDataEntryValue | null, maxLength: number) => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  if (normalized === "" || normalized.length > maxLength) {
    return null;
  }

  return normalized;
};

const normalizeOptionalString = (value: FormDataEntryValue | null, maxLength: number) => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  if (normalized === "" || normalized.length > maxLength) {
    return null;
  }

  return normalized;
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

const normalizePointsInput = ({
  points,
  enumPossibilities,
  pointSystemEnabled,
  type,
}: {
  points: FormDataEntryValue | null;
  enumPossibilities: string | null;
  pointSystemEnabled: boolean;
  type: number;
}) => {
  if (!pointSystemEnabled) {
    return null;
  }

  const normalizedPoints = normalizeRequiredString(points, PERFORMANCE_METRIC_POINTS_MAX_LENGTH);

  if (normalizedPoints === null) {
    return undefined;
  }

  if (type === 1) {
    return isNonNegativeIntegerString(normalizedPoints) ? normalizedPoints : undefined;
  }

  if (type === 0) {
    if (enumPossibilities === null) {
      return undefined;
    }

    const pointValues = splitSemicolonValues(normalizedPoints);
    const possibilityValues = splitSemicolonValues(enumPossibilities);

    if (
      pointValues.length === 0 ||
      pointValues.length !== possibilityValues.length ||
      pointValues.some((value) => !isNonNegativeIntegerString(value))
    ) {
      return undefined;
    }

    return pointValues.join(";");
  }

  return undefined;
};

export const getPerformanceMetrics = async (): Promise<PerformanceMetricEntry[]> => {
  await requireAdminAccess();

  const rows = await db
    .select({
      id: performanceMetrics.id,
      shortName: performanceMetrics.shortName,
      question: performanceMetrics.question,
      type: performanceMetrics.type,
      enumPossibilities: performanceMetrics.enumPossibilities,
      points: performanceMetrics.points,
      timestampAdded: performanceMetrics.timestampAdded,
      sortOrder: performanceMetrics.sortOrder,
    })
    .from(performanceMetrics)
    .orderBy(
      asc(performanceMetrics.sortOrder),
      asc(performanceMetrics.timestampAdded),
      asc(performanceMetrics.id),
    );

  return rows.map((row) => ({
    ...row,
    timestampAdded: row.timestampAdded.toISOString(),
  }));
};

export const createPerformanceMetric = async (
  _previousState: CreatePerformanceMetricActionState,
  formData: FormData,
): Promise<CreatePerformanceMetricActionState> => {
  await requireAdminAccess();

  const lang = formData.get("lang");
  const shortName = normalizeRequiredString(
    formData.get("shortName"),
    PERFORMANCE_METRIC_SHORT_NAME_MAX_LENGTH,
  );
  const question = normalizeRequiredString(
    formData.get("question"),
    PERFORMANCE_METRIC_QUESTION_MAX_LENGTH,
  );
  const rawType = formData.get("type");
  const type = rawType === "0" ? 0 : rawType === "1" ? 1 : null;
  const enumPossibilities =
    type === 0
      ? normalizeRequiredString(
          formData.get("enumPossibilities"),
          PERFORMANCE_METRIC_ENUM_POSSIBILITIES_MAX_LENGTH,
        )
      : normalizeOptionalString(
          formData.get("enumPossibilities"),
          PERFORMANCE_METRIC_ENUM_POSSIBILITIES_MAX_LENGTH,
        );
  const featureConfig = await getCurrentFeatureConfig();
  const pointSystemEnabled = Boolean(isFeatureEnabled(featureConfig.state, "point-system"));
  const points =
    type === null
      ? undefined
      : normalizePointsInput({
          points: formData.get("points"),
          enumPossibilities,
          pointSystemEnabled,
          type,
        });

  if (
    typeof lang !== "string" ||
    !hasLocale(lang) ||
    shortName === null ||
    question === null ||
    type === null ||
    (type === 0 && enumPossibilities === null) ||
    points === undefined
  ) {
    return { status: "error" };
  }

  const [{ maxSortOrder }] = await db
    .select({ maxSortOrder: max(performanceMetrics.sortOrder) })
    .from(performanceMetrics);

  await db.insert(performanceMetrics).values({
    shortName,
    question,
    type,
    enumPossibilities: type === 0 ? enumPossibilities : null,
    points,
    sortOrder: (maxSortOrder ?? -1) + 1,
  });

  revalidatePath(`/${lang}/admin/performance-metric-config`);

  return { status: "success" };
};

const parseOrderedIds = (value: FormDataEntryValue | null): string[] | null => {
  if (typeof value !== "string") {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(value);

    if (!Array.isArray(parsed) || !parsed.every((entry) => typeof entry === "string")) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
};

export const updatePerformanceMetricOrder = async (
  _previousState: UpdatePerformanceMetricOrderActionState,
  formData: FormData,
): Promise<UpdatePerformanceMetricOrderActionState> => {
  await requireAdminAccess();

  const lang = formData.get("lang");
  const orderedIds = parseOrderedIds(formData.get("orderedIds"));

  if (typeof lang !== "string" || !hasLocale(lang) || orderedIds === null) {
    return { status: "error" };
  }

  const existingRows = await db.select({ id: performanceMetrics.id }).from(performanceMetrics);
  const existingIds = new Set(existingRows.map((row) => row.id));
  const uniqueOrderedIds = new Set(orderedIds);

  if (
    uniqueOrderedIds.size !== orderedIds.length ||
    orderedIds.length !== existingIds.size ||
    orderedIds.some((id) => !existingIds.has(id))
  ) {
    return { status: "error" };
  }

  await db.transaction(async (tx) => {
    for (const [index, id] of orderedIds.entries()) {
      await tx
        .update(performanceMetrics)
        .set({ sortOrder: index })
        .where(eq(performanceMetrics.id, id));
    }
  });

  revalidatePath(`/${lang}/admin/performance-metric-config`);
  revalidatePath(`/${lang}/track-contributions`);

  return { status: "success" };
};
