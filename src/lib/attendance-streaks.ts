import "server-only";

import { sql } from "drizzle-orm";

import {
  activatedStreakFreezes,
  guildMeetings,
  userPointSubmissions,
  userPowerups,
  users,
} from "@/db/schema";
import { db } from "@/lib/db";
import { loadCurrentFeatureConfig } from "@/lib/feature-config-server";
import {
  getFeatureSettingValue,
  isFeatureEnabled,
  isFeatureSettingEnabled,
  type FeatureConfigState,
} from "@/lib/feature-flags";

const DEFAULT_STREAK_FREEZE_TIMEOUT_HOURS = 72;

type RawAttendanceStreakRow = {
  userId: string;
  streak: number | string;
  hasPendingRecentMeeting: boolean;
  latestMeetingWasStreakFreeze: boolean;
};

export type UserAttendanceStreak = {
  count: number;
  hasPendingRecentMeeting: boolean;
  latestMeetingWasStreakFreeze: boolean;
};

const EMPTY_ATTENDANCE_STREAK: UserAttendanceStreak = {
  count: 0,
  hasPendingRecentMeeting: false,
  latestMeetingWasStreakFreeze: false,
};

const getStreakFreezeAutomaticApplyTimeoutHours = (state: FeatureConfigState) => {
  const value = Number(
    getFeatureSettingValue(
      state,
      "powerups",
      "streak-freeze-automatic-apply-timeout",
    ),
  );

  return Number.isInteger(value) && value >= 1
    ? value
    : DEFAULT_STREAK_FREEZE_TIMEOUT_HOURS;
};

const shouldApplyStreakFreezes = (state: FeatureConfigState) =>
  isFeatureEnabled(state, "powerups") &&
  isFeatureSettingEnabled(state, "powerups", "streak-freeze");

const toAttendanceStreak = (
  row: RawAttendanceStreakRow | undefined,
): UserAttendanceStreak => ({
  count: Number(row?.streak ?? EMPTY_ATTENDANCE_STREAK.count),
  hasPendingRecentMeeting: Boolean(row?.hasPendingRecentMeeting),
  latestMeetingWasStreakFreeze: Boolean(row?.latestMeetingWasStreakFreeze),
});

