"use server";

import { and, asc, eq, gt, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { updateSession } from "@/auth";
import { teams, userPowerups, users } from "@/db/schema";
import { hasLocale } from "@/i18n/config";
import { getCurrentUserRecord } from "@/lib/auth/user";
import { db } from "@/lib/db";
import { loadCurrentFeatureConfig } from "@/lib/feature-config-server";
import {
  getEnabledPowerupIds,
  getFeatureSettingValue,
  isFeatureEnabled,
} from "@/lib/feature-flags";

export type ProfileEditTeam = {
  id: string;
  name: string;
};

export type SaveProfileActionState = {
  status: "idle" | "success" | "error";
};

export type OpenLootboxActionResult =
  | {
      status: "success";
      awardedPowerupId: string;
    }
  | {
      status: "error";
    };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const awardablePowerupColumns = {
  "streak-freeze": {
    fieldName: "streakFreezes",
    column: userPowerups.streakFreezes,
  },
  "small-point-multiplicator": {
    fieldName: "smallPointMultiplicators",
    column: userPowerups.smallPointMultiplicators,
  },
  "medium-point-multiplicator": {
    fieldName: "mediumPointMultiplicators",
    column: userPowerups.mediumPointMultiplicators,
  },
  "large-point-multiplicator": {
    fieldName: "largePointMultiplicators",
    column: userPowerups.largePointMultiplicators,
  },
  "role-shield": {
    fieldName: "roleShields",
    column: userPowerups.roleShields,
  },
  "role-present": {
    fieldName: "rolePresents",
    column: userPowerups.rolePresents,
  },
} as const;

type AwardablePowerupId = keyof typeof awardablePowerupColumns;

const getStringEntry = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value : null;
};

export const getProfileEditTeams = async (): Promise<ProfileEditTeam[]> =>
  db
    .select({
      id: teams.id,
      name: teams.name,
    })
    .from(teams)
    .orderBy(asc(teams.name), asc(teams.id));

export const saveProfile = async (
  previousState: SaveProfileActionState,
  formData: FormData,
): Promise<SaveProfileActionState> => {
  void previousState;

  const currentUser = await getCurrentUserRecord();
  const lang = getStringEntry(formData, "lang");
  const targetUserId = getStringEntry(formData, "userId");
  const username = getStringEntry(formData, "username");
  const profilePicture = getStringEntry(formData, "profilePicture");
  const description = getStringEntry(formData, "description");
  const teamId = getStringEntry(formData, "teamId");

  if (
    !currentUser ||
    !lang ||
    !hasLocale(lang) ||
    !targetUserId ||
    !uuidPattern.test(targetUserId) ||
    currentUser.id !== targetUserId ||
    username === null ||
    profilePicture === null ||
    description === null ||
    teamId === null ||
    !uuidPattern.test(teamId)
  ) {
    return { status: "error" };
  }

  const normalizedUsername = username.trim();
  const normalizedDescription = description.trim();
  const normalizedProfilePicture = profilePicture.trim();

  if (
    normalizedUsername === "" ||
    normalizedUsername.length > 255 ||
    normalizedDescription.length > 1023 ||
    normalizedProfilePicture.length > 65535
  ) {
    return { status: "error" };
  }

  const teamRows = await db.select({ id: teams.id }).from(teams).where(eq(teams.id, teamId)).limit(1);

  if (!teamRows[0]) {
    return { status: "error" };
  }

  await db
    .update(users)
    .set({
      username: normalizedUsername,
      profilePicture: normalizedProfilePicture === "" ? null : normalizedProfilePicture,
      description: normalizedDescription === "" ? null : normalizedDescription,
      teamId,
    })
    .where(and(eq(users.id, currentUser.id), eq(users.id, targetUserId)));

  await updateSession({ user: { name: normalizedUsername } });

  revalidatePath(`/${lang}/user/${targetUserId}`);
  revalidatePath(`/${lang}/leaderboard`);
  revalidatePath(`/${lang}/leaderboard/individual`);
  revalidatePath(`/${lang}/leaderboard/team`);

  return { status: "success" };
};

const isAwardablePowerupId = (powerupId: string): powerupId is AwardablePowerupId =>
  powerupId in awardablePowerupColumns;

const getFrequency = (value: unknown) => {
  const frequency = Number(value);

  return Number.isFinite(frequency) && frequency > 0 ? frequency : 0;
};

const selectRandomPowerup = async (): Promise<AwardablePowerupId | null> => {
  const featureConfig = await loadCurrentFeatureConfig();

  if (!isFeatureEnabled(featureConfig.state, "powerups")) {
    return null;
  }

  const weightedPowerups = getEnabledPowerupIds(featureConfig.state)
    .filter(isAwardablePowerupId)
    .map((powerupId) => ({
      id: powerupId,
      frequency: getFrequency(
        getFeatureSettingValue(featureConfig.state, "powerups", `${powerupId}-frequency`),
      ),
    }))
    .filter((powerup) => powerup.frequency > 0);
  const totalFrequency = weightedPowerups.reduce(
    (sum, powerup) => sum + powerup.frequency,
    0,
  );

  if (totalFrequency <= 0) {
    return null;
  }

  let selectedPoint = Math.random() * totalFrequency;

  for (const powerup of weightedPowerups) {
    selectedPoint -= powerup.frequency;

    if (selectedPoint < 0) {
      return powerup.id;
    }
  }

  return weightedPowerups.at(-1)?.id ?? null;
};

export const openLootbox = async (
  lang: string,
  targetUserId: string,
): Promise<OpenLootboxActionResult> => {
  const currentUser = await getCurrentUserRecord();

  if (
    !currentUser ||
    !hasLocale(lang) ||
    !uuidPattern.test(targetUserId) ||
    currentUser.id !== targetUserId
  ) {
    return { status: "error" };
  }

  const awardedPowerupId = await selectRandomPowerup();

  if (!awardedPowerupId) {
    return { status: "error" };
  }

  const awardedPowerup = awardablePowerupColumns[awardedPowerupId];
  const updatedRows = await db.transaction(async (tx) => {
    const decrementedRows = await tx
      .update(userPowerups)
      .set({
        lootboxes: sql`${userPowerups.lootboxes} - 1`,
      })
      .where(and(eq(userPowerups.userId, currentUser.id), gt(userPowerups.lootboxes, 0)))
      .returning({ userId: userPowerups.userId });

    if (!decrementedRows[0]) {
      return 0;
    }

    const incrementedRows = await tx
      .update(userPowerups)
      .set({
        [awardedPowerup.fieldName]: sql`${awardedPowerup.column} + 1`,
      })
      .where(eq(userPowerups.userId, currentUser.id))
      .returning({ userId: userPowerups.userId });

    return incrementedRows.length;
  });

  if (updatedRows === 0) {
    return { status: "error" };
  }

  revalidatePath(`/${lang}/user/${targetUserId}`);
  revalidatePath(`/${lang}/leaderboard/individual`);
  revalidatePath(`/${lang}/leaderboard/team`);

  return {
    status: "success",
    awardedPowerupId,
  };
};
