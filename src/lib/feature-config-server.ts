import "server-only";

import { cache } from "react";
import { desc, eq } from "drizzle-orm";

import { featureConfig, type FeatureConfigEntry, users } from "@/db/schema";
import { db } from "@/lib/db";
import {
  applyFeaturePrerequisites,
  getDefaultFeatureConfigState,
  mergeFeatureConfigState,
  type FeatureConfigState,
} from "@/lib/feature-flags";

type FeatureConfigRow = typeof featureConfig.$inferSelect;

export type CurrentFeatureConfig = {
  state: FeatureConfigState;
  timestamp: string | null;
  modifyingUsername: string | null;
};

const featureColumns = {
  "point-system": {
    enabled: "pointSystemEnabled",
    config: "pointSystemConfig",
  },
  "individual-leaderboard": {
    enabled: "individualLeaderboardEnabled",
    config: "individualLeaderboardConfig",
  },
  "team-leaderboard": {
    enabled: "teamLeaderboardEnabled",
    config: "teamLeaderboardConfig",
  },
  "level-system": {
    enabled: "levelSystemEnabled",
    config: "levelSystemConfig",
  },
  badges: {
    enabled: "badgesEnabled",
    config: "badgesConfig",
  },
  "cooperative-progress-bar": {
    enabled: "cooperativeProgressBarEnabled",
    config: "cooperativeProgressBarConfig",
  },
  quests: {
    enabled: "questsEnabled",
    config: "questsConfig",
  },
  streaks: {
    enabled: "streaksEnabled",
    config: "streaksConfig",
  },
  minigames: {
    enabled: "minigamesEnabled",
    config: "minigamesConfig",
  },
  powerups: {
    enabled: "powerupsEnabled",
    config: "powerupsConfig",
  },
} as const;

type FeatureId = keyof typeof featureColumns;

const isFeatureId = (featureId: string): featureId is FeatureId => featureId in featureColumns;

const configEntriesToSettings = (
  entries: FeatureConfigEntry[] | null | undefined,
) => Object.fromEntries((entries ?? []).map((entry) => [entry.id, entry.value]));

const buildStateFromRow = (row: FeatureConfigRow): FeatureConfigState =>
  Object.fromEntries(
    Object.entries(featureColumns).map(([featureId, columns]) => {
      if (!isFeatureId(featureId)) {
        return [featureId, { enabled: false, settings: {} }];
      }

      return [
        featureId,
        {
          enabled: Boolean(row[columns.enabled]),
          settings: configEntriesToSettings(row[columns.config] as FeatureConfigEntry[]),
        },
      ];
    }),
  );

export const loadCurrentFeatureConfig = async (): Promise<CurrentFeatureConfig> => {
  const defaults = getDefaultFeatureConfigState();
  const rows = await db
    .select({
      config: featureConfig,
      username: users.username,
    })
    .from(featureConfig)
    .innerJoin(users, eq(featureConfig.modifyingUser, users.id))
    .orderBy(desc(featureConfig.timestamp), desc(featureConfig.id))
    .limit(1);

  const row = rows[0];

  if (!row) {
    return {
      state: applyFeaturePrerequisites(defaults),
      timestamp: null,
      modifyingUsername: null,
    };
  }

  return {
    state: applyFeaturePrerequisites(
      mergeFeatureConfigState(defaults, buildStateFromRow(row.config)),
    ),
    timestamp: row.config.timestamp.toISOString(),
    modifyingUsername: row.username,
  };
};

export const getCurrentFeatureConfig = cache(loadCurrentFeatureConfig);
