"use server";

import { revalidatePath } from "next/cache";
import { and, asc, desc, eq, like } from "drizzle-orm";

import {
  guildMeetings,
  performanceMetrics,
  powerupUtilization,
  trackedContributions,
  type TrackedContributionDataEntry,
} from "@/db/schema";
import { hasLocale } from "@/i18n/config";
import { getCurrentUserRecord } from "@/lib/auth/user";
import { db } from "@/lib/db";

export type TrackContributionsActionState = {
  status: "idle" | "success" | "error";
};

export type ContributionMetricEntry = {
  id: string;
  shortName: string;
  question: string;
  type: number;
  enumPossibilities: string | null;
};

export type TrackContributionFormValues = Record<string, string>;

export type TrackContributionsPageData = {
  hasEligibleMeeting: boolean;
  formDisabled: boolean;
  meetingId: string | null;
  selectedMeetingDate: string | null;
  availableMeetingDates: string[];
  previousMeetingDate: string | null;
  nextMeetingDate: string | null;
  metrics: ContributionMetricEntry[];
  initialValues: TrackContributionFormValues;
  lastModifiedAt: string | null;
  hasExistingContribution: boolean;
  activatedPointMultiplicator: string | null;
};

type MeetingEntry = {
  id: string;
  timestamp: Date;
  dateKey: string;
};

const INTEGER_MIN_VALUE = 0;
const INTEGER_MAX_VALUE = 10_000;

const isValidMeetingDateKey = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

const getDateKey = (value: Date): string => value.toISOString().slice(0, 10);

const getMetricFormKey = (metricId: string) => `metric:${metricId}`;

const getActivatedPointMultiplicator = async (
  userId: string,
  meetingId: string,
): Promise<string | null> => {
  const utilizationRows = await db
    .select({ powerup: powerupUtilization.powerup })
    .from(powerupUtilization)
    .where(
      and(
        eq(powerupUtilization.userId, userId),
        eq(powerupUtilization.meetingId, meetingId),
        like(powerupUtilization.powerup, "%-point-multiplicator"),
      ),
    )
    .limit(1);

  return utilizationRows[0]?.powerup ?? null;
};

const getEnumPossibilities = (value: string | null) =>
  value
    ?.split(";")
    .map((possibility) => possibility.trim())
    .filter(Boolean) ?? [];

const isTrackedContributionData = (value: unknown): value is TrackedContributionDataEntry[] =>
  Array.isArray(value) &&
  value.every(
    (entry) =>
      typeof entry === "object" &&
      entry !== null &&
      typeof (entry as { id?: unknown }).id === "string" &&
      Number.isInteger((entry as { value?: unknown }).value),
  );

const getAllMeetings = async (): Promise<MeetingEntry[]> => {
  const meetingRows = await db
    .select({
      id: guildMeetings.id,
      timestamp: guildMeetings.timestamp,
    })
    .from(guildMeetings)
    .orderBy(asc(guildMeetings.timestamp))
    .execute();

  return meetingRows.map((meeting) => ({
    ...meeting,
    dateKey: getDateKey(meeting.timestamp),
  }));
};

const getPerformanceMetrics = async (): Promise<ContributionMetricEntry[]> =>
  db
    .select({
      id: performanceMetrics.id,
      shortName: performanceMetrics.shortName,
      question: performanceMetrics.question,
      type: performanceMetrics.type,
      enumPossibilities: performanceMetrics.enumPossibilities,
    })
    .from(performanceMetrics)
    .orderBy(asc(performanceMetrics.timestampAdded), asc(performanceMetrics.shortName), asc(performanceMetrics.id));

const getDefaultMeeting = (meetings: MeetingEntry[]): MeetingEntry | null => {
  const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000);

  return meetings.find((meeting) => meeting.timestamp >= cutoff) ?? null;
};

const getSelectedMeeting = (
  meetings: MeetingEntry[],
  selectedMeetingDate: string | null,
): MeetingEntry | null => {
  if (!selectedMeetingDate) {
    return getDefaultMeeting(meetings);
  }

  if (!isValidMeetingDateKey(selectedMeetingDate)) {
    return null;
  }

  return meetings.find((meeting) => meeting.dateKey === selectedMeetingDate) ?? null;
};

const getMeetingById = async (meetingId: string) => {
  const meetingRows = await db
    .select({ id: guildMeetings.id })
    .from(guildMeetings)
    .where(eq(guildMeetings.id, meetingId))
    .limit(1);

  return meetingRows[0] ?? null;
};

const getInitialValues = (
  metrics: ContributionMetricEntry[],
  data: TrackedContributionDataEntry[] | null,
): TrackContributionFormValues => {
  const savedValueByMetricId = new Map(data?.map((entry) => [entry.id, entry.value]) ?? []);

  return Object.fromEntries(
    metrics.map((metric) => {
      const savedValue = savedValueByMetricId.get(metric.id);

      if (metric.type === 1) {
        const value =
          savedValue !== undefined &&
          Number.isInteger(savedValue) &&
          savedValue >= INTEGER_MIN_VALUE &&
          savedValue <= INTEGER_MAX_VALUE
            ? String(savedValue)
            : "0";

        return [metric.id, value];
      }

      if (metric.type === 0) {
        const possibilities = getEnumPossibilities(metric.enumPossibilities);
        const value =
          savedValue !== undefined &&
          Number.isInteger(savedValue) &&
          savedValue >= 0 &&
          savedValue < possibilities.length
            ? String(savedValue)
            : possibilities.length > 0
              ? "0"
              : "";

        return [metric.id, value];
      }

      return [metric.id, ""];
    }),
  );
};

