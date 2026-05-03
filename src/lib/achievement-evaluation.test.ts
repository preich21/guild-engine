import assert from "node:assert/strict";
import test from "node:test";

import { type AchievementCriteria } from "@/lib/achievements";
import {
  compareAchievementValue,
  getPositivePointLeaderboardPosition,
  hasAchievementTimeFrameStarted,
  qualifiesForFeatureAchievementValue,
  qualifiesForDefinedAchievement,
} from "@/lib/achievement-evaluation-core";

const createMeeting = (id: string, timestamp: string) => ({
  id,
  timestamp: new Date(timestamp),
});

const createSubmission = ({
  guildMeetingId,
  guildMeetingTimestamp,
  metricValues = {},
}: {
  guildMeetingId: string;
  guildMeetingTimestamp: string;
  metricValues?: Record<string, number>;
}) => ({
  guildMeetingId,
  guildMeetingTimestamp: new Date(guildMeetingTimestamp),
  metricValues,
});

const attendanceMetricId = "attendance-metric-id";
const pointsMetricId = "points-metric-id";
const presentationsMetricId = "presentations-metric-id";
const moderationMetricId = "moderation-metric-id";

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
    metric: attendanceMetricId,
    validValues: [1, 2],
    type: "streak",
    timeFrame: null,
    operator: ">=",
    count: 5,
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
    createSubmission({ guildMeetingId: "m5", guildMeetingTimestamp: "2026-04-11T14:30:00.000Z", metricValues: { [attendanceMetricId]: 2 } }),
    createSubmission({ guildMeetingId: "m4", guildMeetingTimestamp: "2026-04-04T14:30:00.000Z", metricValues: { [attendanceMetricId]: 2 } }),
    createSubmission({ guildMeetingId: "m3", guildMeetingTimestamp: "2026-03-28T14:30:00.000Z", metricValues: { [attendanceMetricId]: 1 } }),
    createSubmission({ guildMeetingId: "m2", guildMeetingTimestamp: "2026-03-21T14:30:00.000Z", metricValues: { [attendanceMetricId]: 2 } }),
    createSubmission({ guildMeetingId: "m1", guildMeetingTimestamp: "2026-03-14T14:30:00.000Z", metricValues: { [attendanceMetricId]: 1 } }),
  ];

  assert.equal(
    await qualifiesForDefinedAchievement(criteria, meetings, submissions, now),
    true,
  );
});

