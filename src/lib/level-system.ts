import "server-only";

import {cache} from "react";
import {sql} from "drizzle-orm";

import {
  userLevels,
  userPowerups,
} from "@/db/schema";
import {db} from "@/lib/db";
import {getCurrentFeatureConfig} from "@/lib/feature-config-server";
import {getFeatureSettingValue, isFeatureEnabled} from "@/lib/feature-flags";
import {loadUserPointTotals} from "@/lib/point-calculation";

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

  const pointRows = await loadUserPointTotals({userIds});

  if (pointRows.length === 0) {
    return [];
  }

  const selectedUserIds = sql.join(pointRows.map((row) => sql`${row.userId}`), sql`, `);
  const levelRows = await db.execute<{
    userId: string;
    storedLevel: number | string | null;
  }>(sql`
    select
      ul.user_id as "userId",
      ul.current_level as "storedLevel"
    from ${userLevels} ul
    where ul.user_id in (${selectedUserIds})
  `);
  const storedLevelByUserId = new Map(
    levelRows.rows.map((row) => [String(row.userId), row.storedLevel]),
  );

  return pointRows.map((row) => ({
    userId: row.userId,
    totalPoints: row.totalPoints,
    storedLevel: storedLevelByUserId.get(row.userId) ?? null,
  })) satisfies RawUserLevelRow[];
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
      await db.transaction(async (tx) => {
        const awardedLootboxesByUserId = new Map(
          levelUps.map(([userId, entry]) => [
            userId,
            entry.calculatedLevel - (entry.storedLevel ?? 0),
          ]),
        );
        const savedLevelUps = await tx
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
          })
          .returning({
            userId: userLevels.userId,
          });

        if (savedLevelUps.length === 0) {
          return;
        }

        await tx
          .insert(userPowerups)
          .values(
            savedLevelUps.map(({ userId }) => ({
              userId,
              lootboxes: awardedLootboxesByUserId.get(userId) ?? 0,
            })),
          )
          .onConflictDoUpdate({
            target: userPowerups.userId,
            set: {
              lootboxes: sql`${userPowerups.lootboxes} + excluded.lootboxes`,
            },
          });
      });
    }

    return Object.fromEntries(
      entries.map(([userId, entry]) => [userId, entry.progress]),
    );
  },
);

export const getUserLevelProgress = async (userId: string) =>
  (await getUserLevelProgressMap([userId]))[userId] ?? null;