export const getTrackContributionsPageData = async (
  selectedMeetingDate: string | null,
): Promise<TrackContributionsPageData> => {
  const [meetings, metrics] = await Promise.all([getAllMeetings(), getPerformanceMetrics()]);
  const meeting = getSelectedMeeting(meetings, selectedMeetingDate);
  const availableMeetingDates = meetings.map((entry) => entry.dateKey);

  if (!meeting) {
    return {
      hasEligibleMeeting: false,
      formDisabled: true,
      meetingId: null,
      selectedMeetingDate: null,
      availableMeetingDates,
      previousMeetingDate: null,
      nextMeetingDate: null,
      metrics,
      initialValues: getInitialValues(metrics, null),
      lastModifiedAt: null,
      hasExistingContribution: false,
      activatedPointMultiplicator: null,
    };
  }

  const selectedMeetingIndex = meetings.findIndex((entry) => entry.id === meeting.id);
  const previousMeetingDate =
    selectedMeetingIndex > 0 ? meetings[selectedMeetingIndex - 1]?.dateKey ?? null : null;
  const nextMeetingDate =
    selectedMeetingIndex >= 0 && selectedMeetingIndex < meetings.length - 1
      ? meetings[selectedMeetingIndex + 1]?.dateKey ?? null
      : null;

  const userRecord = await getCurrentUserRecord();

  if (!userRecord) {
    return {
      hasEligibleMeeting: true,
      formDisabled: false,
      meetingId: meeting.id,
      selectedMeetingDate: meeting.dateKey,
      availableMeetingDates,
      previousMeetingDate,
      nextMeetingDate,
      metrics,
      initialValues: getInitialValues(metrics, null),
      lastModifiedAt: null,
      hasExistingContribution: false,
      activatedPointMultiplicator: null,
    };
  }

  const [contributionRows, activatedPointMultiplicator] = await Promise.all([
    db
      .select({
        data: trackedContributions.data,
        modifiedAt: trackedContributions.modifiedAt,
      })
      .from(trackedContributions)
      .where(
        and(
          eq(trackedContributions.userId, userRecord.id),
          eq(trackedContributions.meetingId, meeting.id),
        ),
      )
      .orderBy(desc(trackedContributions.modifiedAt))
      .limit(1),
    getActivatedPointMultiplicator(userRecord.id, meeting.id),
  ]);

  const contribution = contributionRows[0];
  const contributionData = contribution && isTrackedContributionData(contribution.data) ? contribution.data : null;

  return {
    hasEligibleMeeting: true,
    formDisabled: false,
    meetingId: meeting.id,
    selectedMeetingDate: meeting.dateKey,
    availableMeetingDates,
    previousMeetingDate,
    nextMeetingDate,
    metrics,
    initialValues: getInitialValues(metrics, contributionData),
    lastModifiedAt: contribution?.modifiedAt.toISOString() ?? null,
    hasExistingContribution: Boolean(contribution),
    activatedPointMultiplicator,
  };
};

const parseIntegerMetricValue = (value: FormDataEntryValue | null) => {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < INTEGER_MIN_VALUE || parsed > INTEGER_MAX_VALUE) {
    return null;
  }

  return parsed;
};

export const saveTrackContributions = async (
  _previousState: TrackContributionsActionState,
  formData: FormData,
): Promise<TrackContributionsActionState> => {
  const userRecord = await getCurrentUserRecord();

  if (!userRecord) {
    return { status: "error" };
  }

  const lang = formData.get("lang");
  const meetingId = formData.get("meetingId");

  if (
    typeof lang !== "string" ||
    !hasLocale(lang) ||
    typeof meetingId !== "string" ||
    meetingId.trim() === ""
  ) {
    return { status: "error" };
  }

  const [selectedMeeting, metrics] = await Promise.all([getMeetingById(meetingId), getPerformanceMetrics()]);

  if (!selectedMeeting) {
    return { status: "error" };
  }

  const data: TrackedContributionDataEntry[] = [];

  for (const metric of metrics) {
    const rawValue = formData.get(getMetricFormKey(metric.id));

    if (metric.type === 0) {
      const possibilities = getEnumPossibilities(metric.enumPossibilities);

      if (possibilities.length === 0 || typeof rawValue !== "string") {
        return { status: "error" };
      }

      const parsed = Number(rawValue);

      if (!Number.isInteger(parsed) || parsed < 0 || parsed >= possibilities.length) {
        return { status: "error" };
      }

      data.push({ id: metric.id, value: parsed });
      continue;
    }

    if (metric.type === 1) {
      const parsed = parseIntegerMetricValue(rawValue);

      if (parsed === null) {
        return { status: "error" };
      }

      data.push({ id: metric.id, value: parsed });
      continue;
    }

    return { status: "error" };
  }

  const existingContributionRows = await db
    .select({ id: trackedContributions.id })
    .from(trackedContributions)
    .where(
      and(
        eq(trackedContributions.userId, userRecord.id),
        eq(trackedContributions.meetingId, meetingId),
      ),
    )
    .limit(1);

  const modifiedAt = new Date();
  const existingContribution = existingContributionRows[0];

  if (existingContribution) {
    await db
      .update(trackedContributions)
      .set({ modifiedAt, data })
      .where(eq(trackedContributions.id, existingContribution.id));
  } else {
    await db.insert(trackedContributions).values({
      userId: userRecord.id,
      meetingId,
      modifiedAt,
      data,
    });
  }

  revalidatePath(`/${lang}/track-contributions`);

  return { status: "success" };
};
