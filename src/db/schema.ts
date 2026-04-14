import { boolean, check, pgTable, smallint, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().notNull().primaryKey(),
  username: varchar("username", { length: 255 }).notNull(),
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

export const userPointSubmissions = pgTable(
  "user_point_submissions",
  {
  id: uuid("id").defaultRandom().notNull().primaryKey(),
  userId: uuid("user_id")
	.notNull()
	.references(() => users.id),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
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

