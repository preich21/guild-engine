import "server-only";

import { and, asc, desc, eq, gt, inArray, lt, lte } from "drizzle-orm";

import {
  guildMeetings,
  powerupUtilization,
  users,
  type RolePresentPowerupSettings,
} from "@/db/schema";
import { db } from "@/lib/db";

export type RoleRaffleUser = {
  id: string;
  username: string;
  isRoleShielded: boolean;
};

export type RolePresentEntry = {
  id: string;
  receivingUserId: string;
  receivingUsername: string;
  giftingUsername: string | null;
  comment: string;
  anonymous: boolean;
  isCounteredByRoleShield: boolean;
};

export type RolePresentsMeeting = {
  id: string;
  timestamp: string;
  entries: RolePresentEntry[];
};

export type RoleRaffleRolePresents = {
  latestPastMeeting: RolePresentsMeeting | null;
  nextFutureMeeting: RolePresentsMeeting | null;
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

export const getRoleRaffleUsers = async (): Promise<RoleRaffleUser[]> => {
  const [latestPastMeeting] = await db
    .select({ id: guildMeetings.id })
    .from(guildMeetings)
    .where(lte(guildMeetings.timestamp, new Date()))
    .orderBy(desc(guildMeetings.timestamp), desc(guildMeetings.id))
    .limit(1);

  const roleShieldUtilizations = latestPastMeeting
    ? await db
        .select({ userId: powerupUtilization.userId })
        .from(powerupUtilization)
        .where(
          and(
            eq(powerupUtilization.meetingId, latestPastMeeting.id),
            eq(powerupUtilization.powerup, "role-shield"),
          ),
        )
    : [];

  const roleShieldedUserIds = new Set(roleShieldUtilizations.map((utilization) => utilization.userId));
  const raffleUsers = await db
    .select({
      id: users.id,
      username: users.username,
    })
    .from(users)
    .orderBy(asc(users.username), asc(users.id));

  return raffleUsers.map((user) => ({
    ...user,
    isRoleShielded: roleShieldedUserIds.has(user.id),
  }));
};

export const getRoleRaffleRolePresents = async (): Promise<RoleRaffleRolePresents> => {
  const now = new Date();
  const [[latestPastMeeting], [nextFutureMeeting]] = await Promise.all([
    db
      .select({
        id: guildMeetings.id,
        timestamp: guildMeetings.timestamp,
      })
      .from(guildMeetings)
      .where(lt(guildMeetings.timestamp, now))
      .orderBy(desc(guildMeetings.timestamp), desc(guildMeetings.id))
      .limit(1),
    db
      .select({
        id: guildMeetings.id,
        timestamp: guildMeetings.timestamp,
      })
      .from(guildMeetings)
      .where(gt(guildMeetings.timestamp, now))
      .orderBy(asc(guildMeetings.timestamp), asc(guildMeetings.id))
      .limit(1),
  ]);

  const meetings = [latestPastMeeting, nextFutureMeeting].filter((meeting) => meeting !== undefined);
  const meetingIds = meetings.map((meeting) => meeting.id);

  if (meetingIds.length === 0) {
    return {
      latestPastMeeting: null,
      nextFutureMeeting: null,
    };
  }

  const rolePresentUtilizationRows = (
    await db
      .select({
        id: powerupUtilization.id,
        meetingId: powerupUtilization.meetingId,
        userId: powerupUtilization.userId,
        settings: powerupUtilization.settings,
        usageTimestamp: powerupUtilization.usageTimestamp,
      })
      .from(powerupUtilization)
      .where(
        and(
          inArray(powerupUtilization.meetingId, meetingIds),
          eq(powerupUtilization.powerup, "role-present"),
        ),
      )
      .orderBy(asc(powerupUtilization.usageTimestamp), asc(powerupUtilization.id))
  ).filter((utilization) => isRolePresentSettings(utilization.settings));
  const roleShieldUtilizationRows = await db
    .select({
      meetingId: powerupUtilization.meetingId,
      userId: powerupUtilization.userId,
    })
    .from(powerupUtilization)
    .where(
      and(
        inArray(powerupUtilization.meetingId, meetingIds),
        eq(powerupUtilization.powerup, "role-shield"),
      ),
    );
  const roleShieldedUserIdsByMeetingId = new Map<string, Set<string>>();

  for (const utilization of roleShieldUtilizationRows) {
    const userIds = roleShieldedUserIdsByMeetingId.get(utilization.meetingId) ?? new Set<string>();

    userIds.add(utilization.userId);
    roleShieldedUserIdsByMeetingId.set(utilization.meetingId, userIds);
  }

  const userIds = Array.from(
    new Set(
      rolePresentUtilizationRows.flatMap((utilization) => {
        if (!isRolePresentSettings(utilization.settings)) {
          return [utilization.userId];
        }

        return [utilization.userId, utilization.settings.receivingUserId];
      }),
    ),
  );
  const userRows =
    userIds.length === 0
      ? []
      : await db
          .select({
            id: users.id,
            username: users.username,
          })
          .from(users)
          .where(inArray(users.id, userIds));
  const usernamesById = new Map(userRows.map((user) => [user.id, user.username]));
  const entriesByMeetingId = new Map<string, RolePresentEntry[]>();

  for (const utilization of rolePresentUtilizationRows) {
    if (!isRolePresentSettings(utilization.settings)) {
      continue;
    }

    const entries = entriesByMeetingId.get(utilization.meetingId) ?? [];

    entriesByMeetingId.set(utilization.meetingId, [
      ...entries,
      {
        id: utilization.id,
        receivingUserId: utilization.settings.receivingUserId,
        receivingUsername:
          usernamesById.get(utilization.settings.receivingUserId) ??
          utilization.settings.receivingUserId,
        giftingUsername: usernamesById.get(utilization.userId) ?? null,
        comment: utilization.settings.comment,
        anonymous: utilization.settings.anonymous,
        isCounteredByRoleShield:
          roleShieldedUserIdsByMeetingId
            .get(utilization.meetingId)
            ?.has(utilization.settings.receivingUserId) ?? false,
      },
    ]);
  }

  const toRolePresentsMeeting = (
    meeting: (typeof latestPastMeeting) | undefined,
  ): RolePresentsMeeting | null =>
    meeting
      ? {
          id: meeting.id,
          timestamp: meeting.timestamp.toISOString(),
          entries: entriesByMeetingId.get(meeting.id) ?? [],
        }
      : null;

  return {
    latestPastMeeting: toRolePresentsMeeting(latestPastMeeting),
    nextFutureMeeting: toRolePresentsMeeting(nextFutureMeeting),
  };
};
