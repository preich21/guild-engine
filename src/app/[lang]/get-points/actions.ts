"use server";

import { guildMeetings, powerupUtilization, userPointSubmissions } from "@/db/schema";
import { getCurrentUserRecord } from "@/lib/auth/user";
import { db } from "@/lib/db";
import { and, asc, desc, eq, inArray } from "drizzle-orm";

export type GetPointsActionState = {
  status: "idle" | "success" | "error";
};

export type AttendanceAnswer = "no" | "virtually" | "onSite";
export type ProtocolAnswer = "no" | "forced" | "voluntary";
export type YesNoAnswer = "no" | "yes";

export type GetPointsFormValues = {
  attendance: AttendanceAnswer;
  protocol: ProtocolAnswer;
  moderation: YesNoAnswer;
  participation: YesNoAnswer;
  twlPosts: number;
  presentations: number;
};

export type PointMultiplicatorPowerupId =
  | "small-point-multiplicator"
  | "medium-point-multiplicator"
  | "large-point-multiplicator";

export type GetPointsPageData = {
  hasEligibleMeeting: boolean;
  formDisabled: boolean;
  meetingId: string | null;
  selectedMeetingDate: string | null;
  availableMeetingDates: string[];
  previousMeetingDate: string | null;
  nextMeetingDate: string | null;
  initialValues: GetPointsFormValues;
  lastModifiedAt: string | null;
  activatedPointMultiplicator: PointMultiplicatorPowerupId | null;
};

type MeetingEntry = {
  id: string;
  timestamp: Date;
  dateKey: string;
};

const defaultFormValues: GetPointsFormValues = {
  attendance: "no",
  protocol: "no",
  moderation: "no",
  participation: "no",
  twlPosts: 0,
  presentations: 0,
};

const attendanceMap = {
  no: 0,
  virtually: 1,
  onSite: 2,
} as const;

const protocolMap = {
  no: 0,
  forced: 1,
  voluntary: 2,
} as const;

const yesNoMap = {
  no: false,
  yes: true,
} as const;

const pointMultiplicatorPowerupIds = [
  "small-point-multiplicator",
  "medium-point-multiplicator",
  "large-point-multiplicator",
] as const;

const isPointMultiplicatorPowerupId = (
  powerupId: string,
): powerupId is PointMultiplicatorPowerupId =>
  pointMultiplicatorPowerupIds.some((pointMultiplicatorId) => pointMultiplicatorId === powerupId);

const attendanceNumberToAnswer: Record<number, AttendanceAnswer> = {
  0: "no",
  1: "virtually",
  2: "onSite",
};

const protocolNumberToAnswer: Record<number, ProtocolAnswer> = {
  0: "no",
  1: "forced",
  2: "voluntary",
};

const booleanToYesNoAnswer = (value: boolean): YesNoAnswer => (value ? "yes" : "no");

const isValidMeetingDateKey = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

const getDateKey = (value: Date): string => value.toISOString().slice(0, 10);

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

const getActivatedPointMultiplicator = async (
  userId: string,
  meetingId: string,
): Promise<PointMultiplicatorPowerupId | null> => {
  const utilizationRows = await db
    .select({ powerup: powerupUtilization.powerup })
    .from(powerupUtilization)
    .where(
      and(
        eq(powerupUtilization.meetingId, meetingId),
        eq(powerupUtilization.userId, userId),
        inArray(powerupUtilization.powerup, pointMultiplicatorPowerupIds),
      ),
    )
    .orderBy(desc(powerupUtilization.usageTimestamp))
    .limit(1);

  const powerup = utilizationRows[0]?.powerup;

  return powerup && isPointMultiplicatorPowerupId(powerup) ? powerup : null;
};

