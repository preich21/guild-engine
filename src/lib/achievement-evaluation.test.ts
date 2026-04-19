import assert from "node:assert/strict";
import test from "node:test";

import { type AchievementCriteria } from "@/lib/achievements";
import {
  compareAchievementValue,
  qualifiesForDefinedAchievement,
} from "@/lib/achievement-evaluation-core";

const createMeeting = (id: string, timestamp: string) => ({
  id,
  timestamp: new Date(timestamp),
});

const createSubmission = ({
  guildMeetingId,
  guildMeetingTimestamp,
  attendance = 0,
  protocol = 0,
  moderation = false,
  workingGroup = false,
  twl = 0,
  presentations = 0,
  points = 0,
}: {
  guildMeetingId: string;
  guildMeetingTimestamp: string;
  attendance?: number;
  protocol?: number;
  moderation?: boolean;
  workingGroup?: boolean;
  twl?: number;
  presentations?: number;
  points?: number;
}) => ({
  guildMeetingId,
  guildMeetingTimestamp: new Date(guildMeetingTimestamp),
  attendance,
  protocol,
  moderation,
  workingGroup,
  twl,
  presentations,
  points,
});

test("compareAchievementValue supports all operators", () => {
  assert.equal(compareAchievementValue(2, "<", 3), true);
  assert.equal(compareAchievementValue(3, "<=", 3), true);
  assert.equal(compareAchievementValue(3, "==", 3), true);
  assert.equal(compareAchievementValue(4, ">=", 3), true);
  assert.equal(compareAchievementValue(4, ">", 3), true);
});

test("defined streak ignores a pending latest guild meeting within 72 hours", async () => {
  const criteria: Extract<AchievementCriteria, { mode: "defined" }> = {
    mode: "defined",
    metric: "attendanceAny",
    type: "streak",
    timeFrame: null,
    operator: ">=",
    count: 5,
    minimumPoints: null,
  };
  const now = new Date("2026-04-19T12:00:00.000Z");
  const meetings = [
    createMeeting("m6", "2026-04-18T14:30:00.000Z"),
    createMeeting("m5", "2026-04-11T14:30:00.000Z"),
    createMeeting("m4", "2026-04-04T14:30:00.000Z"),
    createMeeting("m3", "2026-03-28T14:30:00.000Z"),
    createMeeting("m2", "2026-03-21T14:30:00.000Z"),
    createMeeting("m1", "2026-03-14T14:30:00.000Z"),
  ];
  const submissions = [
    createSubmission({ guildMeetingId: "m5", guildMeetingTimestamp: "2026-04-11T14:30:00.000Z", attendance: 2 }),
    createSubmission({ guildMeetingId: "m4", guildMeetingTimestamp: "2026-04-04T14:30:00.000Z", attendance: 2 }),
    createSubmission({ guildMeetingId: "m3", guildMeetingTimestamp: "2026-03-28T14:30:00.000Z", attendance: 1 }),
    createSubmission({ guildMeetingId: "m2", guildMeetingTimestamp: "2026-03-21T14:30:00.000Z", attendance: 2 }),
    createSubmission({ guildMeetingId: "m1", guildMeetingTimestamp: "2026-03-14T14:30:00.000Z", attendance: 1 }),
  ];

  assert.equal(
    await qualifiesForDefinedAchievement(criteria, meetings, submissions, now),
    true,
  );
});

test("defined points streak requires minimumPoints for each guild meeting", async () => {
  const criteria: Extract<AchievementCriteria, { mode: "defined" }> = {
    mode: "defined",
    metric: "points",
    type: "streak",
    timeFrame: null,
    operator: ">=",
    count: 3,
    minimumPoints: 10,
  };
  const meetings = [
    createMeeting("m3", "2026-04-10T14:30:00.000Z"),
    createMeeting("m2", "2026-04-03T14:30:00.000Z"),
    createMeeting("m1", "2026-03-27T14:30:00.000Z"),
  ];
  const qualifyingSubmissions = [
    createSubmission({ guildMeetingId: "m3", guildMeetingTimestamp: "2026-04-10T14:30:00.000Z", points: 12 }),
    createSubmission({ guildMeetingId: "m2", guildMeetingTimestamp: "2026-04-03T14:30:00.000Z", points: 10 }),
    createSubmission({ guildMeetingId: "m1", guildMeetingTimestamp: "2026-03-27T14:30:00.000Z", points: 14 }),
  ];
  const nonQualifyingSubmissions = [
    ...qualifyingSubmissions.slice(0, 2),
    createSubmission({ guildMeetingId: "m1", guildMeetingTimestamp: "2026-03-27T14:30:00.000Z", points: 9 }),
  ];

  assert.equal(
    await qualifiesForDefinedAchievement(
      criteria,
      meetings,
      qualifyingSubmissions,
      new Date("2026-04-19T12:00:00.000Z"),
    ),
    true,
  );
  assert.equal(
    await qualifiesForDefinedAchievement(
      criteria,
      meetings,
      nonQualifyingSubmissions,
      new Date("2026-04-19T12:00:00.000Z"),
    ),
    false,
  );
});

test("defined count aggregates numeric metrics inside the selected timeframe", async () => {
  const criteria: Extract<AchievementCriteria, { mode: "defined" }> = {
    mode: "defined",
    metric: "presentations",
    type: "count",
    timeFrame: {
      from: "2026-01-01",
      to: "2026-04-18",
    },
    operator: ">=",
    count: 5,
    minimumPoints: null,
  };
  const submissions = [
    createSubmission({ guildMeetingId: "m1", guildMeetingTimestamp: "2026-04-10T14:30:00.000Z", presentations: 2 }),
    createSubmission({ guildMeetingId: "m2", guildMeetingTimestamp: "2026-03-10T14:30:00.000Z", presentations: 3 }),
    createSubmission({ guildMeetingId: "m3", guildMeetingTimestamp: "2025-12-10T14:30:00.000Z", presentations: 9 }),
    createSubmission({ guildMeetingId: "m4", guildMeetingTimestamp: "2026-04-25T14:30:00.000Z", presentations: 9 }),
  ];

  assert.equal(
    await qualifiesForDefinedAchievement(
      criteria,
      [],
      submissions,
      new Date("2026-04-19T12:00:00.000Z"),
    ),
    true,
  );
});

test("defined count aggregates boolean metrics as occurrences inside the selected timeframe", async () => {
  const criteria: Extract<AchievementCriteria, { mode: "defined" }> = {
    mode: "defined",
    metric: "moderation",
    type: "count",
    timeFrame: {
      from: "2026-03-01",
      to: "2026-04-18",
    },
    operator: ">=",
    count: 2,
    minimumPoints: null,
  };
  const submissions = [
    createSubmission({ guildMeetingId: "m1", guildMeetingTimestamp: "2026-04-10T14:30:00.000Z", moderation: true }),
    createSubmission({ guildMeetingId: "m2", guildMeetingTimestamp: "2026-04-03T14:30:00.000Z", moderation: true }),
    createSubmission({ guildMeetingId: "m3", guildMeetingTimestamp: "2026-03-20T14:30:00.000Z", moderation: false }),
    createSubmission({ guildMeetingId: "m4", guildMeetingTimestamp: "2026-02-20T14:30:00.000Z", moderation: true }),
  ];

  assert.equal(
    await qualifiesForDefinedAchievement(
      criteria,
      [],
      submissions,
      new Date("2026-04-19T12:00:00.000Z"),
    ),
    true,
  );
});
