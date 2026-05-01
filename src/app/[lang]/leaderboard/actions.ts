"use server";

import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { rankLeaderboardEntries } from "@/lib/leaderboard-ranking";
import {
  achievements,
  teams,
  userAchievements,
  users,
} from "@/db/schema";
import { getUsersGuildMeetingAttendanceStreaks } from "@/lib/attendance-streaks";
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

export type TeamMemberEntry = {
  userId: string;
  username: string;
  profilePicture: string | null;
  totalPoints: number;
};

export type TeamLeaderboardEntry = {
  teamId: string;
  teamName: string;
  totalPoints: number;
  members: TeamMemberEntry[];
};

export type IndividualLeaderboardConfig = {
  startDate?: unknown;
  showDashboard?: unknown;
};

export type TeamLeaderboardConfig = {
  "start-date"?: unknown;
  aggregation?: unknown;
};

type RawLeaderboardEntry = {
  userId: string;
  username: string;
  profilePicture: string | null;
  description: string | null;
  teamId: string;
  achievements: string;
};

type RawTeamMemberEntry = {
  userId: string | null;
  username: string | null;
  profilePicture: string | null;
  teamId: string;
  teamName: string;
};

const parseTeamLeaderboardAggregation = (
  value: unknown,
): "average" | "sum" => (value === "sum" ? "sum" : "average");

export const getLeaderboard = async (
  config: IndividualLeaderboardConfig = {},
): Promise<LeaderboardEntry[]> => {
  const startDate = parsePointCalculationStartDate(config.startDate);
  const pointTotals = await loadUserPointTotals({ startDate });
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
  const attendanceStreaksByUserId = await getUsersGuildMeetingAttendanceStreaks(
    rows.map((row) => String(row.userId)),
  );

  return rows.map((row) => ({
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
  })).sort((firstEntry, secondEntry) =>
    secondEntry.totalPoints - firstEntry.totalPoints ||
    firstEntry.username.localeCompare(secondEntry.username),
  );
};

export const getTeamLeaderboard = async (
  config: TeamLeaderboardConfig = {},
): Promise<TeamLeaderboardEntry[]> => {
  const startDate = parsePointCalculationStartDate(config["start-date"]);
  const aggregation = parseTeamLeaderboardAggregation(config.aggregation);
  const pointTotals = await loadUserPointTotals({ startDate });
  const totalPointsByUserId = new Map(
    pointTotals.map((entry) => [entry.userId, entry.totalPoints]),
  );

  const result = await db.execute(sql<RawTeamMemberEntry>`
    select
      t.id as "teamId",
      t.name as "teamName",
      u.id as "userId",
      u.username,
      u.profile_picture as "profilePicture"
    from ${teams} t
    left join ${users} u on u.team_id = t.id
    order by t.name, u.username
  `);

  const entriesByTeamId = new Map<string, TeamLeaderboardEntry>();

  for (const row of result.rows as RawTeamMemberEntry[]) {
    const teamId = String(row.teamId);
    const entry = entriesByTeamId.get(teamId) ?? {
      teamId,
      teamName: String(row.teamName),
      totalPoints: 0,
      members: [],
    };

    if (row.userId !== null && row.username !== null) {
      const userId = String(row.userId);

      entry.members.push({
        userId,
        username: String(row.username),
        profilePicture: row.profilePicture,
        totalPoints: totalPointsByUserId.get(userId) ?? 0,
      });
    }

    entriesByTeamId.set(teamId, entry);
  }

  return Array.from(entriesByTeamId.values())
    .map((entry) => {
      const summedPoints = entry.members.reduce((total, member) => total + member.totalPoints, 0);

      return {
        ...entry,
        totalPoints:
          aggregation === "sum" || entry.members.length === 0
            ? summedPoints
            : Math.ceil(summedPoints / entry.members.length),
        members: entry.members.sort((firstMember, secondMember) =>
          secondMember.totalPoints - firstMember.totalPoints ||
          firstMember.username.localeCompare(secondMember.username),
        ),
      };
    })
    .sort((firstEntry, secondEntry) =>
      secondEntry.totalPoints - firstEntry.totalPoints ||
      firstEntry.teamName.localeCompare(secondEntry.teamName),
    );
};

export const getIndividualLeaderboardPlacement = async (userId: string): Promise<number | null> => {
  const rankedEntries = rankLeaderboardEntries(await getLeaderboard());
  return rankedEntries.find((entry) => entry.userId === userId)?.rank ?? null;
};
