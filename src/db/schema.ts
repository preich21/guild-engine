import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import type { AchievementCriteria } from "@/lib/achievements";

export type FeatureConfigValue = boolean | number | string | number[];

export type FeatureConfigEntry = {
  id: string;
  value: FeatureConfigValue;
};

export type RolePresentPowerupSettings = {
  receivingUserId: string;
  comment: string;
  anonymous: boolean;
};

export type PowerupUtilizationSettings = RolePresentPowerupSettings | null;

export type TrackedContributionDataEntry = {
  id: string;
  value: number;
};

export const NO_TEAM_ASSIGNED_TEAM_ID = "00000000-0000-0000-0000-000000000001";

export const teams = pgTable("team", {
  id: uuid("id").notNull().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().notNull().primaryKey(),
    username: varchar("username", { length: 255 }).notNull(),
    profilePicture: varchar("profile_picture", { length: 65535 }),
    description: varchar("description", { length: 1023 }),
    admin: boolean("admin").notNull().default(false),
    preferredLang: varchar("preferred_lang", { length: 3 }),
    teamId: uuid("team_id")
      .notNull()
      .default(NO_TEAM_ASSIGNED_TEAM_ID)
      .references(() => teams.id),
  },
  (table) => [index("users_team_id_idx").on(table.teamId)],
);

export const guildMeetings = pgTable(
  "guild_meetings",
  {
    id: uuid("id").defaultRandom().notNull().primaryKey(),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
  },
  (table) => [index("guild_meetings_timestamp_idx").on(table.timestamp)],
);

export const achievements = pgTable("achievements", {
  id: uuid("id").defaultRandom().notNull().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  image: varchar("image", { length: 65535 }).notNull(),
  criteria: jsonb("criteria").$type<AchievementCriteria>().notNull(),
});

export const performanceMetrics = pgTable("performance_metrics", {
  id: uuid("id").defaultRandom().notNull().primaryKey(),
  shortName: varchar("short_name", { length: 255 }).notNull(),
  question: varchar("question", { length: 255 }).notNull(),
  type: smallint("type").notNull().default(0),
  enumPossibilities: varchar("enum_possibilities", { length: 511 }),
  points: varchar("points", { length: 255 }),
  timestampAdded: timestamp("timestamp_added", { withTimezone: true }).notNull().defaultNow(),
});

export const rules = pgTable(
  "rules",
  {
    id: uuid("id").defaultRandom().notNull().primaryKey(),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
    languageCode: varchar("language_code", { length: 3 }).notNull(),
    content: text("content"),
  },
  (table) => [index("rules_language_code_timestamp_idx").on(table.languageCode, table.timestamp)],
);

export const featureConfig = pgTable(
  "feature_config",
  {
    id: uuid("id").defaultRandom().notNull().primaryKey(),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
    modifyingUser: uuid("modifying_user")
      .references(() => users.id, { onDelete: "set null" }),
    pointSystemEnabled: boolean("point_system_enabled").notNull().default(false),
    pointSystemConfig: jsonb("point_system_config").$type<FeatureConfigEntry[]>().notNull().default([]),
    individualLeaderboardEnabled: boolean("individual_leaderboard_enabled").notNull().default(false),
    individualLeaderboardConfig: jsonb("individual_leaderboard_config")
      .$type<FeatureConfigEntry[]>()
      .notNull()
      .default([]),
    teamLeaderboardEnabled: boolean("team_leaderboard_enabled").notNull().default(false),
    teamLeaderboardConfig: jsonb("team_leaderboard_config").$type<FeatureConfigEntry[]>().notNull().default([]),
    levelSystemEnabled: boolean("level_system_enabled").notNull().default(false),
    levelSystemConfig: jsonb("level_system_config").$type<FeatureConfigEntry[]>().notNull().default([]),
    badgesEnabled: boolean("badges_enabled").notNull().default(false),
    badgesConfig: jsonb("badges_config").$type<FeatureConfigEntry[]>().notNull().default([]),
    cooperativeProgressBarEnabled: boolean("cooperative_progress_bar_enabled").notNull().default(false),
    cooperativeProgressBarConfig: jsonb("cooperative_progress_bar_config")
      .$type<FeatureConfigEntry[]>()
      .notNull()
      .default([]),
    questsEnabled: boolean("quests_enabled").notNull().default(false),
    questsConfig: jsonb("quests_config").$type<FeatureConfigEntry[]>().notNull().default([]),
    streaksEnabled: boolean("streaks_enabled").notNull().default(false),
    streaksConfig: jsonb("streaks_config").$type<FeatureConfigEntry[]>().notNull().default([]),
    minigamesEnabled: boolean("minigames_enabled").notNull().default(false),
    minigamesConfig: jsonb("minigames_config").$type<FeatureConfigEntry[]>().notNull().default([]),
    powerupsEnabled: boolean("powerups_enabled").notNull().default(false),
    powerupsConfig: jsonb("powerups_config").$type<FeatureConfigEntry[]>().notNull().default([]),
    homePagePath: varchar("home_page_path", { length: 1023 }),
  },
  (table) => [
    index("feature_config_timestamp_idx").on(table.timestamp),
    index("feature_config_modifying_user_idx").on(table.modifyingUser),
  ],
);

