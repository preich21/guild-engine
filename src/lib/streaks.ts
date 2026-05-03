import "server-only";

import { sql } from "drizzle-orm";

import {
  activatedStreakFreezes,
  guildMeetings,
  trackedContributions,
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

type RawStreakRow = {
  userId: string;
  streak: number | string;
  hasPendingRecentMeeting: boolean;
  latestMeetingWasStreakFreeze: boolean;
};

export type UserStreak = {
  count: number;
  hasPendingRecentMeeting: boolean;
  latestMeetingWasStreakFreeze: boolean;
};

const EMPTY_STREAK: UserStreak = {
  count: 0,
  hasPendingRecentMeeting: false,
  latestMeetingWasStreakFreeze: false,
};

type StreakQualificationConfig = {
  metricId: string;
  validValues: number | number[];
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

const toStreak = (
  row: RawStreakRow | undefined,
): UserStreak => ({
  count: Number(row?.streak ?? EMPTY_STREAK.count),
  hasPendingRecentMeeting: Boolean(row?.hasPendingRecentMeeting),
  latestMeetingWasStreakFreeze: Boolean(row?.latestMeetingWasStreakFreeze),
});

const getStreakQualificationConfig = (state: FeatureConfigState): StreakQualificationConfig => {
  const metricId = String(getFeatureSettingValue(state, "streaks", "performance-metric") ?? "");
  const validValues = getFeatureSettingValue(state, "streaks", "valid-values");

  return {
    metricId,
    validValues: Array.isArray(validValues)
      ? validValues.filter((value) => Number.isInteger(value))
      : Number(validValues),
  };
};

const isStreakQualificationConfigured = ({
  metricId,
  validValues,
}: StreakQualificationConfig) =>
  UUID_PATTERN.test(metricId) &&
  (Array.isArray(validValues)
    ? validValues.length > 0
    : Number.isInteger(validValues) && validValues >= 0);

const getQualifyingContributionSql = ({
  metricId,
  validValues,
}: StreakQualificationConfig) => {
  const valueFilter = Array.isArray(validValues)
    ? validValues.length === 0
      ? sql`false`
      : sql`metric.value::integer in (${sql.join(validValues.map((value) => sql`${value}`), sql`, `)})`
    : sql`metric.value::integer >= ${validValues}`;

  return sql`
    exists (
      select 1
      from jsonb_to_recordset(tc.data) as metric(id text, value integer)
      where metric.id = ${metricId}
        and ${valueFilter}
    )
  `;
};

const applyEligibleStreakFreezes = async (
  timeoutHours: number,
  qualificationConfig: StreakQualificationConfig,
) => {
  const hasQualifyingContributionSql = getQualifyingContributionSql(qualificationConfig);

  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('activated_streak_freezes:auto'))`);

    const insertedRows = await tx.execute<{ userId: string }>(sql`
      with meeting_rows as (
        select
          up.user_id,
          gm.id as meeting_id,
          gm.timestamp as meeting_time,
          tc.id as contribution_id,
          asf.user_id is not null as has_streak_freeze,
          coalesce(${hasQualifyingContributionSql}, false) as has_qualifying_contribution,
          coalesce(${hasQualifyingContributionSql}, false) or asf.user_id is not null as attended
        from ${userPowerups} up
        join ${guildMeetings} gm on gm.timestamp <= now()
        left join ${trackedContributions} tc
          on tc.meeting_id = gm.id
          and tc.user_id = up.user_id
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
          mr.contribution_id,
          mr.has_streak_freeze,
          mr.has_qualifying_contribution,
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
          and not missed.has_qualifying_contribution
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

const loadUserStreakRows = async (
  userIds: string[] | undefined,
  timeoutHours: number,
  qualificationConfig: StreakQualificationConfig,
) => {
  const hasQualifyingContributionSql = getQualifyingContributionSql(qualificationConfig);
  const userFilter = userIds === undefined
    ? sql`true`
    : userIds.length === 0
      ? sql`false`
      : sql`u.id in (${sql.join(userIds.map((userId) => sql`${userId}`), sql`, `)})`;

  const result = await db.execute<RawStreakRow>(sql`
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
          tc.id as contribution_id,
          asf.user_id is not null as has_streak_freeze,
          coalesce(${hasQualifyingContributionSql}, false) as has_qualifying_contribution,
          coalesce(${hasQualifyingContributionSql}, false) or asf.user_id is not null as attended
        from ${guildMeetings} gm
        left join ${trackedContributions} tc
          on tc.meeting_id = gm.id
          and tc.user_id = u.id
        left join ${activatedStreakFreezes} asf
          on asf.meeting_id = gm.id
          and asf.user_id = u.id
        where gm.timestamp <= now()
      ),
      latest_meeting as (
        select
          mr.meeting_id,
          mr.meeting_time,
          mr.has_qualifying_contribution,
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
            select not lm.has_qualifying_contribution and lm.has_streak_freeze
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

export const getUsersGuildMeetingStreaks = async (
  userIds?: string[],
): Promise<Record<string, UserStreak>> => {
  const featureConfig = await loadCurrentFeatureConfig();
  const timeoutHours = getStreakFreezeAutomaticApplyTimeoutHours(featureConfig.state);
  const qualificationConfig = getStreakQualificationConfig(featureConfig.state);

  if (!isStreakQualificationConfigured(qualificationConfig)) {
    return {};
  }

  if (shouldApplyStreakFreezes(featureConfig.state)) {
    await applyEligibleStreakFreezes(timeoutHours, qualificationConfig);
  }

  const rows = await loadUserStreakRows(userIds, timeoutHours, qualificationConfig);

  return Object.fromEntries(
    rows.map((row) => [String(row.userId), toStreak(row)]),
  );
};

export const getUserGuildMeetingStreak = async (
  userId: string,
): Promise<UserStreak> => {
  const streaksByUserId = await getUsersGuildMeetingStreaks([userId]);

  return streaksByUserId[userId] ?? EMPTY_STREAK;
};
