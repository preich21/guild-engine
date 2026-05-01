import "server-only";

import { asc, eq, inArray } from "drizzle-orm";

import {
  getLeaderboard,
  getIndividualLeaderboardPlacement,
  type LeaderboardEntry,
} from "@/app/[lang]/leaderboard/actions";
import { achievements, userPowerups } from "@/db/schema";
import {
  getUserGuildMeetingAttendanceStreak,
  type UserAttendanceStreak,
} from "@/lib/auth/user";
import { db } from "@/lib/db";
import { rankLeaderboardEntries } from "@/lib/leaderboard-ranking";
import { getUserLevelProgress, type UserLevelProgress } from "@/lib/level-system";

export type UserProfileAchievementCatalogEntry = {
  id: string;
  title: string;
  description: string | null;
  image: string;
};

export type UserProfilePowerups = {
  lootboxes: number;
  smallPointMultiplicators: number;
  mediumPointMultiplicators: number;
  largePointMultiplicators: number;
  streakFreezes: number;
  rolePresents: number;
  roleShields: number;
};

export type UserProfileData = {
  userId: string;
  username: string;
  profilePicture: string | null;
  description: string | null;
  teamId: string;
  totalPoints: number;
  rank: number;
  attendanceStreak: UserAttendanceStreak;
  levelProgress: UserLevelProgress | null;
  achievements: LeaderboardEntry["achievements"];
  allAchievements: UserProfileAchievementCatalogEntry[];
  powerups: UserProfilePowerups;
};

type RankedLeaderboardEntry = LeaderboardEntry & {
  rank: number;
};

const EMPTY_USER_POWERUPS: UserProfilePowerups = {
  lootboxes: 0,
  smallPointMultiplicators: 0,
  mediumPointMultiplicators: 0,
  largePointMultiplicators: 0,
  streakFreezes: 0,
  rolePresents: 0,
  roleShields: 0,
};

const toUserProfilePowerups = (
  row: typeof userPowerups.$inferSelect | undefined,
): UserProfilePowerups => ({
  ...EMPTY_USER_POWERUPS,
  ...(row
    ? {
        lootboxes: row.lootboxes,
        smallPointMultiplicators: row.smallPointMultiplicators,
        mediumPointMultiplicators: row.mediumPointMultiplicators,
        largePointMultiplicators: row.largePointMultiplicators,
        streakFreezes: row.streakFreezes,
        rolePresents: row.rolePresents,
        roleShields: row.roleShields,
      }
    : {}),
});

export const getUserProfileAchievementCatalog = async (): Promise<
  UserProfileAchievementCatalogEntry[]
> =>
  db
    .select({
      id: achievements.id,
      title: achievements.title,
      description: achievements.description,
      image: achievements.image,
    })
    .from(achievements)
    .orderBy(asc(achievements.title), asc(achievements.id));

export const getUserPowerups = async (userId: string): Promise<UserProfilePowerups> => {
  const [row] = await db
    .select()
    .from(userPowerups)
    .where(eq(userPowerups.userId, userId))
    .limit(1);

  return toUserProfilePowerups(row);
};

export const getUserPowerupsMap = async (
  userIds: string[],
): Promise<Record<string, UserProfilePowerups>> => {
  const uniqueUserIds = Array.from(new Set(userIds));

  if (uniqueUserIds.length === 0) {
    return {};
  }

  const rows = await db
    .select()
    .from(userPowerups)
    .where(inArray(userPowerups.userId, uniqueUserIds));
  const rowsByUserId = new Map(rows.map((row) => [row.userId, row]));

  return Object.fromEntries(
    uniqueUserIds.map((userId) => [userId, toUserProfilePowerups(rowsByUserId.get(userId))]),
  );
};

export const toUserProfileData = (
  entry: RankedLeaderboardEntry,
  allAchievements: UserProfileAchievementCatalogEntry[],
  attendanceStreak: UserAttendanceStreak = entry.attendanceStreak,
  levelProgress: UserLevelProgress | null = null,
  powerups: UserProfilePowerups = EMPTY_USER_POWERUPS,
): UserProfileData => ({
  userId: entry.userId,
  username: entry.username,
  profilePicture: entry.profilePicture,
  description: entry.description,
  teamId: entry.teamId,
  totalPoints: entry.totalPoints,
  rank: entry.rank,
  attendanceStreak,
  levelProgress,
  achievements: entry.achievements,
  allAchievements,
  powerups,
});

export const createUserProfileDataMap = (
  entries: LeaderboardEntry[],
  allAchievements: UserProfileAchievementCatalogEntry[],
  levelProgressByUserId: Record<string, UserLevelProgress> = {},
  powerupsByUserId: Record<string, UserProfilePowerups> = {},
) =>
  Object.fromEntries(
    rankLeaderboardEntries(entries).map((entry) => [
      entry.userId,
      toUserProfileData(
        entry,
        allAchievements,
        entry.attendanceStreak,
        levelProgressByUserId[entry.userId] ?? null,
        powerupsByUserId[entry.userId] ?? EMPTY_USER_POWERUPS,
      ),
    ]),
  ) satisfies Record<string, UserProfileData>;

export const getUserProfileData = async (
  userId: string,
  options: { includeLevelProgress?: boolean; includePowerups?: boolean } = {},
): Promise<UserProfileData | null> => {
  const [entries, allAchievements, attendanceStreak, placement, levelProgress, powerups] = await Promise.all([
    getLeaderboard(),
    getUserProfileAchievementCatalog(),
    getUserGuildMeetingAttendanceStreak(userId),
    getIndividualLeaderboardPlacement(userId),
    options.includeLevelProgress ? getUserLevelProgress(userId) : Promise.resolve(null),
    options.includePowerups ? getUserPowerups(userId) : Promise.resolve(EMPTY_USER_POWERUPS),
  ]);

  if (placement == null) {
    return null;
  }

  const entry = entries.find((candidate) => candidate.userId === userId);

  if (!entry) {
    return null;
  }

  return toUserProfileData(
    {
      ...entry,
      rank: placement,
    },
    allAchievements,
    attendanceStreak,
    levelProgress,
    powerups,
  );
};
