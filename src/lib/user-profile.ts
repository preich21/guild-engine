import "server-only";

import { asc } from "drizzle-orm";

import {
  getLeaderboard,
  getIndividualLeaderboardPlacement,
  type LeaderboardEntry,
} from "@/app/[lang]/leaderboard/actions";
import { achievements } from "@/db/schema";
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
};

type RankedLeaderboardEntry = LeaderboardEntry & {
  rank: number;
};

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

export const toUserProfileData = (
  entry: RankedLeaderboardEntry,
  allAchievements: UserProfileAchievementCatalogEntry[],
  attendanceStreak: UserAttendanceStreak = entry.attendanceStreak,
  levelProgress: UserLevelProgress | null = null,
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
});

export const createUserProfileDataMap = (
  entries: LeaderboardEntry[],
  allAchievements: UserProfileAchievementCatalogEntry[],
  levelProgressByUserId: Record<string, UserLevelProgress> = {},
) =>
  Object.fromEntries(
    rankLeaderboardEntries(entries).map((entry) => [
      entry.userId,
      toUserProfileData(entry, allAchievements, entry.attendanceStreak, levelProgressByUserId[entry.userId] ?? null),
    ]),
  ) satisfies Record<string, UserProfileData>;

export const getUserProfileData = async (
  userId: string,
  options: { includeLevelProgress?: boolean } = {},
): Promise<UserProfileData | null> => {
  const [entries, allAchievements, attendanceStreak, placement, levelProgress] = await Promise.all([
    getLeaderboard(),
    getUserProfileAchievementCatalog(),
    getUserGuildMeetingAttendanceStreak(userId),
    getIndividualLeaderboardPlacement(userId),
    options.includeLevelProgress ? getUserLevelProgress(userId) : Promise.resolve(null),
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
  );
};
