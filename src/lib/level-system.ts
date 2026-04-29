import "server-only";

import {cache} from "react";
import {sql} from "drizzle-orm";

import {guildMeetings, manualPoints, pointDistribution, userLevels, userPointSubmissions, users,} from "@/db/schema";
import {db} from "@/lib/db";
import {getCurrentFeatureConfig} from "@/lib/feature-config-server";
import {getFeatureSettingValue, isFeatureEnabled} from "@/lib/feature-flags";

export type LevelSystemConfig = {
  firstLevelPoints: number;
  levelMultiplier: number;
};

export type UserLevelProgress = {
  userId: string;
  totalPoints: number;
  currentLevel: number;
  currentLevelPoints: number;
  nextLevelPoints: number;
  spilloverPoints: number;
  pointsRequiredForNextLevel: number;
  nextLevel: number;
  progressPercent: number;
};

type RawUserLevelRow = {
  userId: string;
  totalPoints: number | string;
  storedLevel: number | string | null;
};

const MIN_LEVEL_POINTS = 1;
const MIN_LEVEL_MULTIPLIER = 1;
const MAX_LEVEL_ITERATIONS = 10000;

const parsePositiveNumber = (value: unknown, fallback: number) => {
  const numericValue = typeof value === "number" ? value : Number(value);

  return Number.isFinite(numericValue) && numericValue >= fallback ? numericValue : fallback;
};

export const getLevelSystemConfig = cache(async (): Promise<LevelSystemConfig | null> => {
  const featureConfig = await getCurrentFeatureConfig();

  if (!isFeatureEnabled(featureConfig.state, "level-system")) {
    return null;
  }

  return {
    firstLevelPoints: parsePositiveNumber(
      getFeatureSettingValue(featureConfig.state, "level-system", "first-level-points"),
      MIN_LEVEL_POINTS,
    ),
    levelMultiplier: parsePositiveNumber(
      getFeatureSettingValue(featureConfig.state, "level-system", "level-multiplier"),
      MIN_LEVEL_MULTIPLIER,
    ),
  };
});

export const getLevelThreshold = (level: number, config: LevelSystemConfig) => {
  const normalizedLevel = Math.max(0, Math.floor(level));

  if (normalizedLevel === 0) {
    return 0;
  }

  if (config.levelMultiplier === 1) {
    return config.firstLevelPoints * normalizedLevel;
  }

  return (
    config.firstLevelPoints *
    ((config.levelMultiplier ** normalizedLevel - 1) / (config.levelMultiplier - 1))
  );
};

const getCalculatedLevel = (totalPoints: number, config: LevelSystemConfig) => {
  if (totalPoints <= 0) {
    return 0;
  }

  if (config.levelMultiplier === 1) {
    const levelAtOrBelowTotal = Math.ceil(totalPoints / config.firstLevelPoints) - 1;
    return Math.max(0, levelAtOrBelowTotal);
  }

  const expression =
    (totalPoints * (config.levelMultiplier - 1)) / config.firstLevelPoints + 1;
  let level = Math.max(
      0,
      Math.ceil(Math.log(expression) / Math.log(config.levelMultiplier)) - 1,
  );

  while (
    level < MAX_LEVEL_ITERATIONS &&
    getLevelThreshold(level + 1, config) < totalPoints
  ) {
    level += 1;
  }

  while (level > 0 && getLevelThreshold(level, config) >= totalPoints) {
    level -= 1;
  }

  return level;
};

