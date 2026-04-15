"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { requireAdminAccess } from "@/app/[lang]/admin/actions";
import { pointDistribution } from "@/db/schema";
import { hasLocale } from "@/i18n/config";
import { db } from "@/lib/db";

export type PointDistributionEntry = {
  id: string;
  activeFrom: string;
  attendanceVirtual: number;
  attendanceOnSite: number;
  protocolForced: number;
  protocolVoluntarily: number;
  moderation: number;
  workingGroup: number;
  twl: number;
  presentation: number;
};

export type SavePointDistributionActionState = {
  status: "idle" | "success" | "error";
};

type ParsedPointDistributionEntry = {
  id: string;
  activeFrom: Date;
  attendanceVirtual: number;
  attendanceOnSite: number;
  protocolForced: number;
  protocolVoluntarily: number;
  moderation: number;
  workingGroup: number;
  twl: number;
  presentation: number;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const toSmallInt = (value: unknown): number | null => {
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isInteger(parsed) || parsed < -32768 || parsed > 32767) {
    return null;
  }

  return parsed;
};

const parseEntry = (value: unknown): ParsedPointDistributionEntry | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;

  if (typeof row.id !== "string" || !uuidPattern.test(row.id)) {
    return null;
  }

  if (typeof row.activeFrom !== "string" || row.activeFrom.trim() === "") {
    return null;
  }

  const activeFrom = new Date(row.activeFrom);

  if (Number.isNaN(activeFrom.getTime())) {
    return null;
  }

  const attendanceVirtual = toSmallInt(row.attendanceVirtual);
  const attendanceOnSite = toSmallInt(row.attendanceOnSite);
  const protocolForced = toSmallInt(row.protocolForced);
  const protocolVoluntarily = toSmallInt(row.protocolVoluntarily);
  const moderation = toSmallInt(row.moderation);
  const workingGroup = toSmallInt(row.workingGroup);
  const twl = toSmallInt(row.twl);
  const presentation = toSmallInt(row.presentation);

  if (
    attendanceVirtual === null ||
    attendanceOnSite === null ||
    protocolForced === null ||
    protocolVoluntarily === null ||
    moderation === null ||
    workingGroup === null ||
    twl === null ||
    presentation === null
  ) {
    return null;
  }

  return {
    id: row.id,
    activeFrom,
    attendanceVirtual,
    attendanceOnSite,
    protocolForced,
    protocolVoluntarily,
    moderation,
    workingGroup,
    twl,
    presentation,
  };
};

export const getPointDistributionEntries = async (): Promise<PointDistributionEntry[]> => {
  await requireAdminAccess();

  const rows = await db
    .select({
      id: pointDistribution.id,
      activeFrom: pointDistribution.activeFrom,
      attendanceVirtual: pointDistribution.attendanceVirtual,
      attendanceOnSite: pointDistribution.attendanceOnSite,
      protocolForced: pointDistribution.protocolForced,
      protocolVoluntarily: pointDistribution.protocolVoluntarily,
      moderation: pointDistribution.moderation,
      workingGroup: pointDistribution.workingGroup,
      twl: pointDistribution.twl,
      presentation: pointDistribution.presentation,
    })
    .from(pointDistribution)
    .orderBy(pointDistribution.activeFrom);

  return rows.map((row) => ({
    ...row,
    activeFrom: row.activeFrom.toISOString(),
  }));
};

export const savePointDistributionEntries = async (
  _previousState: SavePointDistributionActionState,
  formData: FormData,
): Promise<SavePointDistributionActionState> => {
  await requireAdminAccess();

  const lang = formData.get("lang");
  const rowsJson = formData.get("rows");

  if (typeof lang !== "string" || !hasLocale(lang)) {
    return { status: "error" };
  }

  if (typeof rowsJson !== "string") {
    return { status: "error" };
  }

  let parsedRows: unknown;

  try {
    parsedRows = JSON.parse(rowsJson);
  } catch {
    return { status: "error" };
  }

  if (!Array.isArray(parsedRows)) {
    return { status: "error" };
  }

  const entries = parsedRows
    .map((row) => parseEntry(row))
    .filter((row): row is ParsedPointDistributionEntry => row !== null);

  if (entries.length !== parsedRows.length) {
    return { status: "error" };
  }

  await db.transaction(async (tx) => {
    for (const entry of entries) {
      const updatedRows = await tx
        .update(pointDistribution)
        .set({
          activeFrom: entry.activeFrom,
          attendanceVirtual: entry.attendanceVirtual,
          attendanceOnSite: entry.attendanceOnSite,
          protocolForced: entry.protocolForced,
          protocolVoluntarily: entry.protocolVoluntarily,
          moderation: entry.moderation,
          workingGroup: entry.workingGroup,
          twl: entry.twl,
          presentation: entry.presentation,
        })
        .where(eq(pointDistribution.id, entry.id))
        .returning({ id: pointDistribution.id });

      if (updatedRows.length === 0) {
        await tx.insert(pointDistribution).values({
          id: entry.id,
          activeFrom: entry.activeFrom,
          attendanceVirtual: entry.attendanceVirtual,
          attendanceOnSite: entry.attendanceOnSite,
          protocolForced: entry.protocolForced,
          protocolVoluntarily: entry.protocolVoluntarily,
          moderation: entry.moderation,
          workingGroup: entry.workingGroup,
          twl: entry.twl,
          presentation: entry.presentation,
        });
      }
    }
  });

  revalidatePath(`/${lang}/admin/point-distribution`);

  return { status: "success" };
};

export const deletePointDistributionEntry = async (
  lang: unknown,
  id: unknown,
): Promise<boolean> => {
  await requireAdminAccess();

  if (
    typeof lang !== "string" ||
    !hasLocale(lang) ||
    typeof id !== "string" ||
    !uuidPattern.test(id)
  ) {
    return false;
  }

  await db
    .delete(pointDistribution)
    .where(eq(pointDistribution.id, id));

  revalidatePath(`/${lang}/admin/point-distribution`);

  return true;
};
