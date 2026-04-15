"use server";

import { sql } from "drizzle-orm";

import { guildMeetings, pointDistribution, userPointSubmissions, users } from "@/db/schema";
import { db } from "@/lib/db";

export type LeaderboardEntry = {
  userId: string;
  username: string;
  profilePicture: string | null;
  totalPoints: number;
};

type RawLeaderboardEntry = {
  userId: string;
  username: string;
  profilePicture: string | null;
  totalPoints: number | string;
};

export const getLeaderboard = async (): Promise<LeaderboardEntry[]> => {
  const result = await db.execute(sql<RawLeaderboardEntry>`
      select u.id       as "userId",
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
          select attendance_virtual,
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
