"use server";

import { auth } from "@/auth";
import { userPointSubmissions, users } from "@/db/schema";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";

export type GetPointsActionState = {
  status: "idle" | "success" | "error";
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
  const session = await auth();
  const userName = session?.user?.name;

  if (typeof userName !== "string" || userName.trim() === "" || userName.length > 255) {
    return { status: "error" };
  }

  const userRows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, userName))
    .limit(1);

  const userRecord = userRows[0];

  if (!userRecord) {
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

  await db.insert(userPointSubmissions).values({
    userId: userRecord.id,
    attendance,
    protocol,
    moderation,
    workingGroup,
    twl,
    presentations,
  });

  return { status: "success" };
};


