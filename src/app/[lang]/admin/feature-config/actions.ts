"use server";

import { revalidatePath } from "next/cache";
import { asc, desc, eq, inArray } from "drizzle-orm";

import { requireAdminAccess } from "@/app/[lang]/admin/actions";
import featureConfiguration from "@/config/feature-configuration.json";
import { featureConfig, performanceMetrics, type FeatureConfigEntry, type FeatureConfigValue, users } from "@/db/schema";
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

export type FeatureConfigPerformanceMetric = {
  id: string;
  shortName: string;
  type: number;
  enumPossibilities: string | null;
};

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
  type:
    | "checkbox"
    | "date"
    | "decimal"
    | "number"
    | "performance-metric-select"
    | "select"
    | "string"
    | "streak-valid-values"
    | "switch";
  defaultValue?: FeatureConfigValue;
  min?: number;
  step?: number;
  options?: Array<{ value: string }>;
  dependsOnSettingId?: string;
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

  if (setting.type === "streak-valid-values") {
    return [];
  }

  if (setting.type === "select") {
    return setting.options?.[0]?.value ?? "";
  }

  return "";
};

const isFeatureId = (featureId: string): featureId is FeatureId => featureId in featureColumns;

const splitEnumPossibilities = (value: string | null | undefined) =>
  (value ?? "")
    .split(";")
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "");

const loadFeatureConfigPerformanceMetrics = async (
  ids?: string[],
): Promise<FeatureConfigPerformanceMetric[]> => {
  const query = db
    .select({
      id: performanceMetrics.id,
      shortName: performanceMetrics.shortName,
      type: performanceMetrics.type,
      enumPossibilities: performanceMetrics.enumPossibilities,
    })
    .from(performanceMetrics);

  if (ids !== undefined) {
    if (ids.length === 0) {
      return [];
    }

    return query.where(inArray(performanceMetrics.id, ids)).orderBy(asc(performanceMetrics.shortName));
  }

  return query.orderBy(asc(performanceMetrics.shortName));
};

const normalizeSettingValue = (
  setting: CatalogSetting,
  value: unknown,
  normalizedSettings: Record<string, FeatureConfigValue>,
  performanceMetricsById: Map<string, FeatureConfigPerformanceMetric>,
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

  if (setting.type === "performance-metric-select") {
    if (typeof value !== "string" || !performanceMetricsById.has(value)) {
      return null;
    }

    return value;
  }

  if (setting.type === "streak-valid-values") {
    const metricId = setting.dependsOnSettingId
      ? normalizedSettings[setting.dependsOnSettingId]
      : undefined;
    const metric = typeof metricId === "string" ? performanceMetricsById.get(metricId) : undefined;

    if (!metric) {
      return null;
    }

    if (metric.type === 1) {
      const parsed = typeof value === "number" ? value : Number(value);

      if (!Number.isInteger(parsed) || parsed < (setting.min ?? 0)) {
        return null;
      }

      return parsed;
    }

    if (metric.type === 0) {
      if (!Array.isArray(value)) {
        return null;
      }

      const possibilities = splitEnumPossibilities(metric.enumPossibilities);
      const normalizedValues = value.map((entry) => Number(entry));
      const uniqueValues = Array.from(new Set(normalizedValues));

      if (
        uniqueValues.length === 0 ||
        uniqueValues.some(
          (entry) => !Number.isInteger(entry) || entry < 0 || entry >= possibilities.length,
        )
      ) {
        return null;
      }

      return uniqueValues;
    }

    return null;
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

const normalizeFeatureState = async (value: unknown): Promise<FeatureConfigState | null> => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const payload = value as Record<string, unknown>;
  const normalized: FeatureConfigState = {};
  const performanceMetricIds = catalog.features.flatMap((feature) => {
    const payloadFeature = payload[feature.id];

    if (!payloadFeature || typeof payloadFeature !== "object") {
      return [];
    }

    const settingsRecord =
      "settings" in payloadFeature && payloadFeature.settings && typeof payloadFeature.settings === "object"
        ? (payloadFeature.settings as Record<string, unknown>)
        : {};

    return (feature.configuration ?? [])
      .filter((setting) => setting.type === "performance-metric-select")
      .map((setting) => settingsRecord[setting.id])
      .filter((settingValue): settingValue is string => typeof settingValue === "string");
  });
  const performanceMetricsById = new Map(
    (await loadFeatureConfigPerformanceMetrics(performanceMetricIds)).map((metric) => [metric.id, metric]),
  );

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

    const normalizedSettings: Record<string, FeatureConfigValue> = {};

    for (const setting of feature.configuration ?? []) {
      const normalizedValue = normalizeSettingValue(
        setting,
        settingsRecord[setting.id] ?? getSettingDefaultValue(setting),
        normalizedSettings,
        performanceMetricsById,
      );

      if (normalizedValue === null) {
        throw new Error("Invalid feature configuration value");
      }

      normalizedSettings[setting.id] = normalizedValue;
    }

    normalized[feature.id] = {
      enabled: featureRecord.enabled,
      settings: normalizedSettings,
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

export const getFeatureConfigPerformanceMetrics = async (): Promise<FeatureConfigPerformanceMetric[]> => {
  await requireAdminAccess();

  return loadFeatureConfigPerformanceMetrics();
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
    normalizedState = await normalizeFeatureState(state);
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
