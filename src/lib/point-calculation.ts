import "server-only";

import { sql } from "drizzle-orm";

import {
  guildMeetings,
  manualPoints,
  performanceMetrics,
  powerupUtilization,
  trackedContributions,
  users,
} from "@/db/schema";
import { db } from "@/lib/db";
import { loadCurrentFeatureConfig } from "@/lib/feature-config-server";
import { getFeatureSettingValue } from "@/lib/feature-flags";

export type UserPointTotal = {
  userId: string;
  totalPoints: number;
};

type RawUserPointTotal = {
  userId: string;
  totalPoints: number | string;
};

type LoadUserPointTotalsOptions = {
  userIds?: string[];
  startDate?: string | null;
  endDate?: string | null;
};

export type PerformanceMetricPointConfig = {
  id: string;
  type: number;
  points: string | null;
};

export type TrackedContributionPointEntry = {
  id: unknown;
  value: unknown;
};

export const pointMultiplicatorPowerupIds = [
  "small-point-multiplicator",
  "medium-point-multiplicator",
  "large-point-multiplicator",
] as const;

export type PointMultiplicatorPowerupId = (typeof pointMultiplicatorPowerupIds)[number];

export type PointMultiplicatorFactors = Record<PointMultiplicatorPowerupId, number>;

const parsePointMultiplicatorFactor = (value: unknown): number => {
  const factor = typeof value === "number" ? value : Number(value);

  return Number.isFinite(factor) && factor >= 1 ? factor : 1;
};

