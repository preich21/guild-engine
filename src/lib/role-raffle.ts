import "server-only";

import { and, asc, desc, eq, lte } from "drizzle-orm";

import { guildMeetings, powerupUtilization, users } from "@/db/schema";
import { db } from "@/lib/db";

export type RoleRaffleUser = {
  id: string;
  username: string;
  isRoleShielded: boolean;
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
