"use server";

import { revalidatePath } from "next/cache";
import { desc, eq } from "drizzle-orm";

import { requireAdminAccess } from "@/app/[lang]/admin/actions";
import featureConfiguration from "@/config/feature-configuration.json";
import { featureConfig, type FeatureConfigEntry, type FeatureConfigValue, users } from "@/db/schema";
import { hasLocale } from "@/i18n/config";
import { getCurrentUserRecord } from "@/lib/auth/user";
import { db } from "@/lib/db";
import { normalizeHomePagePath } from "@/lib/feature-flags";

export type FeatureConfigState = Record<
  string,
  {
    enabled: boolean;
    settings: Record<string, FeatureConfigValue>;
  }
>;

export type LoadedFeatureConfig = {
  state: FeatureConfigState | null;
  homePagePath: string | null;
  timestamp: string | null;
  modifyingUsername: string | null;
};

export type SaveFeatureConfigResult =
  | {
      status: "success";
      entry: LoadedFeatureConfig;
    }
  | {
      status: "error";
    };

type CatalogSetting = {
  id: string;
  type: "checkbox" | "date" | "decimal" | "number" | "select" | "string" | "switch";
  defaultValue?: FeatureConfigValue;
  min?: number;
  step?: number;
  options?: Array<{ value: string }>;
};

type CatalogFeature = {
  id: string;
  defaultEnabled?: boolean;
  configuration?: CatalogSetting[];
};

type Catalog = {
  features: CatalogFeature[];
};

const catalog = featureConfiguration as Catalog;

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
type FeatureConfigInsert = typeof featureConfig.$inferInsert;
type FeatureConfigRow = typeof featureConfig.$inferSelect;

const getSettingDefaultValue = (setting: CatalogSetting): FeatureConfigValue => {
  if (setting.defaultValue !== undefined) {
    return setting.defaultValue;
  }

  if (setting.type === "checkbox" || setting.type === "switch") {
    return false;
  }

  if (setting.type === "number" || setting.type === "decimal") {
    return setting.min ?? 0;
  }

  if (setting.type === "select") {
    return setting.options?.[0]?.value ?? "";
  }

  return "";
};

const isFeatureId = (featureId: string): featureId is FeatureId => featureId in featureColumns;

const normalizeSettingValue = (
  setting: CatalogSetting,
  value: unknown,
): FeatureConfigValue | null => {
  if (setting.type === "checkbox" || setting.type === "switch") {
    return typeof value === "boolean" ? value : null;
  }

  if (setting.type === "number") {
    const parsed = typeof value === "number" ? value : Number(value);

    if (!Number.isInteger(parsed) || (setting.min !== undefined && parsed < setting.min)) {
      return null;
    }

    return parsed;
  }

  if (setting.type === "decimal") {
    const parsed = typeof value === "number" ? value : Number(value);

    if (!Number.isFinite(parsed) || (setting.min !== undefined && parsed < setting.min)) {
      return null;
    }

    return parsed;
  }

  if (setting.type === "select") {
    if (typeof value !== "string") {
      return null;
    }

    if (!setting.options?.some((option) => option.value === value)) {
      return null;
    }

    return value;
  }

  return typeof value === "string" ? value : null;
};

const configEntriesToSettings = (
  entries: FeatureConfigEntry[] | null | undefined,
): Record<string, FeatureConfigValue> =>
  Object.fromEntries((entries ?? []).map((entry) => [entry.id, entry.value]));

const buildStateFromRow = (row: FeatureConfigRow): FeatureConfigState =>
  Object.fromEntries(
    catalog.features.map((feature) => {
      if (!isFeatureId(feature.id)) {
        return [feature.id, { enabled: false, settings: {} }];
      }

      const columns = featureColumns[feature.id];
      const configEntries = row[columns.config] as FeatureConfigEntry[];

      return [
        feature.id,
        {
          enabled: Boolean(row[columns.enabled]),
          settings: configEntriesToSettings(configEntries),
        },
      ];
    }),
  );

