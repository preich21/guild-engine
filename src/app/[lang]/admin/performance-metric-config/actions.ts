"use server";

import { revalidatePath } from "next/cache";
import { desc } from "drizzle-orm";

import { requireAdminAccess } from "@/app/[lang]/admin/actions";
import { performanceMetrics } from "@/db/schema";
import { hasLocale } from "@/i18n/config";
import { db } from "@/lib/db";

export type PerformanceMetricEntry = {
  id: string;
  shortName: string;
  question: string;
  type: number;
  enumPossibilities: string | null;
  timestampAdded: string;
};

export type CreatePerformanceMetricActionState = {
  status: "idle" | "success" | "error";
};

const PERFORMANCE_METRIC_SHORT_NAME_MAX_LENGTH = 30;
const PERFORMANCE_METRIC_QUESTION_MAX_LENGTH = 255;
const PERFORMANCE_METRIC_ENUM_POSSIBILITIES_MAX_LENGTH = 511;

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

export const getPerformanceMetrics = async (): Promise<PerformanceMetricEntry[]> => {
  await requireAdminAccess();

  const rows = await db
    .select({
      id: performanceMetrics.id,
      shortName: performanceMetrics.shortName,
      question: performanceMetrics.question,
      type: performanceMetrics.type,
      enumPossibilities: performanceMetrics.enumPossibilities,
      timestampAdded: performanceMetrics.timestampAdded,
    })
    .from(performanceMetrics)
    .orderBy(desc(performanceMetrics.timestampAdded), desc(performanceMetrics.id));

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

  if (
    typeof lang !== "string" ||
    !hasLocale(lang) ||
    shortName === null ||
    question === null ||
    type === null ||
    (type === 0 && enumPossibilities === null)
  ) {
    return { status: "error" };
  }

  await db.insert(performanceMetrics).values({
    shortName,
    question,
    type,
    enumPossibilities: type === 0 ? enumPossibilities : null,
  });

  revalidatePath(`/${lang}/admin/performance-metric-config`);

  return { status: "success" };
};
