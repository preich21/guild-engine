"use server";

import { revalidatePath } from "next/cache";
import { and, count, eq, gte, lt, ne } from "drizzle-orm";

import { requireAdminAccess } from "@/app/[lang]/admin/actions";
import { guildMeetings, userPointSubmissions } from "@/db/schema";
import { hasLocale } from "@/i18n/config";
import { db } from "@/lib/db";

export type GuildMeetingEntry = {
  id: string;
  timestamp: string;
  submissionCount: number;
};

export type CreateGuildMeetingActionState = {
  status: "idle" | "success" | "error";
};

export type DeleteGuildMeetingResult = "success" | "hasSubmissions" | "error";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const toFixedMeetingTimestamp1430 = (meetingDate: string): Date | null => {
  if (!datePattern.test(meetingDate)) {
    return null;
  }

  const [year, month, day] = meetingDate.split("-").map((part) => Number(part));

  if (!year || !month || !day) {
    return null;
  }

  const timestamp = new Date(Date.UTC(year, month - 1, day, 14, 30, 0, 0));

  if (
    Number.isNaN(timestamp.getTime()) ||
    timestamp.getUTCFullYear() !== year ||
    timestamp.getUTCMonth() !== month - 1 ||
    timestamp.getUTCDate() !== day
  ) {
    return null;
  }

  return timestamp;
};

export const getGuildMeetingEntries = async (): Promise<GuildMeetingEntry[]> => {
  await requireAdminAccess();

  const [meetingRows, submissionRows] = await Promise.all([
    db
      .select({
        id: guildMeetings.id,
        timestamp: guildMeetings.timestamp,
      })
      .from(guildMeetings)
      .orderBy(guildMeetings.timestamp),
    db
      .select({
        guildMeetingId: userPointSubmissions.guildMeetingId,
        submissionCount: count(userPointSubmissions.id),
      })
      .from(userPointSubmissions)
      .groupBy(userPointSubmissions.guildMeetingId),
  ]);

  const submissionCountByMeetingId = new Map(
    submissionRows.map((row) => [row.guildMeetingId, Number(row.submissionCount)]),
  );

  return meetingRows.map((row) => ({
    id: row.id,
    timestamp: row.timestamp.toISOString(),
    submissionCount: submissionCountByMeetingId.get(row.id) ?? 0,
  }));
};

export const createGuildMeeting = async (
  _previousState: CreateGuildMeetingActionState,
  formData: FormData,
): Promise<CreateGuildMeetingActionState> => {
  await requireAdminAccess();

  const lang = formData.get("lang");
  const meetingDate = formData.get("meetingDate");

  if (typeof lang !== "string" || !hasLocale(lang) || typeof meetingDate !== "string") {
    return { status: "error" };
  }

  const timestamp = toFixedMeetingTimestamp1430(meetingDate);

  if (!timestamp) {
    return { status: "error" };
  }

  const [year, month, day] = meetingDate.split("-").map((part) => Number(part));
  const dayStart = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const nextDayStart = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0));

  const existingMeeting = await db
    .select({ id: guildMeetings.id })
    .from(guildMeetings)
    .where(and(gte(guildMeetings.timestamp, dayStart), lt(guildMeetings.timestamp, nextDayStart)))
    .limit(1);

  if (existingMeeting.length > 0) {
    return { status: "error" };
  }

  await db.insert(guildMeetings).values({
    timestamp,
  });

  revalidatePath(`/${lang}/admin/guild-meetings`);

  return { status: "success" };
};

export const deleteGuildMeeting = async (lang: unknown, id: unknown): Promise<DeleteGuildMeetingResult> => {
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
    .select({ id: userPointSubmissions.id })
    .from(userPointSubmissions)
    .where(eq(userPointSubmissions.guildMeetingId, id))
    .limit(1);

  if (linkedSubmissions.length > 0) {
    return "hasSubmissions";
  }

  await db.delete(guildMeetings).where(eq(guildMeetings.id, id));

  revalidatePath(`/${lang}/admin/guild-meetings`);

  return "success";
};

export const migrateSubmissionsAndDeleteGuildMeeting = async (
  lang: unknown,
  sourceGuildMeetingId: unknown,
  targetGuildMeetingId: unknown,
): Promise<boolean> => {
  await requireAdminAccess();

  if (
    typeof lang !== "string" ||
    !hasLocale(lang) ||
    typeof sourceGuildMeetingId !== "string" ||
    !uuidPattern.test(sourceGuildMeetingId) ||
    typeof targetGuildMeetingId !== "string" ||
    !uuidPattern.test(targetGuildMeetingId) ||
    sourceGuildMeetingId === targetGuildMeetingId
  ) {
    return false;
  }

  const targetMeetingRows = await db
    .select({ id: guildMeetings.id })
    .from(guildMeetings)
    .where(and(eq(guildMeetings.id, targetGuildMeetingId), ne(guildMeetings.id, sourceGuildMeetingId)))
    .limit(1);

  if (targetMeetingRows.length === 0) {
    return false;
  }

  await db.transaction(async (tx) => {
    await tx
      .update(userPointSubmissions)
      .set({ guildMeetingId: targetGuildMeetingId })
      .where(eq(userPointSubmissions.guildMeetingId, sourceGuildMeetingId));

    await tx
      .delete(guildMeetings)
      .where(eq(guildMeetings.id, sourceGuildMeetingId));
  });

  revalidatePath(`/${lang}/admin/guild-meetings`);

  return true;
};