test("defined integer streak requires the valid value threshold for each guild meeting", async () => {
  const criteria: Extract<AchievementCriteria, { mode: "defined" }> = {
    mode: "defined",
    metric: pointsMetricId,
    validValues: 10,
    type: "streak",
    timeFrame: null,
    operator: ">=",
    count: 3,
  };
  const meetings = [
    createMeeting("m3", "2026-04-10T14:30:00.000Z"),
    createMeeting("m2", "2026-04-03T14:30:00.000Z"),
    createMeeting("m1", "2026-03-27T14:30:00.000Z"),
  ];
  const qualifyingSubmissions = [
    createSubmission({ guildMeetingId: "m3", guildMeetingTimestamp: "2026-04-10T14:30:00.000Z", metricValues: { [pointsMetricId]: 12 } }),
    createSubmission({ guildMeetingId: "m2", guildMeetingTimestamp: "2026-04-03T14:30:00.000Z", metricValues: { [pointsMetricId]: 10 } }),
    createSubmission({ guildMeetingId: "m1", guildMeetingTimestamp: "2026-03-27T14:30:00.000Z", metricValues: { [pointsMetricId]: 14 } }),
  ];
  const nonQualifyingSubmissions = [
    ...qualifyingSubmissions.slice(0, 2),
    createSubmission({ guildMeetingId: "m1", guildMeetingTimestamp: "2026-03-27T14:30:00.000Z", metricValues: { [pointsMetricId]: 9 } }),
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

test("defined count aggregates integer metric matches inside the selected timeframe", async () => {
  const criteria: Extract<AchievementCriteria, { mode: "defined" }> = {
    mode: "defined",
    metric: presentationsMetricId,
    validValues: 1,
    type: "count",
    timeFrame: {
      from: "2026-01-01",
      to: "2026-04-18",
    },
    operator: ">=",
    count: 2,
  };
  const submissions = [
    createSubmission({ guildMeetingId: "m1", guildMeetingTimestamp: "2026-04-10T14:30:00.000Z", metricValues: { [presentationsMetricId]: 2 } }),
    createSubmission({ guildMeetingId: "m2", guildMeetingTimestamp: "2026-03-10T14:30:00.000Z", metricValues: { [presentationsMetricId]: 3 } }),
    createSubmission({ guildMeetingId: "m3", guildMeetingTimestamp: "2025-12-10T14:30:00.000Z", metricValues: { [presentationsMetricId]: 9 } }),
    createSubmission({ guildMeetingId: "m4", guildMeetingTimestamp: "2026-04-25T14:30:00.000Z", metricValues: { [presentationsMetricId]: 9 } }),
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

test("defined count aggregates enum metric matches inside the selected timeframe", async () => {
  const criteria: Extract<AchievementCriteria, { mode: "defined" }> = {
    mode: "defined",
    metric: moderationMetricId,
    validValues: [1],
    type: "count",
    timeFrame: {
      from: "2026-03-01",
      to: "2026-04-18",
    },
    operator: ">=",
    count: 2,
  };
  const submissions = [
    createSubmission({ guildMeetingId: "m1", guildMeetingTimestamp: "2026-04-10T14:30:00.000Z", metricValues: { [moderationMetricId]: 1 } }),
    createSubmission({ guildMeetingId: "m2", guildMeetingTimestamp: "2026-04-03T14:30:00.000Z", metricValues: { [moderationMetricId]: 1 } }),
    createSubmission({ guildMeetingId: "m3", guildMeetingTimestamp: "2026-03-20T14:30:00.000Z", metricValues: { [moderationMetricId]: 0 } }),
    createSubmission({ guildMeetingId: "m4", guildMeetingTimestamp: "2026-02-20T14:30:00.000Z", metricValues: { [moderationMetricId]: 1 } }),
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

test("feature achievement points require a sum larger than the configured value", () => {
  const criteria: Extract<AchievementCriteria, { mode: "feature" }> = {
    mode: "feature",
    feature: "points",
    value: 100,
    powerup: null,
    timeFrame: null,
  };

  assert.equal(qualifiesForFeatureAchievementValue(criteria, 100), false);
  assert.equal(qualifiesForFeatureAchievementValue(criteria, 101), true);
});

test("feature achievement leaderboard positions require the configured rank or better", () => {
  const individualCriteria: Extract<AchievementCriteria, { mode: "feature" }> = {
    mode: "feature",
    feature: "individual-leaderboard-position",
    value: 3,
    powerup: null,
    timeFrame: null,
  };
  const teamCriteria: Extract<AchievementCriteria, { mode: "feature" }> = {
    ...individualCriteria,
    feature: "team-leaderboard-position",
  };

  assert.equal(qualifiesForFeatureAchievementValue(individualCriteria, 4), false);
  assert.equal(qualifiesForFeatureAchievementValue(individualCriteria, 3), true);
  assert.equal(qualifiesForFeatureAchievementValue(teamCriteria, 1), true);
});

test("feature achievement level, achievement count, and powerup usage require the configured value or more", () => {
  const levelCriteria: Extract<AchievementCriteria, { mode: "feature" }> = {
    mode: "feature",
    feature: "level",
    value: 5,
    powerup: null,
    timeFrame: null,
  };
  const achievementsCriteria: Extract<AchievementCriteria, { mode: "feature" }> = {
    ...levelCriteria,
    feature: "achievements-count",
  };
  const powerupCriteria: Extract<AchievementCriteria, { mode: "feature" }> = {
    ...levelCriteria,
    feature: "powerup-usage",
    powerup: "role-shield",
  };

  assert.equal(qualifiesForFeatureAchievementValue(levelCriteria, 4), false);
  assert.equal(qualifiesForFeatureAchievementValue(levelCriteria, 5), true);
  assert.equal(qualifiesForFeatureAchievementValue(achievementsCriteria, 6), true);
  assert.equal(qualifiesForFeatureAchievementValue(powerupCriteria, 5), true);
  assert.equal(qualifiesForFeatureAchievementValue(powerupCriteria, null), false);
});

test("achievements with a future from date are not evaluated yet", () => {
  const now = new Date("2026-05-03T12:00:00.000Z");
  const futureDefinedCriteria: Extract<AchievementCriteria, { mode: "defined" }> = {
    mode: "defined",
    metric: pointsMetricId,
    validValues: 1,
    type: "count",
    timeFrame: {
      from: "2026-05-04",
      to: "2026-06-01",
    },
    operator: ">=",
    count: 1,
  };
  const startedFeatureCriteria: Extract<AchievementCriteria, { mode: "feature" }> = {
    mode: "feature",
    feature: "points",
    value: 10,
    powerup: null,
    timeFrame: {
      from: "2026-05-03",
      to: "2026-06-01",
    },
  };
  const allTimeFeatureCriteria: Extract<AchievementCriteria, { mode: "feature" }> = {
    ...startedFeatureCriteria,
    timeFrame: null,
  };

  assert.equal(hasAchievementTimeFrameStarted(futureDefinedCriteria, now), false);
  assert.equal(hasAchievementTimeFrameStarted(startedFeatureCriteria, now), true);
  assert.equal(hasAchievementTimeFrameStarted(allTimeFeatureCriteria, now), true);
});

test("leaderboard achievement positions ignore zero point entries", () => {
  const entries = [
    { userId: "zero-a", totalPoints: 0 },
    { userId: "zero-b", totalPoints: 0 },
    { userId: "second", totalPoints: 5 },
    { userId: "first", totalPoints: 10 },
  ].sort((first, second) => second.totalPoints - first.totalPoints);

  assert.equal(
    getPositivePointLeaderboardPosition(entries, (entry) => entry.userId === "zero-a"),
    null,
  );
  assert.equal(
    getPositivePointLeaderboardPosition(entries, (entry) => entry.userId === "first"),
    1,
  );
  assert.equal(
    getPositivePointLeaderboardPosition(entries, (entry) => entry.userId === "second"),
    2,
  );
});