const buildLevelProgress = (
  userId: string,
  totalPoints: number,
  storedLevel: number | null,
  config: LevelSystemConfig,
): UserLevelProgress => {
  const calculatedLevel = getCalculatedLevel(totalPoints, config);
  const currentLevel = Math.max(calculatedLevel, storedLevel ?? 0);
  const currentLevelPoints = getLevelThreshold(currentLevel, config);
  const nextLevel = currentLevel + 1;
  const nextLevelPoints = getLevelThreshold(nextLevel, config);
  const pointsInCurrentLevel = Math.max(0, nextLevelPoints - currentLevelPoints);
  const spilloverPoints = totalPoints - currentLevelPoints;
  const progressSpilloverPoints = Math.max(0, spilloverPoints);
  const progressPercent =
    pointsInCurrentLevel === 0
      ? 0
      : Math.min(100, Math.max(0, (progressSpilloverPoints / pointsInCurrentLevel) * 100));

  return {
    userId,
    totalPoints,
    currentLevel,
    currentLevelPoints,
    nextLevelPoints,
    spilloverPoints,
    pointsRequiredForNextLevel: pointsInCurrentLevel,
    nextLevel,
    progressPercent,
  };
};

const loadRawUserLevelRows = async (userIds: string[]) => {
  if (userIds.length === 0) {
    return [];
  }

  const selectedUserIds = sql.join(userIds.map((userId) => sql`${userId}`), sql`, `);

  const result = await db.execute(sql<RawUserLevelRow>`
    with selected_users as (
      select u.id
      from ${users} u
      where u.id in (${selectedUserIds})
    ),
    submission_points as (
      select
        su.id as user_id,
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
      from selected_users su
      left join ${userPointSubmissions} ups on ups.user_id = su.id
      left join ${guildMeetings} gm
        on gm.id = ups.guild_meeting_id
        and gm.timestamp <= now()
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
      group by su.id
    ),
    manual_points_totals as (
      select
        su.id as user_id,
        coalesce(sum(mp.points), 0)::integer as total_points
      from selected_users su
      left join ${manualPoints} mp on mp.user_id = su.id
      group by su.id
    )
    select
      su.id as "userId",
      (
        coalesce(sp.total_points, 0)
        + coalesce(mpt.total_points, 0)
      )::integer as "totalPoints",
      ul.current_level as "storedLevel"
    from selected_users su
    left join submission_points sp on sp.user_id = su.id
    left join manual_points_totals mpt on mpt.user_id = su.id
    left join ${userLevels} ul on ul.user_id = su.id
  `);

  return result.rows as RawUserLevelRow[];
};

export const getUserLevelProgressMap = cache(
  async (userIds: string[]): Promise<Record<string, UserLevelProgress>> => {
    const config = await getLevelSystemConfig();

    if (!config) {
      return {};
    }

    const uniqueUserIds = Array.from(new Set(userIds));
    const rows = await loadRawUserLevelRows(uniqueUserIds);
    const entries = rows.map((row) => {
      const progress = buildLevelProgress(
        String(row.userId),
        Number(row.totalPoints),
        row.storedLevel === null ? null : Number(row.storedLevel),
        config,
      );

      return [
        progress.userId,
        {
          progress,
          calculatedLevel: getCalculatedLevel(Number(row.totalPoints), config),
          storedLevel: row.storedLevel === null ? null : Number(row.storedLevel),
        },
      ] as const;
    });

    const levelUps = entries.filter(
      ([, entry]) => entry.calculatedLevel > (entry.storedLevel ?? 0),
    );

    if (levelUps.length > 0) {
      await db
        .insert(userLevels)
        .values(
          levelUps.map(([userId, entry]) => ({
            userId,
            currentLevel: entry.calculatedLevel,
          })),
        )
        .onConflictDoUpdate({
          target: userLevels.userId,
          set: {
            currentLevel: sql`excluded.current_level`,
            lastLevelUp: sql`now()`,
          },
          setWhere: sql`${userLevels.currentLevel} < excluded.current_level`,
        });
    }

    return Object.fromEntries(
      entries.map(([userId, entry]) => [userId, entry.progress]),
    );
  },
);

export const getUserLevelProgress = async (userId: string) =>
  (await getUserLevelProgressMap([userId]))[userId] ?? null;