export const getGetPointsPageData = async (
  selectedMeetingDate: string | null,
): Promise<GetPointsPageData> => {
  const meetings = await getAllMeetings();
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
      initialValues: defaultFormValues,
      lastModifiedAt: null,
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
      initialValues: defaultFormValues,
      lastModifiedAt: null,
      activatedPointMultiplicator: null,
    };
  }

  const [submissionRows, activatedPointMultiplicator] = await Promise.all([
    db
      .select({
        attendance: userPointSubmissions.attendance,
        protocol: userPointSubmissions.protocol,
        moderation: userPointSubmissions.moderation,
        workingGroup: userPointSubmissions.workingGroup,
        twl: userPointSubmissions.twl,
        presentations: userPointSubmissions.presentations,
        modifiedAt: userPointSubmissions.modifiedAt,
      })
      .from(userPointSubmissions)
      .where(
        and(
          eq(userPointSubmissions.userId, userRecord.id),
          eq(userPointSubmissions.guildMeetingId, meeting.id),
        ),
      )
      .orderBy(desc(userPointSubmissions.modifiedAt))
      .limit(1),
    getActivatedPointMultiplicator(userRecord.id, meeting.id),
  ]);

  const submission = submissionRows[0];

  if (!submission) {
    return {
      hasEligibleMeeting: true,
      formDisabled: false,
      meetingId: meeting.id,
      selectedMeetingDate: meeting.dateKey,
      availableMeetingDates,
      previousMeetingDate,
      nextMeetingDate,
      initialValues: defaultFormValues,
      lastModifiedAt: null,
      activatedPointMultiplicator,
    };
  }

  return {
    hasEligibleMeeting: true,
    formDisabled: false,
    meetingId: meeting.id,
    selectedMeetingDate: meeting.dateKey,
    availableMeetingDates,
    previousMeetingDate,
    nextMeetingDate,
    initialValues: {
      attendance: attendanceNumberToAnswer[submission.attendance] ?? "no",
      protocol: protocolNumberToAnswer[submission.protocol] ?? "no",
      moderation: booleanToYesNoAnswer(submission.moderation),
      participation: booleanToYesNoAnswer(submission.workingGroup),
      twlPosts: submission.twl,
      presentations: submission.presentations,
    },
    lastModifiedAt: submission.modifiedAt.toISOString(),
    activatedPointMultiplicator,
  };
};

const parseNonNegativeSmallInt = (value: FormDataEntryValue | null) => {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 99) {
    return null;
  }

  return parsed;
};

export const saveGetPoints = async (
  _previousState: GetPointsActionState,
  formData: FormData,
): Promise<GetPointsActionState> => {
  const userRecord = await getCurrentUserRecord();

  if (!userRecord) {
    return { status: "error" };
  }

  const meetingId = formData.get("guildMeetingId");

  if (typeof meetingId !== "string" || meetingId.trim() === "") {
    return { status: "error" };
  }

  const selectedMeeting = await getMeetingById(meetingId);

  if (!selectedMeeting) {
    return { status: "error" };
  }

  const attendanceRaw = formData.get("attendance");
  const protocolRaw = formData.get("protocol");
  const moderationRaw = formData.get("moderation");
  const participationRaw = formData.get("participation");
  const twlRaw = formData.get("twlPosts");
  const presentationsRaw = formData.get("presentations");

  if (typeof attendanceRaw !== "string" || !(attendanceRaw in attendanceMap)) {
    return { status: "error" };
  }

  const normalizedProtocolRaw =
    attendanceRaw === "no" && protocolRaw === null ? "no" : protocolRaw;
  const normalizedModerationRaw =
    attendanceRaw === "no" && moderationRaw === null ? "no" : moderationRaw;

  if (
    typeof normalizedProtocolRaw !== "string" ||
    !(normalizedProtocolRaw in protocolMap) ||
    typeof normalizedModerationRaw !== "string" ||
    !(normalizedModerationRaw in yesNoMap) ||
    typeof participationRaw !== "string" ||
    !(participationRaw in yesNoMap)
  ) {
    return { status: "error" };
  }

  const attendance = attendanceMap[attendanceRaw as keyof typeof attendanceMap];
  const protocol = protocolMap[normalizedProtocolRaw as keyof typeof protocolMap];
  const moderation = yesNoMap[normalizedModerationRaw as keyof typeof yesNoMap];
  const workingGroup = yesNoMap[participationRaw as keyof typeof yesNoMap];

  // Enforce protocol/moderation consistency if attendance is "no".
  if (attendance === 0 && (protocol !== 0 || moderation)) {
    return { status: "error" };
  }

  const twl = parseNonNegativeSmallInt(twlRaw);
  const presentations = parseNonNegativeSmallInt(presentationsRaw);

  if (twl === null || presentations === null) {
    return { status: "error" };
  }

  const existingSubmissionRows = await db
    .select({ id: userPointSubmissions.id })
    .from(userPointSubmissions)
    .where(
      and(
        eq(userPointSubmissions.userId, userRecord.id),
        eq(userPointSubmissions.guildMeetingId, meetingId),
      ),
    )
    .orderBy(desc(userPointSubmissions.modifiedAt))
    .limit(1);

  const existingSubmission = existingSubmissionRows[0];

  if (existingSubmission) {
    await db
      .update(userPointSubmissions)
      .set({
        modifiedAt: new Date(),
        attendance,
        protocol,
        moderation,
        workingGroup,
        twl,
        presentations,
      })
      .where(eq(userPointSubmissions.id, existingSubmission.id));
  } else {
    await db.insert(userPointSubmissions).values({
      userId: userRecord.id,
      guildMeetingId: meetingId,
      attendance,
      protocol,
      moderation,
      workingGroup,
      twl,
      presentations,
    });
  }

  return { status: "success" };
};