const applyEligibleStreakFreezes = async (timeoutHours: number) => {
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('activated_streak_freezes:auto'))`);

    const insertedRows = await tx.execute<{ userId: string }>(sql`
      with meeting_rows as (
        select
          up.user_id,
          gm.id as meeting_id,
          gm.timestamp as meeting_time,
          ups.id as submission_id,
          asf.user_id is not null as has_streak_freeze,
          coalesce(ups.attendance in (1, 2), false) as has_attendance,
          coalesce(ups.attendance in (1, 2), false) or asf.user_id is not null as attended
        from ${userPowerups} up
        join ${guildMeetings} gm on gm.timestamp <= now()
        left join ${userPointSubmissions} ups
          on ups.guild_meeting_id = gm.id
          and ups.user_id = up.user_id
        left join ${activatedStreakFreezes} asf
          on asf.meeting_id = gm.id
          and asf.user_id = up.user_id
        where up.streak_freezes > 0
      ),
      latest_meeting as (
        select distinct on (mr.user_id)
          mr.user_id,
          mr.meeting_id,
          mr.meeting_time,
          mr.attended
        from meeting_rows mr
        order by mr.user_id, mr.meeting_time desc, mr.meeting_id desc
      ),
      considered_meetings as (
        select
          mr.user_id,
          mr.meeting_id,
          mr.meeting_time,
          mr.submission_id,
          mr.has_streak_freeze,
          mr.has_attendance,
          mr.attended
        from meeting_rows mr
        left join latest_meeting lm on lm.user_id = mr.user_id
        where lm.meeting_id is null
          or mr.meeting_id <> lm.meeting_id
          or lm.attended
          or lm.meeting_time <= now() - make_interval(hours => ${timeoutHours})
      ),
      ranked_meetings as (
        select
          cm.*,
          row_number() over (
            partition by cm.user_id
            order by cm.meeting_time desc, cm.meeting_id desc
          ) as meeting_rank
        from considered_meetings cm
      ),
      eligible_freezes as (
        select missed.user_id, missed.meeting_id
        from ranked_meetings missed
        join ranked_meetings previous_meeting
          on previous_meeting.user_id = missed.user_id
          and previous_meeting.meeting_rank = 2
        where missed.meeting_rank = 1
          and not missed.attended
          and not missed.has_attendance
          and not missed.has_streak_freeze
          and previous_meeting.attended
      ),
      inserted_freezes as (
        insert into ${activatedStreakFreezes} (user_id, meeting_id)
        select ef.user_id, ef.meeting_id
        from eligible_freezes ef
        on conflict do nothing
        returning user_id as "userId"
      )
      select "userId"
      from inserted_freezes
    `);

    const insertedUserIds = insertedRows.rows.map((row) => row.userId);

    if (insertedUserIds.length === 0) {
      return;
    }

    await tx.execute(sql`
      update ${userPowerups}
      set streak_freezes = streak_freezes - 1
      where user_id in (${sql.join(insertedUserIds.map((userId) => sql`${userId}`), sql`, `)})
        and streak_freezes > 0
    `);
  });
};

const loadUserAttendanceStreakRows = async (
  userIds: string[] | undefined,
  timeoutHours: number,
) => {
  const userFilter = userIds === undefined
    ? sql`true`
    : userIds.length === 0
      ? sql`false`
      : sql`u.id in (${sql.join(userIds.map((userId) => sql`${userId}`), sql`, `)})`;

  const result = await db.execute<RawAttendanceStreakRow>(sql`
    select
      u.id as "userId",
      coalesce(streak.count, 0)::integer as streak,
      coalesce(streak.has_pending_recent_meeting, false) as "hasPendingRecentMeeting",
      coalesce(streak.latest_meeting_was_streak_freeze, false) as "latestMeetingWasStreakFreeze"
    from ${users} u
    left join lateral (
      with meeting_rows as (
        select
          gm.id as meeting_id,
          gm.timestamp as meeting_time,
          ups.id as submission_id,
          asf.user_id is not null as has_streak_freeze,
          coalesce(ups.attendance in (1, 2), false) as has_attendance,
          coalesce(ups.attendance in (1, 2), false) or asf.user_id is not null as attended
        from ${guildMeetings} gm
        left join ${userPointSubmissions} ups
          on ups.guild_meeting_id = gm.id
          and ups.user_id = u.id
        left join ${activatedStreakFreezes} asf
          on asf.meeting_id = gm.id
          and asf.user_id = u.id
        where gm.timestamp <= now()
      ),
      latest_meeting as (
        select
          mr.meeting_id,
          mr.meeting_time,
          mr.has_attendance,
          mr.has_streak_freeze,
          mr.attended
        from meeting_rows mr
        order by mr.meeting_time desc, mr.meeting_id desc
        limit 1
      ),
      should_ignore_latest as (
        select coalesce(
          (
            select not lm.attended
              and lm.meeting_time > now() - make_interval(hours => ${timeoutHours})
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
        (select sil.value from should_ignore_latest sil) as has_pending_recent_meeting,
        coalesce(
          (
            select not lm.has_attendance and lm.has_streak_freeze
            from latest_meeting lm
          ),
          false
        ) as latest_meeting_was_streak_freeze
    ) streak on true
    where ${userFilter}
    order by u.username
  `);

  return result.rows;
};

export const getUsersGuildMeetingAttendanceStreaks = async (
  userIds?: string[],
): Promise<Record<string, UserAttendanceStreak>> => {
  const featureConfig = await loadCurrentFeatureConfig();
  const timeoutHours = getStreakFreezeAutomaticApplyTimeoutHours(featureConfig.state);

  if (shouldApplyStreakFreezes(featureConfig.state)) {
    await applyEligibleStreakFreezes(timeoutHours);
  }

  const rows = await loadUserAttendanceStreakRows(userIds, timeoutHours);

  return Object.fromEntries(
    rows.map((row) => [String(row.userId), toAttendanceStreak(row)]),
  );
};

export const getUserGuildMeetingAttendanceStreak = async (
  userId: string,
): Promise<UserAttendanceStreak> => {
  const streaksByUserId = await getUsersGuildMeetingAttendanceStreaks([userId]);

  return streaksByUserId[userId] ?? EMPTY_ATTENDANCE_STREAK;
};
