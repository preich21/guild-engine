"use server";

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { and, asc, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import type { QuizData } from "@/config/quiz-data-type-definition";
import { quizSubmissions, quizzes } from "@/db/schema";
import { hasLocale } from "@/i18n/config";
import { getCurrentUserRecord } from "@/lib/auth/user";
import { db } from "@/lib/db";
import {validateQuizData} from "@/lib/quiz-data-validation";

export type PublicQuizEntry = {
  id: string;
  title: string;
  validFrom: string;
  validTo: string | null;
  points: number;
};

export type PublicQuizDetail = PublicQuizEntry & {
  data: QuizData | null;
  submissionTimestamp: string | null;
};

export type SubmitQuizResult =
  | { status: "created"; timestamp: string }
  | { status: "alreadySubmitted"; timestamp: string }
  | { status: "error" };

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const toPublicQuizEntry = (row: {
  id: string;
  title: string;
  validFrom: Date;
  validTo: Date | null;
  points: number;
}): PublicQuizEntry => ({
  id: row.id,
  title: row.title,
  validFrom: row.validFrom.toISOString(),
  validTo: row.validTo?.toISOString() ?? null,
  points: row.points,
});

export const getPublicQuizzes = async (): Promise<PublicQuizEntry[]> => {
  const rows = await db
    .select({
      id: quizzes.id,
      title: quizzes.title,
      validFrom: quizzes.validFrom,
      validTo: quizzes.validTo,
      points: quizzes.points,
    })
    .from(quizzes)
    .orderBy(desc(quizzes.validTo), asc(quizzes.title), asc(quizzes.id));

  return rows.map(toPublicQuizEntry);
};

export const getPublicQuizById = async (id: string): Promise<PublicQuizDetail | null> => {
  if (!uuidPattern.test(id)) {
    return null;
  }

  const currentUser = await getCurrentUserRecord();
  const [rows, submissionRows] = await Promise.all([
    db
      .select({
        id: quizzes.id,
        title: quizzes.title,
        validFrom: quizzes.validFrom,
        validTo: quizzes.validTo,
        points: quizzes.points,
        data: quizzes.data,
      })
      .from(quizzes)
      .where(eq(quizzes.id, id))
      .limit(1),
    currentUser
      ? db
          .select({ timestamp: quizSubmissions.timestamp })
          .from(quizSubmissions)
          .where(and(eq(quizSubmissions.userId, currentUser.id), eq(quizSubmissions.quizId, id)))
          .limit(1)
      : Promise.resolve([]),
  ]);

  const row = rows[0];

  return row
    ? {
        ...toPublicQuizEntry(row),
        data: validateQuizData(row.data).success ? (row.data as QuizData) : null,
        submissionTimestamp: submissionRows[0]?.timestamp.toISOString() ?? null,
      }
    : null;
};

export const submitQuiz = async (lang: unknown, quizId: unknown): Promise<SubmitQuizResult> => {
  if (
    typeof lang !== "string" ||
    !hasLocale(lang) ||
    typeof quizId !== "string" ||
    !uuidPattern.test(quizId)
  ) {
    return { status: "error" };
  }

  const currentUser = await getCurrentUserRecord();

  if (!currentUser) {
    return { status: "error" };
  }

  const existingRows = await db
    .select({ timestamp: quizSubmissions.timestamp })
    .from(quizSubmissions)
    .where(and(eq(quizSubmissions.userId, currentUser.id), eq(quizSubmissions.quizId, quizId)))
    .limit(1);

  const existing = existingRows[0];

  if (existing) {
    return { status: "alreadySubmitted", timestamp: existing.timestamp.toISOString() };
  }

  const insertedRows = await db
    .insert(quizSubmissions)
    .values({
      userId: currentUser.id,
      quizId,
    })
    .onConflictDoNothing({
      target: [quizSubmissions.userId, quizSubmissions.quizId],
    })
    .returning({ timestamp: quizSubmissions.timestamp });

  const inserted = insertedRows[0];

  if (!inserted) {
    const currentRows = await db
      .select({ timestamp: quizSubmissions.timestamp })
      .from(quizSubmissions)
      .where(and(eq(quizSubmissions.userId, currentUser.id), eq(quizSubmissions.quizId, quizId)))
      .limit(1);

    const current = currentRows[0];

    return current
      ? { status: "alreadySubmitted", timestamp: current.timestamp.toISOString() }
      : { status: "error" };
  }

  const timestamp = inserted.timestamp.toISOString();

  revalidatePath(`/${lang}/quizzes/${quizId}`);

  return { status: "created", timestamp };
};

export const getQuizDataTypeDefinition = async () => {
  try {
    return await readFile(join(process.cwd(), "src/config/quiz-data-type-definition.ts"), "utf8");
  } catch {
    return "";
  }
};
