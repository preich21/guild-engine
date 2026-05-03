"use server";

import { revalidatePath } from "next/cache";
import { and, count, eq, gte, lt } from "drizzle-orm";

import { requireAdminAccess } from "@/app/[lang]/admin/actions";
import { guildMeetings, trackedContributions } from "@/db/schema";
import { hasLocale } from "@/i18n/config";
import { db } from "@/lib/db";

export type GuildMeetingEntry = {
  id: string;
  timestamp: string;
  trackedContributionCount: number;
  hasTrackedContributions: boolean;
};

export type CreateGuildMeetingActionState = {
  status: "idle" | "success" | "error";
};

export type DeleteGuildMeetingResult = "success" | "hasContributions" | "error";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

const toMeetingTimestamp = (meetingDate: string, meetingTime: string): Date | null => {
  if (!datePattern.test(meetingDate)) {
    return null;
  }

  const timeMatch = timePattern.exec(meetingTime);

  if (!timeMatch) {
    return null;
  }

  const [year, month, day] = meetingDate.split("-").map((part) => Number(part));
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);

  if (!year || !month || !day) {
    return null;
  }

  const timestamp = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));

  if (
    Number.isNaN(timestamp.getTime()) ||
    timestamp.getUTCFullYear() !== year ||
    timestamp.getUTCMonth() !== month - 1 ||
    timestamp.getUTCDate() !== day ||
    timestamp.getUTCHours() !== hour ||
    timestamp.getUTCMinutes() !== minute
  ) {
    return null;
  }

  return timestamp;
};

export const getGuildMeetingEntries = async (): Promise<GuildMeetingEntry[]> => {
  await requireAdminAccess();

  const [meetingRows, contributionRows] = await Promise.all([
    db
      .select({
        id: guildMeetings.id,
        timestamp: guildMeetings.timestamp,
      })
      .from(guildMeetings)
      .orderBy(guildMeetings.timestamp),
    db
      .select({
        meetingId: trackedContributions.meetingId,
        contributionCount: count(trackedContributions.id),
      })
      .from(trackedContributions)
      .groupBy(trackedContributions.meetingId),
  ]);

  const contributionCountByMeetingId = new Map(
    contributionRows.map((row) => [row.meetingId, Number(row.contributionCount)]),
  );

  return meetingRows.map((row) => {
    const trackedContributionCount = contributionCountByMeetingId.get(row.id) ?? 0;

    return {
      id: row.id,
      timestamp: row.timestamp.toISOString(),
      trackedContributionCount,
      hasTrackedContributions: trackedContributionCount > 0,
    };
  });
};

export const createGuildMeeting = async (
  _previousState: CreateGuildMeetingActionState,
  formData: FormData,
): Promise<CreateGuildMeetingActionState> => {
  await requireAdminAccess();

  const lang = formData.get("lang");
  const meetingDate = formData.get("meetingDate");
  const meetingTime = formData.get("meetingTime");

  if (
    typeof lang !== "string" ||
    !hasLocale(lang) ||
    typeof meetingDate !== "string" ||
    typeof meetingTime !== "string"
  ) {
    return { status: "error" };
  }

  const timestamp = toMeetingTimestamp(meetingDate, meetingTime);

  if (!timestamp) {
    return { status: "error" };
  }

  const [year, month, day] = meetingDate.split("-").map((part) => Number(part));
  const dayStart = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const nextDayStart = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0));
  const today = new Date();
  const todayStart = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0, 0),
  );

  if (dayStart < todayStart) {
    return { status: "error" };
  }

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

  revalidatePath(`/${lang}/admin/meetings`);

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

  const linkedContributions = await db
    .select({ id: trackedContributions.id })
    .from(trackedContributions)
    .where(eq(trackedContributions.meetingId, id))
    .limit(1);

  if (linkedContributions.length > 0) {
    return "hasContributions";
  }

  await db.delete(guildMeetings).where(eq(guildMeetings.id, id));

  revalidatePath(`/${lang}/admin/meetings`);

  return "success";
};
