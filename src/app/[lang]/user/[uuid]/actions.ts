"use server";

import { and, asc, eq, gt, inArray, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { updateSession } from "@/auth";
import {
  guildMeetings,
  powerupUtilization,
  teams,
  userPowerups,
  users,
  type RolePresentPowerupSettings,
} from "@/db/schema";
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

export type FutureGuildMeeting = {
  id: string;
  timestamp: string;
  activatedPointMultiplicator: PointMultiplicatorPowerupId | null;
  hasActivatedRoleShield: boolean;
  rolePresentUtilizations: RolePresentUtilization[];
};

export type RolePresentUtilization = {
  id: string;
  giftingUserId: string;
  giftingUsername: string | null;
  receivingUserId: string;
  receivingUsername: string | null;
  comment: string;
  anonymous: boolean;
};

export type RolePresentReceiver = {
  id: string;
  username: string;
};

export type UsePowerupActionResult = {
  status: "success" | "error";
};

export type UsePowerupSettings = {
  receivingUserId?: string;
  comment?: string;
  anonymous?: boolean;
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

const usablePowerupColumns = {
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

type UsablePowerupId = keyof typeof usablePowerupColumns;

const pointMultiplicatorPowerupIds = [
  "small-point-multiplicator",
  "medium-point-multiplicator",
  "large-point-multiplicator",
] as const;

type PointMultiplicatorPowerupId = (typeof pointMultiplicatorPowerupIds)[number];

const isPointMultiplicatorPowerupId = (
  powerupId: string,
): powerupId is PointMultiplicatorPowerupId =>
  pointMultiplicatorPowerupIds.some((pointMultiplicatorId) => pointMultiplicatorId === powerupId);

const getStringEntry = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value : null;
};

const isRolePresentSettings = (settings: unknown): settings is RolePresentPowerupSettings => {
  if (!settings || typeof settings !== "object") {
    return false;
  }

  const candidate = settings as Partial<RolePresentPowerupSettings>;

  return (
    typeof candidate.receivingUserId === "string" &&
    typeof candidate.comment === "string" &&
    typeof candidate.anonymous === "boolean"
  );
};

export const getProfileEditTeams = async (): Promise<ProfileEditTeam[]> =>
  db
    .select({
      id: teams.id,
      name: teams.name,
    })
    .from(teams)
    .orderBy(asc(teams.name), asc(teams.id));

export const getRolePresentReceivers = async (): Promise<RolePresentReceiver[]> => {
  const currentUser = await getCurrentUserRecord();

  if (!currentUser) {
    return [];
  }

  return db
    .select({
      id: users.id,
      username: users.username,
    })
    .from(users)
    .where(ne(users.id, currentUser.id))
    .orderBy(asc(users.username), asc(users.id));
};

export const getFutureGuildMeetings = async (): Promise<FutureGuildMeeting[]> => {
  const currentUser = await getCurrentUserRecord();

  if (!currentUser) {
    return [];
  }

  const meetingRows = await db
    .select({
      id: guildMeetings.id,
      timestamp: guildMeetings.timestamp,
    })
    .from(guildMeetings)
    .where(gt(guildMeetings.timestamp, new Date()))
    .orderBy(asc(guildMeetings.timestamp), asc(guildMeetings.id));

  const utilizationRows = await db
    .select({
      id: powerupUtilization.id,
      meetingId: powerupUtilization.meetingId,
      userId: powerupUtilization.userId,
      powerup: powerupUtilization.powerup,
      settings: powerupUtilization.settings,
    })
    .from(powerupUtilization)
    .innerJoin(guildMeetings, eq(guildMeetings.id, powerupUtilization.meetingId))
    .where(
      and(
        eq(powerupUtilization.userId, currentUser.id),
        gt(guildMeetings.timestamp, new Date()),
        inArray(powerupUtilization.powerup, [...pointMultiplicatorPowerupIds, "role-shield"]),
      ),
    );

  const rolePresentUtilizationRows = (
    await db
      .select({
        id: powerupUtilization.id,
        meetingId: powerupUtilization.meetingId,
        userId: powerupUtilization.userId,
        settings: powerupUtilization.settings,
      })
      .from(powerupUtilization)
      .innerJoin(guildMeetings, eq(guildMeetings.id, powerupUtilization.meetingId))
      .where(
        and(
          eq(powerupUtilization.powerup, "role-present"),
          gt(guildMeetings.timestamp, new Date()),
        ),
      )
  ).filter((utilization) => isRolePresentSettings(utilization.settings));
  const rolePresentUserIds = Array.from(
    new Set(
      rolePresentUtilizationRows.flatMap((utilization) => [
        utilization.userId,
        isRolePresentSettings(utilization.settings) ? utilization.settings.receivingUserId : "",
      ]),
    ),
  ).filter(Boolean);
  const rolePresentUserRows =
    rolePresentUserIds.length === 0
      ? []
      : await db
          .select({
            id: users.id,
            username: users.username,
          })
          .from(users)
          .where(inArray(users.id, rolePresentUserIds));
  const rolePresentUsersById = new Map(rolePresentUserRows.map((user) => [user.id, user.username]));

  const utilizationsByMeetingId = new Map<
    string,
    {
      activatedPointMultiplicator: PointMultiplicatorPowerupId | null;
      hasActivatedRoleShield: boolean;
      rolePresentUtilizations: RolePresentUtilization[];
    }
  >();

  for (const utilization of utilizationRows) {
    const existing = utilizationsByMeetingId.get(utilization.meetingId) ?? {
      activatedPointMultiplicator: null,
      hasActivatedRoleShield: false,
      rolePresentUtilizations: [],
    };

    utilizationsByMeetingId.set(utilization.meetingId, {
      activatedPointMultiplicator: isPointMultiplicatorPowerupId(utilization.powerup)
        ? utilization.powerup
        : existing.activatedPointMultiplicator,
      hasActivatedRoleShield: existing.hasActivatedRoleShield || utilization.powerup === "role-shield",
      rolePresentUtilizations: existing.rolePresentUtilizations,
    });
  }

  for (const utilization of rolePresentUtilizationRows) {
    if (!isRolePresentSettings(utilization.settings)) {
      continue;
    }

    const existing = utilizationsByMeetingId.get(utilization.meetingId) ?? {
      activatedPointMultiplicator: null,
      hasActivatedRoleShield: false,
      rolePresentUtilizations: [],
    };

    utilizationsByMeetingId.set(utilization.meetingId, {
      ...existing,
      rolePresentUtilizations: [
        ...existing.rolePresentUtilizations,
        {
          id: utilization.id,
          giftingUserId: utilization.userId,
          giftingUsername: rolePresentUsersById.get(utilization.userId) ?? null,
          receivingUserId: utilization.settings.receivingUserId,
          receivingUsername:
            rolePresentUsersById.get(utilization.settings.receivingUserId) ?? null,
          comment: utilization.settings.comment,
          anonymous: utilization.settings.anonymous,
        },
      ],
    });
  }

  return meetingRows.map((meeting) => ({
    id: meeting.id,
    timestamp: meeting.timestamp.toISOString(),
    activatedPointMultiplicator:
      utilizationsByMeetingId.get(meeting.id)?.activatedPointMultiplicator ?? null,
    hasActivatedRoleShield: utilizationsByMeetingId.get(meeting.id)?.hasActivatedRoleShield ?? false,
    rolePresentUtilizations:
      utilizationsByMeetingId.get(meeting.id)?.rolePresentUtilizations ?? [],
  }));
};

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

const isUsablePowerupId = (powerupId: string): powerupId is UsablePowerupId =>
  powerupId in usablePowerupColumns;

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

export const usePowerup = async (
  lang: string,
  meetingId: string,
  powerupId: string,
  settings: UsePowerupSettings = {},
): Promise<UsePowerupActionResult> => {
  const currentUser = await getCurrentUserRecord();

  if (
    !currentUser ||
    !hasLocale(lang) ||
    !uuidPattern.test(meetingId) ||
    !isUsablePowerupId(powerupId)
  ) {
    return { status: "error" };
  }

  const featureConfig = await loadCurrentFeatureConfig();

  if (
    !isFeatureEnabled(featureConfig.state, "powerups") ||
    !getEnabledPowerupIds(featureConfig.state).includes(powerupId)
  ) {
    return { status: "error" };
  }

  const powerup = usablePowerupColumns[powerupId];
  const normalizedComment =
    typeof settings.comment === "string" ? settings.comment.trim().slice(0, 1023) : "";
  const rolePresentSettings =
    powerupId === "role-present" &&
    typeof settings.receivingUserId === "string" &&
    uuidPattern.test(settings.receivingUserId) &&
    settings.receivingUserId !== currentUser.id
      ? {
          receivingUserId: settings.receivingUserId,
          comment: normalizedComment,
          anonymous: settings.anonymous === true,
        }
      : null;

  if (powerupId === "role-present" && !rolePresentSettings) {
    return { status: "error" };
  }

  const updatedRows = await db.transaction(async (tx) => {
    if (powerupId !== "role-present") {
      const duplicateLockKey = isPointMultiplicatorPowerupId(powerupId)
        ? `powerup_utilization:${currentUser.id}:${meetingId}:point-multiplicator`
        : `powerup_utilization:${currentUser.id}:${meetingId}:role-shield`;

      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${duplicateLockKey}))`);
    }

    const meetingRows = await tx
      .select({ id: guildMeetings.id })
      .from(guildMeetings)
      .where(and(eq(guildMeetings.id, meetingId), gt(guildMeetings.timestamp, new Date())))
      .limit(1);

    if (!meetingRows[0]) {
      return 0;
    }

    if (powerupId !== "role-present") {
      const conflictingUtilizationRows = await tx
        .select({ id: powerupUtilization.id })
        .from(powerupUtilization)
        .where(
          and(
            eq(powerupUtilization.userId, currentUser.id),
            eq(powerupUtilization.meetingId, meetingId),
            isPointMultiplicatorPowerupId(powerupId)
              ? inArray(powerupUtilization.powerup, pointMultiplicatorPowerupIds)
              : eq(powerupUtilization.powerup, "role-shield"),
          ),
        )
        .limit(1);

      if (conflictingUtilizationRows[0]) {
        return 0;
      }
    } else {
      if (!rolePresentSettings) {
        return 0;
      }

      const receivingUserRows = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, rolePresentSettings.receivingUserId))
        .limit(1);

      if (!receivingUserRows[0]) {
        return 0;
      }
    }

    const decrementedRows = await tx
      .update(userPowerups)
      .set({
        [powerup.fieldName]: sql`${powerup.column} - 1`,
      })
      .where(and(eq(userPowerups.userId, currentUser.id), gt(powerup.column, 0)))
      .returning({ userId: userPowerups.userId });

    if (!decrementedRows[0]) {
      return 0;
    }

    const insertedRows = await tx
      .insert(powerupUtilization)
      .values({
        meetingId,
        userId: currentUser.id,
        powerup: powerupId,
        settings: rolePresentSettings,
      })
      .returning({ id: powerupUtilization.id });

    return insertedRows.length;
  });

  if (updatedRows === 0) {
    return { status: "error" };
  }

  revalidatePath(`/${lang}/user/${currentUser.id}`);
  revalidatePath(`/${lang}/leaderboard/individual`);
  revalidatePath(`/${lang}/leaderboard/team`);

  return { status: "success" };
};