const normalizeFeatureState = (value: unknown): FeatureConfigState | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const payload = value as Record<string, unknown>;
  const normalized: FeatureConfigState = {};

  for (const feature of catalog.features) {
    if (!isFeatureId(feature.id)) {
      return null;
    }

    const payloadFeature = payload[feature.id];

    if (!payloadFeature || typeof payloadFeature !== "object") {
      return null;
    }

    const featureRecord = payloadFeature as Record<string, unknown>;
    const settingsRecord =
      featureRecord.settings && typeof featureRecord.settings === "object"
        ? (featureRecord.settings as Record<string, unknown>)
        : {};

    if (typeof featureRecord.enabled !== "boolean") {
      return null;
    }

    normalized[feature.id] = {
      enabled: featureRecord.enabled,
      settings: Object.fromEntries(
        (feature.configuration ?? []).map((setting) => {
          const normalizedValue = normalizeSettingValue(
            setting,
            settingsRecord[setting.id] ?? getSettingDefaultValue(setting),
          );

          if (normalizedValue === null) {
            throw new Error("Invalid feature configuration value");
          }

          return [setting.id, normalizedValue];
        }),
      ),
    };
  }

  return normalized;
};

const toConfigEntries = (feature: CatalogFeature, state: FeatureConfigState): FeatureConfigEntry[] =>
  (feature.configuration ?? []).map((setting) => ({
    id: setting.id,
    value: state[feature.id]?.settings[setting.id] ?? getSettingDefaultValue(setting),
  }));

const buildInsertValues = (
  state: FeatureConfigState,
  homePagePath: string | null,
  modifyingUser: string,
): FeatureConfigInsert => {
  const values: FeatureConfigInsert = { modifyingUser, homePagePath };

  for (const feature of catalog.features) {
    if (!isFeatureId(feature.id)) {
      continue;
    }

    const columns = featureColumns[feature.id];
    Object.assign(values, {
      [columns.enabled]: state[feature.id]?.enabled ?? false,
      [columns.config]: toConfigEntries(feature, state),
    });
  }

  return values;
};

export const getLatestFeatureConfig = async (): Promise<LoadedFeatureConfig> => {
  await requireAdminAccess();

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
      state: null,
      homePagePath: null,
      timestamp: null,
      modifyingUsername: null,
    };
  }

  return {
    state: buildStateFromRow(row.config),
    homePagePath: normalizeHomePagePath(row.config.homePagePath),
    timestamp: row.config.timestamp.toISOString(),
    modifyingUsername: row.username,
  };
};

export const saveFeatureConfig = async (
  lang: unknown,
  state: unknown,
  homePagePath: unknown,
): Promise<SaveFeatureConfigResult> => {
  await requireAdminAccess();

  if (typeof lang !== "string" || !hasLocale(lang)) {
    return { status: "error" };
  }

  let normalizedState: FeatureConfigState | null;

  try {
    normalizedState = normalizeFeatureState(state);
  } catch {
    return { status: "error" };
  }

  if (!normalizedState) {
    return { status: "error" };
  }

  const currentUser = await getCurrentUserRecord();

  if (!currentUser?.admin) {
    return { status: "error" };
  }

  const insertedRows = await db
    .insert(featureConfig)
    .values(buildInsertValues(normalizedState, normalizeHomePagePath(homePagePath), currentUser.id))
    .returning();

  const inserted = insertedRows[0];

  if (!inserted) {
    return { status: "error" };
  }

  revalidatePath(`/${lang}/admin/feature-config`);
  revalidatePath(`/${lang}`);
  revalidatePath(`/${lang}/cooperative-progress`);

  return {
    status: "success",
    entry: {
      state: buildStateFromRow(inserted),
      homePagePath: normalizeHomePagePath(inserted.homePagePath),
      timestamp: inserted.timestamp.toISOString(),
      modifyingUsername: currentUser.username,
    },
  };
};