export const userAchievements = pgTable(
  "user_achievements",
  {
    id: uuid("id").defaultRandom().notNull().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    achievementId: uuid("achievement_id")
      .notNull()
      .references(() => achievements.id, { onDelete: "cascade" }),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("user_achievements_user_id_idx").on(table.userId),
    index("user_achievements_achievement_id_idx").on(table.achievementId),
    uniqueIndex("user_achievements_user_achievement_idx").on(table.userId, table.achievementId),
  ],
);

export const userLevels = pgTable("user_levels", {
  userId: uuid("user_id")
    .notNull()
    .primaryKey()
    .references(() => users.id),
  currentLevel: integer("current_level").notNull().default(0),
  lastLevelUp: timestamp("last_level_up", { withTimezone: true }).notNull().defaultNow(),
});

export const userPowerups = pgTable("user_powerups", {
  userId: uuid("user_id")
    .notNull()
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  lootboxes: smallint("lootboxes").notNull().default(0),
  smallPointMultiplicators: smallint("small_point_multiplicators").notNull().default(0),
  mediumPointMultiplicators: smallint("medium_point_multiplicators").notNull().default(0),
  largePointMultiplicators: smallint("large_point_multiplicators").notNull().default(0),
  streakFreezes: smallint("streak_freezes").notNull().default(0),
  rolePresents: smallint("role_presents").notNull().default(0),
  roleShields: smallint("role_shields").notNull().default(0),
});

export const powerupUtilization = pgTable(
  "powerup_utilization",
  {
    id: uuid("id").defaultRandom().notNull().primaryKey(),
    meetingId: uuid("meeting_id")
      .notNull()
      .references(() => guildMeetings.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    powerup: varchar("powerup", { length: 255 }).notNull(),
    settings: jsonb("settings").$type<PowerupUtilizationSettings>().default(null),
    usageTimestamp: timestamp("usage_timestamp", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("powerup_utilization_meeting_id_idx").on(table.meetingId),
    index("powerup_utilization_user_id_idx").on(table.userId),
    index("powerup_utilization_user_meeting_usage_idx").on(
      table.userId,
      table.meetingId,
      table.usageTimestamp,
    ),
  ],
);

export const activatedStreakFreezes = pgTable(
  "activated_streak_freezes",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    meetingId: uuid("meeting_id")
      .notNull()
      .references(() => guildMeetings.id, { onDelete: "cascade" }),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.meetingId] }),
    index("activated_streak_freezes_meeting_id_idx").on(table.meetingId),
  ],
);

export const manualPoints = pgTable(
  "manual_points",
  {
    id: uuid("id").defaultRandom().notNull().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    points: smallint("points").notNull(),
    reason: text("reason").notNull(),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("manual_points_user_id_idx").on(table.userId),
    index("manual_points_timestamp_idx").on(table.timestamp),
  ],
);

export const trackedContributions = pgTable(
  "tracked_contributions",
  {
    id: uuid("id").defaultRandom().notNull().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    meetingId: uuid("meeting_id")
      .notNull()
      .references(() => guildMeetings.id, { onDelete: "cascade" }),
    modifiedAt: timestamp("modified_at", { withTimezone: true }).notNull().defaultNow(),
    data: jsonb("data").$type<TrackedContributionDataEntry[]>().notNull().default([]),
  },
  (table) => [
    index("tracked_contributions_user_id_idx").on(table.userId),
    index("tracked_contributions_meeting_id_idx").on(table.meetingId),
    index("tracked_contributions_meeting_user_idx").on(table.meetingId, table.userId),
    uniqueIndex("tracked_contributions_user_meeting_idx").on(table.userId, table.meetingId),
  ],
);