export const parseNonNegativeInteger = (value: unknown): number | null => {
  if (typeof value === "number") {
    return Number.isInteger(value) && value >= 0 ? value : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  return /^[0-9]+$/.test(trimmedValue) ? Number(trimmedValue) : null;
};

export const calculateTrackedContributionEntryPoints = (
  entry: TrackedContributionPointEntry,
  metric: PerformanceMetricPointConfig | null | undefined,
): number => {
  if (!metric) {
    return 0;
  }

  const contributionValue = parseNonNegativeInteger(entry.value);

  if (contributionValue === null) {
    return 0;
  }

  if (metric.type === 1) {
    const pointsPerUnit = parseNonNegativeInteger(metric.points);

    return pointsPerUnit === null ? 0 : pointsPerUnit * contributionValue;
  }

  if (metric.type !== 0 || metric.points === null) {
    return 0;
  }

  const enumPoints = metric.points.split(";")[contributionValue];

  return parseNonNegativeInteger(enumPoints) ?? 0;
};

export const calculateTrackedContributionDataPoints = (
  data: TrackedContributionPointEntry[],
  metricsById: ReadonlyMap<string, PerformanceMetricPointConfig>,
  pointMultiplicatorFactor = 1,
): number =>
  data.reduce((total, entry) => {
    if (typeof entry.id !== "string") {
      return total;
    }

    return total + calculateTrackedContributionEntryPoints(entry, metricsById.get(entry.id));
  }, 0) * pointMultiplicatorFactor;

export const getPointMultiplicatorFactor = (
  powerup: string | null | undefined,
  factors: PointMultiplicatorFactors,
): number => {
  switch (powerup) {
    case "small-point-multiplicator":
      return factors["small-point-multiplicator"];
    case "medium-point-multiplicator":
      return factors["medium-point-multiplicator"];
    case "large-point-multiplicator":
      return factors["large-point-multiplicator"];
    default:
      return 1;
  }
};

export const getPointMultiplicatorFactors = async (): Promise<PointMultiplicatorFactors> => {
  const featureConfig = await loadCurrentFeatureConfig();

  return Object.fromEntries(
    pointMultiplicatorPowerupIds.map((powerupId) => [
      powerupId,
      parsePointMultiplicatorFactor(
        getFeatureSettingValue(featureConfig.state, "powerups", `${powerupId}-multiplicator`),
      ),
    ]),
  ) as PointMultiplicatorFactors;
};

export const parsePointCalculationStartDate = (value: unknown): string | null => {
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

export const loadUserPointTotals = async ({
  userIds,
  startDate = null,
  endDate = null,
}: LoadUserPointTotalsOptions = {}): Promise<UserPointTotal[]> => {
  const uniqueUserIds = userIds === undefined ? null : Array.from(new Set(userIds));

  if (uniqueUserIds?.length === 0) {
    return [];
  }

  const pointMultiplicatorFactors = await getPointMultiplicatorFactors();
  const selectedUserCondition =
    uniqueUserIds === null
      ? sql``
      : sql`where u.id in (${sql.join(uniqueUserIds.map((userId) => sql`${userId}`), sql`, `)})`;
  const pointStartDateCondition =
    startDate === null ? sql`` : sql`and gm.timestamp::date >= ${startDate}::date`;
  const pointEndDateCondition =
    endDate === null ? sql`` : sql`and gm.timestamp::date <= ${endDate}::date`;
  const manualPointStartDateCondition =
    startDate === null ? sql`` : sql`and mp.timestamp::date >= ${startDate}::date`;
  const manualPointEndDateCondition =
    endDate === null ? sql`` : sql`and mp.timestamp::date <= ${endDate}::date`;

  const result = await db.execute(sql<RawUserPointTotal>`
    with selected_users as (
      select u.id
      from ${users} u
      ${selectedUserCondition}
    ),
    tracked_contribution_points as (
      select
        su.id as user_id,
        coalesce(
          sum(
            coalesce(tcp.points, 0) * coalesce(pum.factor, 1)
          ),
          0
        )::integer as total_points
      from selected_users su
      left join (
        ${trackedContributions} tc
        inner join ${guildMeetings} gm
          on gm.id = tc.meeting_id
          and gm.timestamp <= now()
          ${pointStartDateCondition}
          ${pointEndDateCondition}
      ) on tc.user_id = su.id
      left join lateral (
        select coalesce(
          sum(
            case
              when pm.type = 1
                and parsed_contribution.metric_value is not null
                and trim(coalesce(pm.points, '')) ~ '^[0-9]+$'
                then trim(pm.points)::integer * parsed_contribution.metric_value
              when pm.type = 0
                and parsed_contribution.metric_value is not null
                and trim(
                  split_part(
                    coalesce(pm.points, ''),
                    ';',
                    parsed_contribution.metric_value + 1
                  )
                ) ~ '^[0-9]+$'
                then trim(
                  split_part(
                    coalesce(pm.points, ''),
                    ';',
                    parsed_contribution.metric_value + 1
                  )
                )::integer
              else 0
            end
          ),
          0
        )::numeric as points
        from jsonb_array_elements(coalesce(tc.data, '[]'::jsonb)) contribution(value)
        left join lateral (
          select
            contribution.value->>'id' as metric_id,
            case
              when contribution.value->>'value' ~ '^[0-9]+$'
                then (contribution.value->>'value')::integer
            end as metric_value
        ) parsed_contribution on true
        left join ${performanceMetrics} pm
          on pm.id::text = parsed_contribution.metric_id
      ) tcp on true
      left join lateral (
        select
          case pu.powerup
            when 'small-point-multiplicator' then ${pointMultiplicatorFactors["small-point-multiplicator"]}::numeric
            when 'medium-point-multiplicator' then ${pointMultiplicatorFactors["medium-point-multiplicator"]}::numeric
            when 'large-point-multiplicator' then ${pointMultiplicatorFactors["large-point-multiplicator"]}::numeric
            else 1::numeric
          end as factor
        from ${powerupUtilization} pu
        where pu.meeting_id = gm.id
          and pu.user_id = su.id
          and pu.powerup like '%-point-multiplicator'
        order by pu.usage_timestamp desc
        limit 1
      ) pum on true
      group by su.id
    ),
    manual_points_totals as (
      select
        su.id as user_id,
        coalesce(sum(mp.points), 0)::integer as total_points
      from selected_users su
      left join ${manualPoints} mp on mp.user_id = su.id
        ${manualPointStartDateCondition}
        ${manualPointEndDateCondition}
      group by su.id
    )
    select
      su.id as "userId",
      (
        coalesce(tcp.total_points, 0)
        + coalesce(mpt.total_points, 0)
      )::integer as "totalPoints"
    from selected_users su
    left join tracked_contribution_points tcp on tcp.user_id = su.id
    left join manual_points_totals mpt on mpt.user_id = su.id
  `);

  return (result.rows as RawUserPointTotal[]).map((row) => ({
    userId: String(row.userId),
    totalPoints: Number(row.totalPoints),
  }));
};
