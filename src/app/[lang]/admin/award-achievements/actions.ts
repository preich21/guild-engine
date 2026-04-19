"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq, inArray } from "drizzle-orm";

import { requireAdminAccess } from "@/app/[lang]/admin/actions";
import { achievements, userAchievements, users } from "@/db/schema";
import { hasLocale } from "@/i18n/config";
import { db } from "@/lib/db";

export type AwardAchievement = {
  id: string;
  title: string;
  description: string | null;
  image: string;
};

export type AwardAchievementUserRow = {
  id: string;
  username: string;
  achievements: Array<Pick<AwardAchievement, "id" | "title" | "image">>;
};

export type AwardAchievementsData = {
  achievements: AwardAchievement[];
  users: AwardAchievementUserRow[];
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const getAwardAchievementsData = async (): Promise<AwardAchievementsData> => {
  await requireAdminAccess();

  const [achievementRows, userRows, userAchievementRows] = await Promise.all([
    db
      .select({
        id: achievements.id,
        title: achievements.title,
        description: achievements.description,
        image: achievements.image,
      })
      .from(achievements)
      .orderBy(asc(achievements.title), asc(achievements.id)),
    db
      .select({
        id: users.id,
        username: users.username,
      })
      .from(users)
      .orderBy(asc(users.username), asc(users.id)),
    db
      .select({
        userId: userAchievements.userId,
        achievementId: achievements.id,
        achievementTitle: achievements.title,
        achievementImage: achievements.image,
      })
      .from(userAchievements)
      .innerJoin(achievements, eq(userAchievements.achievementId, achievements.id))
      .orderBy(
        asc(userAchievements.userId),
        asc(achievements.title),
        asc(achievements.id),
      ),
  ]);

  const achievementsByUserId = new Map<
    string,
    Array<Pick<AwardAchievement, "id" | "title" | "image">>
  >();

  for (const row of userAchievementRows) {
    const current = achievementsByUserId.get(row.userId) ?? [];
    current.push({
      id: row.achievementId,
      title: row.achievementTitle,
      image: row.achievementImage,
    });
    achievementsByUserId.set(row.userId, current);
  }

  return {
    achievements: achievementRows,
    users: userRows.map((row) => ({
      id: row.id,
      username: row.username,
      achievements: achievementsByUserId.get(row.id) ?? [],
    })),
  };
};

export const updateAwardedAchievements = async (
  lang: unknown,
  userId: unknown,
  selectedAchievementIds: unknown,
): Promise<boolean> => {
  await requireAdminAccess();

  if (
    typeof lang !== "string" ||
    !hasLocale(lang) ||
    typeof userId !== "string" ||
    !uuidPattern.test(userId) ||
    !Array.isArray(selectedAchievementIds) ||
    !selectedAchievementIds.every(
      (achievementId) => typeof achievementId === "string" && uuidPattern.test(achievementId),
    )
  ) {
    return false;
  }

  const uniqueSelectedAchievementIds = Array.from(new Set(selectedAchievementIds));

  const [userRow, existingRows, validAchievementRows] = await Promise.all([
    db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1),
    db
      .select({ achievementId: userAchievements.achievementId })
      .from(userAchievements)
      .where(eq(userAchievements.userId, userId)),
    uniqueSelectedAchievementIds.length > 0
      ? db
          .select({ id: achievements.id })
          .from(achievements)
          .where(inArray(achievements.id, uniqueSelectedAchievementIds))
      : Promise.resolve([]),
  ]);

  if (userRow.length === 0 || validAchievementRows.length !== uniqueSelectedAchievementIds.length) {
    return false;
  }

  const existingAchievementIds = new Set(existingRows.map((row) => row.achievementId));
  const selectedAchievementIdSet = new Set(uniqueSelectedAchievementIds);
  const achievementIdsToAdd = uniqueSelectedAchievementIds.filter(
    (achievementId) => !existingAchievementIds.has(achievementId),
  );
  const achievementIdsToRemove = existingRows
    .map((row) => row.achievementId)
    .filter((achievementId) => !selectedAchievementIdSet.has(achievementId));

  await db.transaction(async (tx) => {
    if (achievementIdsToRemove.length > 0) {
      await tx
        .delete(userAchievements)
        .where(
          and(
            eq(userAchievements.userId, userId),
            inArray(userAchievements.achievementId, achievementIdsToRemove),
          ),
        );
    }

    if (achievementIdsToAdd.length > 0) {
      await tx.insert(userAchievements).values(
        achievementIdsToAdd.map((achievementId) => ({
          userId,
          achievementId,
        })),
      );
    }
  });

  revalidatePath(`/${lang}/admin/award-achievements`);

  return true;
};
