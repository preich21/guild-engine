"use server";

import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { rankLeaderboardEntries } from "@/lib/leaderboard-ranking";
import {
  achievements,
  guildMeetings,
  manualPoints,
  pointDistribution,
  teams,
  userAchievements,
  userPointSubmissions,
  users,
} from "@/db/schema";

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

type RawLeaderboardEntry = {
  userId: string;
  username: string;
  profilePicture: string | null;
  description: string | null;
  teamId: string;
  totalPoints: number | string;
  attendanceStreakCount: number | string;
  attendanceStreakHasPendingRecentMeeting: boolean;
  achievements: string;
};

type RawTeamLeaderboardEntry = {
  teamId: string;
  teamName: string;
  totalPoints: number | string;
  members: string;
};

const parseLeaderboardStartDate = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)) {
    return null;
  }

  const [year, month, day] = trimmedValue.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return trimmedValue;
};

export const getLeaderboard = async (
  config: IndividualLeaderboardConfig = {},
): Promise<LeaderboardEntry[]> => {
  const startDate = parseLeaderboardStartDate(config.startDate);
  const pointStartDateCondition =
    startDate === null ? sql`` : sql`and gm.timestamp::date >= ${startDate}::date`;
  const manualPointStartDateCondition =
    startDate === null ? sql`` : sql`and mp.timestamp::date >= ${startDate}::date`;

  const result = await db.execute(sql<RawLeaderboardEntry>`
    select
      u.id as "userId",
      u.username,
      u.profile_picture as "profilePicture",
      u.description,
      u.team_id as "teamId",
      (
        coalesce(
          sum(
            case ups.attendance
              when 1 then coalesce(pd.attendance_virtual, 0)
              when 2 then coalesce(pd.attendance_on_site, 0)
              else 0
            end
            + case ups.protocol
                when 1 then coalesce(pd.protocol_forced, 0)
                when 2 then coalesce(pd.protocol_voluntarily, 0)
                else 0
              end
            + case
                when ups.moderation then coalesce(pd.moderation, 0)
                else 0
              end
            + case
                when ups.working_group then coalesce(pd.working_group, 0)
                else 0
              end
            + (coalesce(ups.twl, 0) * coalesce(pd.twl, 0))
            + (coalesce(ups.presentations, 0) * coalesce(pd.presentation, 0))
          ),
          0
        )
        + coalesce(max(mp.total_points), 0)
      )::integer as "totalPoints",
      coalesce(max(streak.count), 0)::integer as "attendanceStreakCount",
      coalesce(bool_or(streak.has_pending_recent_meeting), false) as "attendanceStreakHasPendingRecentMeeting",
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
    left join ${userPointSubmissions} ups on ups.user_id = u.id
    left join ${guildMeetings} gm
      on gm.id = ups.guild_meeting_id
      and gm.timestamp <= now()
      ${pointStartDateCondition}
    left join lateral (
      select
        attendance_virtual,
        attendance_on_site,
        protocol_forced,
        protocol_voluntarily,
        moderation,
        working_group,
        twl,
        presentation
      from ${pointDistribution} pd
      where pd.active_from <= gm.timestamp
      order by pd.active_from desc
      limit 1
    ) pd on true
    left join lateral (
      select
        coalesce(sum(mp.points), 0)::integer as total_points
      from ${manualPoints} mp
      where mp.user_id = u.id
        ${manualPointStartDateCondition}
    ) mp on true
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
    group by u.id, u.username, u.profile_picture, u.description, u.team_id
    order by "totalPoints" desc, u.username
  `);

  const rows = result.rows as RawLeaderboardEntry[];

  return rows.map((row) => ({
    userId: String(row.userId),
    username: String(row.username),
    profilePicture: row.profilePicture,
    description: row.description,
    teamId: String(row.teamId),
    totalPoints: Number(row.totalPoints),
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
  }));
};

export const getTeamLeaderboard = async (): Promise<TeamLeaderboardEntry[]> => {
  const result = await db.execute(sql<RawTeamLeaderboardEntry>`
    with user_totals as (
      select
        u.id as user_id,
        u.team_id as team_id,
        u.username,
        u.profile_picture as profile_picture,
        (
          coalesce(
            sum(
              case ups.attendance
                when 1 then coalesce(pd.attendance_virtual, 0)
                when 2 then coalesce(pd.attendance_on_site, 0)
                else 0
              end
              + case ups.protocol
                  when 1 then coalesce(pd.protocol_forced, 0)
                  when 2 then coalesce(pd.protocol_voluntarily, 0)
                  else 0
                end
              + case
                  when ups.moderation then coalesce(pd.moderation, 0)
                  else 0
                end
              + case
                  when ups.working_group then coalesce(pd.working_group, 0)
                  else 0
                end
              + (coalesce(ups.twl, 0) * coalesce(pd.twl, 0))
              + (coalesce(ups.presentations, 0) * coalesce(pd.presentation, 0))
            ),
            0
          )
          + coalesce(max(mp.total_points), 0)
        )::integer as total_points
      from ${users} u
      left join ${userPointSubmissions} ups on ups.user_id = u.id
      left join ${guildMeetings} gm on gm.id = ups.guild_meeting_id and gm.timestamp <= now()
      left join lateral (
        select
          attendance_virtual,
          attendance_on_site,
          protocol_forced,
          protocol_voluntarily,
          moderation,
          working_group,
          twl,
          presentation
        from ${pointDistribution} pd
        where pd.active_from <= gm.timestamp
        order by pd.active_from desc
        limit 1
      ) pd on true
      left join lateral (
        select
          coalesce(sum(mp.points), 0)::integer as total_points
        from ${manualPoints} mp
        where mp.user_id = u.id
      ) mp on true
      group by u.id, u.team_id, u.username, u.profile_picture
    )
    select
      t.id as "teamId",
      t.name as "teamName",
      coalesce(
        ceil(
          coalesce(sum(ut.total_points), 0)::numeric
          / nullif(count(ut.user_id), 0)
        ),
        0
      )::integer as "totalPoints",
      coalesce(
        json_agg(
          json_build_object(
            'userId', ut.user_id,
            'username', ut.username,
            'profilePicture', ut.profile_picture,
            'totalPoints', ut.total_points
          )
          order by ut.total_points desc, ut.username
        ) filter (where ut.user_id is not null),
        '[]'::json
      )::text as members
    from ${teams} t
    left join user_totals ut on ut.team_id = t.id
    group by t.id, t.name
    order by "totalPoints" desc, t.name
  `);

  const rows = result.rows as RawTeamLeaderboardEntry[];

  return rows.map((row) => ({
    teamId: String(row.teamId),
    teamName: String(row.teamName),
    totalPoints: Number(row.totalPoints),
    members: (JSON.parse(row.members) as TeamMemberEntry[]).map((member) => ({
      userId: String(member.userId),
      username: String(member.username),
      profilePicture: member.profilePicture ?? null,
      totalPoints: Number(member.totalPoints),
    })),
  }));
};

export const getIndividualLeaderboardPlacement = async (userId: string): Promise<number | null> => {
  const rankedEntries = rankLeaderboardEntries(await getLeaderboard());
  return rankedEntries.find((entry) => entry.userId === userId)?.rank ?? null;
};
