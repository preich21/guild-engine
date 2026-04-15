"use server";

import { sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  guildMeetings,
  pointDistribution,
  teams,
  userPointSubmissions,
  users,
} from "@/db/schema";

export type LeaderboardEntry = {
  userId: string;
  username: string;
  profilePicture: string | null;
  totalPoints: number;
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

type RawLeaderboardEntry = {
  userId: string;
  username: string;
  profilePicture: string | null;
  totalPoints: number | string;
};

type RawTeamLeaderboardEntry = {
  teamId: string;
  teamName: string;
  totalPoints: number | string;
  members: string;
};

export const getLeaderboard = async (): Promise<LeaderboardEntry[]> => {
  const result = await db.execute(sql<RawLeaderboardEntry>`
    select
      u.id as "userId",
      u.username,
      u.profile_picture as "profilePicture",
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
      )::integer as "totalPoints"
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
    group by u.id, u.username, u.profile_picture
    order by "totalPoints" desc, u.username
  `);

  const rows = result.rows as RawLeaderboardEntry[];

  return rows.map((row) => ({
    userId: String(row.userId),
    username: String(row.username),
    profilePicture: row.profilePicture,
    totalPoints: Number(row.totalPoints),
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


