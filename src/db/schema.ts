import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { AchievementCriteria } from "@/lib/achievements";

export type FeatureConfigValue = boolean | number | string;

export type FeatureConfigEntry = {
  id: string;
  value: FeatureConfigValue;
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

export const pointDistribution = pgTable(
  "point_distribution",
  {
    id: uuid("id").defaultRandom().notNull().primaryKey(),
    activeFrom: timestamp("active_from", { withTimezone: true }).notNull().defaultNow(),
    attendanceVirtual: smallint("attendance_virtual").notNull(),
    attendanceOnSite: smallint("attendance_on_site").notNull(),
    protocolForced: smallint("protocol_forced").notNull(),
    protocolVoluntarily: smallint("protocol_voluntarily").notNull(),
    moderation: smallint("moderation").notNull(),
    workingGroup: smallint("working_group").notNull(),
    twl: smallint("twl").notNull(),
    presentation: smallint("presentation").notNull(),
  },
  (table) => [index("point_distribution_active_from_idx").on(table.activeFrom)],
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
      .notNull()
      .references(() => users.id),
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
      .references(() => achievements.id),
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

export const manualPoints = pgTable(
  "manual_points",
  {
    id: uuid("id").defaultRandom().notNull().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    points: smallint("points").notNull(),
    reason: text("reason").notNull(),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("manual_points_user_id_idx").on(table.userId),
    index("manual_points_timestamp_idx").on(table.timestamp),
  ],
);

export const userPointSubmissions = pgTable(
  "user_point_submissions",
  {
    id: uuid("id").defaultRandom().notNull().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    modifiedAt: timestamp("modified_at", { withTimezone: true }).notNull().defaultNow(),
    guildMeetingId: uuid("guild_meeting_id").notNull().references(() => guildMeetings.id),
    attendance: smallint("attendance").notNull(),
    protocol: smallint("protocol").notNull(),
    moderation: boolean("moderation").notNull(),
    workingGroup: boolean("working_group").notNull(),
    twl: smallint("twl").notNull(),
    presentations: smallint("presentations").notNull(),
  },
  (table) => [
    index("user_point_submissions_user_id_idx").on(table.userId),
    index("user_point_submissions_guild_meeting_id_idx").on(table.guildMeetingId),
    index("user_point_submissions_user_guild_meeting_idx").on(table.userId, table.guildMeetingId),
    index("user_point_submissions_eval_lookup_idx").on(
      table.userId,
      table.guildMeetingId,
      table.attendance,
      table.protocol,
      table.moderation,
      table.workingGroup,
      table.twl,
      table.presentations,
    ),
    check("user_point_submissions_attendance_range", sql`${table.attendance} between 0 and 2`),
    check("user_point_submissions_protocol_range", sql`${table.protocol} between 0 and 2`),
    check("user_point_submissions_twl_range", sql`${table.twl} between 0 and 99`),
    check(
      "user_point_submissions_presentations_range",
      sql`${table.presentations} between 0 and 99`,
    ),
  ],
);
