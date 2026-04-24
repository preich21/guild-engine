"use server";

import { revalidatePath } from "next/cache";
import { asc, eq } from "drizzle-orm";

import { requireAdminAccess } from "@/app/[lang]/admin/actions";
import { manualPoints, users } from "@/db/schema";
import { hasLocale } from "@/i18n/config";
import { db } from "@/lib/db";

export type ManualPointsUser = {
  id: string;
  username: string;
};

export type SaveManualPointsActionState = {
  status: "idle" | "success" | "error";
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const toPositiveSmallInt = (value: FormDataEntryValue | null) => {
  if (typeof value !== "string") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 32767) {
    return null;
  }

  return parsed;
};

export const getManualPointsUsers = async (): Promise<ManualPointsUser[]> => {
  await requireAdminAccess();

  return db
    .select({
      id: users.id,
      username: users.username,
    })
    .from(users)
    .orderBy(asc(users.username), asc(users.id));
};

export const saveManualPoints = async (
  _previousState: SaveManualPointsActionState,
  formData: FormData,
): Promise<SaveManualPointsActionState> => {
  await requireAdminAccess();

  const lang = formData.get("lang");
  const userId = formData.get("userId");
  const points = toPositiveSmallInt(formData.get("points"));
  const reason = formData.get("reason");

  if (
    typeof lang !== "string" ||
    !hasLocale(lang) ||
    typeof userId !== "string" ||
    !uuidPattern.test(userId) ||
    points === null ||
    typeof reason !== "string" ||
    reason.trim() === ""
  ) {
    return { status: "error" };
  }

  const userRow = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (userRow.length === 0) {
    return { status: "error" };
  }

  await db.insert(manualPoints).values({
    userId,
    points,
    reason: reason.trim(),
  });

  revalidatePath(`/${lang}/admin/manual-points`);
  revalidatePath(`/${lang}/leaderboard`);
  revalidatePath(`/${lang}/leaderboard/individual`);
  revalidatePath(`/${lang}/leaderboard/team`);

  return { status: "success" };
};
