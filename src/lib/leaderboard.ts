import "server-only";

import { cache } from "react";
import { sql } from "drizzle-orm";

import { achievements, userAchievements, users } from "@/db/schema";
import { db } from "@/lib/db";
import { getUsersGuildMeetingStreaks } from "@/lib/streaks";
import {
  loadUserPointTotals,
  parsePointCalculationStartDate,
} from "@/lib/point-calculation";

export type LeaderboardEntry = {
  userId: string;
  username: string;
  profilePicture: string | null;
  description: string | null;
  teamId: string;
  totalPoints: number;
  attendanceStreak: {
    count: number;
    hasPendingRecentMeeting: boolean;
    latestMeetingWasStreakFreeze: boolean;
  };
  achievements: Array<{
    id: string;
    title: string;
    image: string;
  }>;
};

export type IndividualLeaderboardConfig = {
  startDate?: unknown;
  endDate?: unknown;
  showDashboard?: unknown;
};

type RawLeaderboardEntry = {
  userId: string;
  username: string;
  profilePicture: string | null;
  description: string | null;
  teamId: string;
  achievements: string;
};

// Wrapped in React `cache()` so repeated calls within a single request (e.g. a page's
// generateMetadata and its body, or several server components) share one computation
// instead of re-running the point/streak pipeline. Matches the pattern used by
// `getCurrentFeatureConfig` and the level-system helpers.
export const getLeaderboard = cache(
  async (config: IndividualLeaderboardConfig = {}): Promise<LeaderboardEntry[]> => {
    const startDate = parsePointCalculationStartDate(config.startDate);
    const endDate = parsePointCalculationStartDate(config.endDate);
    const pointTotals = await loadUserPointTotals({ startDate, endDate });
    const totalPointsByUserId = new Map(
      pointTotals.map((entry) => [entry.userId, entry.totalPoints]),
    );

    const result = await db.execute(sql<RawLeaderboardEntry>`
      select
        u.id as "userId",
        u.username,
        u.profile_picture as "profilePicture",
        u.description,
        u.team_id as "teamId",
        coalesce(
          (
            select json_agg(
              json_build_object(
                'id', a.id,
                'title', a.title,
                'image', a.image
              )
              order by a.title, a.id
            )
            from ${userAchievements} ua
            inner join ${achievements} a on a.id = ua.achievement_id
            where ua.user_id = u.id
          ),
          '[]'::json
        )::text as achievements
      from ${users} u
      order by u.username
    `);

    const rows = result.rows as RawLeaderboardEntry[];
    const attendanceStreaksByUserId = await getUsersGuildMeetingStreaks(
      rows.map((row) => String(row.userId)),
    );

    return rows
      .map((row) => ({
        userId: String(row.userId),
        username: String(row.username),
        profilePicture: row.profilePicture,
        description: row.description,
        teamId: String(row.teamId),
        totalPoints: totalPointsByUserId.get(String(row.userId)) ?? 0,
        attendanceStreak: attendanceStreaksByUserId[String(row.userId)] ?? {
          count: 0,
          hasPendingRecentMeeting: false,
          latestMeetingWasStreakFreeze: false,
        },
        achievements: (
          JSON.parse(row.achievements) as Array<{
            id: string;
            title: string;
            image: string;
          }>
        ).map((achievement) => ({
          id: String(achievement.id),
          title: String(achievement.title),
          image: String(achievement.image),
        })),
      }))
      .sort(
        (firstEntry, secondEntry) =>
          secondEntry.totalPoints - firstEntry.totalPoints ||
          firstEntry.username.localeCompare(secondEntry.username),
      );
  },
);
