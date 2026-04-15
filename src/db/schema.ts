import { boolean, check, pgTable, smallint, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const NO_TEAM_ASSIGNED_TEAM_ID = "00000000-0000-0000-0000-000000000001";

export const teams = pgTable("team", {
  id: uuid("id").notNull().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
});

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().notNull().primaryKey(),
  username: varchar("username", { length: 255 }).notNull(),
  profilePicture: varchar("profile_picture", { length: 65535 }),
  teamId: uuid("team_id")
    .notNull()
    .default(NO_TEAM_ASSIGNED_TEAM_ID)
    .references(() => teams.id),
});

export const pointDistribution = pgTable("point_distribution", {
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
});

export const guildMeetings = pgTable("guild_meetings", {
  id: uuid("id").defaultRandom().notNull().primaryKey(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
});

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
  check("user_point_submissions_attendance_range", sql`${table.attendance} between 0 and 2`),
  check("user_point_submissions_protocol_range", sql`${table.protocol} between 0 and 2`),
  check("user_point_submissions_twl_range", sql`${table.twl} between 0 and 99`),
  check(
	"user_point_submissions_presentations_range",
	sql`${table.presentations} between 0 and 99`,
  ),
  ],
);

