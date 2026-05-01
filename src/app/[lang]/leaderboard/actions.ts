"use server";

import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { rankLeaderboardEntries } from "@/lib/leaderboard-ranking";
import {
  achievements,
  guildMeetings,
  teams,
  userAchievements,
  userPointSubmissions,
  users,
} from "@/db/schema";
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
  attendanceStreakCount: number | string;
  attendanceStreakHasPendingRecentMeeting: boolean;
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
      coalesce(streak.count, 0)::integer as "attendanceStreakCount",
      coalesce(streak.has_pending_recent_meeting, false) as "attendanceStreakHasPendingRecentMeeting",
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
    left join lateral (
      with meeting_rows as (
        select
          gm2.id as meeting_id,
          gm2.timestamp as meeting_time,
          ups2.id as submission_id,
          coalesce(ups2.attendance in (1, 2), false) as attended
        from ${guildMeetings} gm2
        left join ${userPointSubmissions} ups2
          on ups2.guild_meeting_id = gm2.id
          and ups2.user_id = u.id
        where gm2.timestamp <= now()
      ),
      latest_meeting as (
        select
          mr.meeting_id,
          mr.meeting_time,
          mr.submission_id
        from meeting_rows mr
        order by mr.meeting_time desc, mr.meeting_id desc
        limit 1
      ),
      should_ignore_latest as (
        select coalesce(
          (
            select lm.submission_id is null
              and lm.meeting_time >= now() - interval '72 hours'
            from latest_meeting lm
          ),
          false
        ) as value
      ),
      considered_meetings as (
        select
          mr.meeting_id,
          mr.meeting_time,
          mr.attended
        from meeting_rows mr
        cross join should_ignore_latest sil
        where not sil.value
          or mr.meeting_id <> (
            select lm.meeting_id
            from latest_meeting lm
          )
      ),
      ordered_meetings as (
        select
          cm.attended,
          sum(case when cm.attended then 0 else 1 end)
            over (order by cm.meeting_time desc, cm.meeting_id desc) as missed_count
        from considered_meetings cm
      )
      select
        coalesce(
          (
            select count(*)
            from ordered_meetings om
            where om.missed_count = 0 and om.attended
          ),
          0
        )::integer as count,
        (select sil.value from should_ignore_latest sil) as has_pending_recent_meeting
    ) streak on true
    order by u.username
  `);

  const rows = result.rows as RawLeaderboardEntry[];

  return rows.map((row) => ({
    userId: String(row.userId),
    username: String(row.username),
    profilePicture: row.profilePicture,
    description: row.description,
    teamId: String(row.teamId),
    totalPoints: totalPointsByUserId.get(String(row.userId)) ?? 0,
    attendanceStreak: {
      count: Number(row.attendanceStreakCount),
      hasPendingRecentMeeting: Boolean(row.attendanceStreakHasPendingRecentMeeting),
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
