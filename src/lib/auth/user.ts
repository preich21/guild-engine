import "server-only";

import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { guildMeetings, userPointSubmissions, users } from "@/db/schema";
import { db } from "@/lib/db";

type RawAttendanceStreakRow = {
  streak: number | string;
  hasPendingRecentMeeting: boolean;
};

export type UserAttendanceStreak = {
  count: number;
  hasPendingRecentMeeting: boolean;
};

const isValidUserName = (value: unknown): value is string =>
  typeof value === "string" && value.trim() !== "" && value.length <= 255;

export const getCurrentUserRecord = async () => {
  const session = await auth();
  const userName = session?.user?.name;

  if (!isValidUserName(userName)) {
    return null;
  }

  const userRows = await db
    .select({
      id: users.id,
      username: users.username,
      profilePicture: users.profilePicture,
      admin: users.admin,
      preferredLang: users.preferredLang,
      teamId: users.teamId,
    })
    .from(users)
    .where(eq(users.username, userName))
    .limit(1);

  return userRows[0] ?? null;
};

export const getUserGuildMeetingAttendanceStreak = async (
  userId: string,
): Promise<UserAttendanceStreak> => {
  const result = await db.execute(sql<RawAttendanceStreakRow>`
    with selected_user as (
      select u.id
      from ${users} u
      where u.id = ${userId}
      limit 1
    ),
    meeting_rows as (
      select
        gm.id as meeting_id,
        gm.timestamp as meeting_time,
        ups.id as submission_id,
        coalesce(ups.attendance in (1, 2), false) as attended
      from selected_user su
      join ${guildMeetings} gm on gm.timestamp <= now()
      left join ${userPointSubmissions} ups
        on ups.guild_meeting_id = gm.id
        and ups.user_id = su.id
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
      )::integer as streak,
      (select sil.value from should_ignore_latest sil) as "hasPendingRecentMeeting"
  `);

  const row = (result.rows[0] as RawAttendanceStreakRow | undefined) ?? {
    streak: 0,
    hasPendingRecentMeeting: false,
  };

  return {
    count: Number(row.streak),
    hasPendingRecentMeeting: Boolean(row.hasPendingRecentMeeting),
  };
};

export const isCurrentUserAdmin = async (): Promise<boolean> => {
  const userRecord = await getCurrentUserRecord();
  return Boolean(userRecord?.admin);
};

export const requireCurrentUserAdmin = async () => {
  if (!(await isCurrentUserAdmin())) {
    notFound();
  }
};
