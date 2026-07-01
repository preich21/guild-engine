"use server";

import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { rankLeaderboardEntries } from "@/lib/leaderboard-ranking";
import { teams, users } from "@/db/schema";
import { getLeaderboard } from "@/lib/leaderboard";
import { loadUserPointTotals, parsePointCalculationStartDate } from "@/lib/point-calculation";

export type { IndividualLeaderboardConfig, LeaderboardEntry } from "@/lib/leaderboard";

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

export type TeamLeaderboardConfig = {
  "start-date"?: unknown;
  "end-date"?: unknown;
  aggregation?: unknown;
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

export const getTeamLeaderboard = async (
  config: TeamLeaderboardConfig = {},
): Promise<TeamLeaderboardEntry[]> => {
  const startDate = parsePointCalculationStartDate(config["start-date"]);
  const endDate = parsePointCalculationStartDate(config["end-date"]);
  const aggregation = parseTeamLeaderboardAggregation(config.aggregation);
  const pointTotals = await loadUserPointTotals({ startDate, endDate });
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
