"use server";

import { revalidatePath } from "next/cache";
import { asc, count, eq } from "drizzle-orm";

import { requireAdminAccess } from "@/app/[lang]/admin/actions";
import { quizSubmissions, quizzes, users } from "@/db/schema";
import { hasLocale } from "@/i18n/config";
import { getCurrentUserRecord } from "@/lib/auth/user";
import { db } from "@/lib/db";
import {validateQuizData} from "@/lib/quiz-data-validation";

export type QuizEntry = {
  id: string;
  modifiedBy: string | null;
  modifiedByUsername: string | null;
  modifiedAt: string;
  title: string;
  validFrom: string;
  validTo: string | null;
  points: number;
  data: unknown;
  quizSubmissionCount: number;
  hasQuizSubmissions: boolean;
};

export type QuizInput = {
  title: string;
  validFrom: string;
  validTo: string | null;
  points: string;
  data: string;
};

export type SaveQuizResult = "success" | "error";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const parseTimestamp = (value: unknown): Date | null => {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const normalizeQuizInput = (input: unknown) => {
  if (!input || typeof input !== "object") {
    return null;
  }

  const record = input as Partial<QuizInput>;
  const title = typeof record.title === "string" ? record.title.trim() : "";
  const validFrom = parseTimestamp(record.validFrom);
  const validTo =
    record.validTo === null || record.validTo === "" || record.validTo === undefined
      ? null
      : parseTimestamp(record.validTo);
  const points = typeof record.points === "string" ? Number(record.points) : Number.NaN;

  if (
    title.length === 0 ||
    title.length > 255 ||
    !validFrom ||
    (record.validTo !== null && record.validTo !== "" && record.validTo !== undefined && !validTo) ||
    (validTo && validTo <= validFrom) ||
    !Number.isInteger(points) ||
    points < 0 ||
    points > 32767
  ) {
    return null;
  }

  let data: unknown;

  try {
    data = JSON.parse(typeof record.data === "string" ? record.data : "");
  } catch {
    return null;
  }

  const quizDataResult = validateQuizData(data);

  if (!quizDataResult.success) {
    return null;
  }

  return {
    title,
    validFrom,
    validTo,
    points,
    data: quizDataResult.data,
  };
};

export const getQuizzes = async (): Promise<QuizEntry[]> => {
  await requireAdminAccess();

  const [rows, submissionRows] = await Promise.all([
    db
      .select({
        id: quizzes.id,
        modifiedBy: quizzes.modifiedBy,
        modifiedByUsername: users.username,
        modifiedAt: quizzes.modifiedAt,
        title: quizzes.title,
        validFrom: quizzes.validFrom,
        validTo: quizzes.validTo,
        points: quizzes.points,
        data: quizzes.data,
      })
      .from(quizzes)
      .leftJoin(users, eq(quizzes.modifiedBy, users.id))
      .orderBy(asc(quizzes.validFrom), asc(quizzes.title), asc(quizzes.id)),
    db
      .select({
        quizId: quizSubmissions.quizId,
        submissionCount: count(quizSubmissions.id),
      })
      .from(quizSubmissions)
      .groupBy(quizSubmissions.quizId),
  ]);

  const submissionCountByQuizId = new Map(
    submissionRows.map((row) => [row.quizId, Number(row.submissionCount)]),
  );

  return rows.map((row) => {
    const quizSubmissionCount = submissionCountByQuizId.get(row.id) ?? 0;

    return {
      id: row.id,
      modifiedBy: row.modifiedBy,
      modifiedByUsername: row.modifiedByUsername,
      modifiedAt: row.modifiedAt.toISOString(),
      title: row.title,
      validFrom: row.validFrom.toISOString(),
      validTo: row.validTo?.toISOString() ?? null,
      points: row.points,
      data: row.data,
      quizSubmissionCount,
      hasQuizSubmissions: quizSubmissionCount > 0,
    };
  });
};

export const createQuiz = async (
  lang: unknown,
  input: unknown,
): Promise<SaveQuizResult> => {
  await requireAdminAccess();

  if (typeof lang !== "string" || !hasLocale(lang)) {
    return "error";
  }

  const normalized = normalizeQuizInput(input);
  const currentUser = await getCurrentUserRecord();

  if (!normalized || !currentUser?.admin) {
    return "error";
  }

  await db.insert(quizzes).values({
    modifiedBy: currentUser.id,
    modifiedAt: new Date(),
    title: normalized.title,
    validFrom: normalized.validFrom,
    validTo: normalized.validTo,
    points: normalized.points,
    data: normalized.data,
  });

  revalidatePath(`/${lang}/admin/quiz-management`);
  revalidatePath(`/${lang}/quizzes`);

  return "success";
};

export const updateQuiz = async (
  lang: unknown,
  id: unknown,
  input: unknown,
): Promise<SaveQuizResult> => {
  await requireAdminAccess();

  if (
    typeof lang !== "string" ||
    !hasLocale(lang) ||
    typeof id !== "string" ||
    !uuidPattern.test(id)
  ) {
    return "error";
  }

  const normalized = normalizeQuizInput(input);
  const currentUser = await getCurrentUserRecord();

  if (!normalized || !currentUser?.admin) {
    return "error";
  }

  await db
    .update(quizzes)
    .set({
      modifiedBy: currentUser.id,
      modifiedAt: new Date(),
      title: normalized.title,
      validFrom: normalized.validFrom,
      validTo: normalized.validTo,
      points: normalized.points,
      data: normalized.data,
    })
    .where(eq(quizzes.id, id));

  revalidatePath(`/${lang}/admin/quiz-management`);
  revalidatePath(`/${lang}/quizzes`);
  revalidatePath(`/${lang}/quizzes/${id}`);

  return "success";
};

export const deleteQuiz = async (lang: unknown, id: unknown): Promise<SaveQuizResult> => {
  await requireAdminAccess();

  if (
    typeof lang !== "string" ||
    !hasLocale(lang) ||
    typeof id !== "string" ||
    !uuidPattern.test(id)
  ) {
    return "error";
  }

  const linkedSubmissions = await db
    .select({ id: quizSubmissions.id })
    .from(quizSubmissions)
    .where(eq(quizSubmissions.quizId, id))
    .limit(1);

  if (linkedSubmissions.length > 0) {
    return "error";
  }

  await db.delete(quizzes).where(eq(quizzes.id, id));
  revalidatePath(`/${lang}/admin/quiz-management`);
  revalidatePath(`/${lang}/quizzes`);
  revalidatePath(`/${lang}/quizzes/${id}`);

  return "success";
};
