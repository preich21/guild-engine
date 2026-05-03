import "server-only";

import { and, asc, desc, eq, isNull, lte } from "drizzle-orm";

import {
  getLeaderboard,
  getTeamLeaderboard,
  type LeaderboardEntry,
  type TeamLeaderboardEntry,
} from "@/app/[lang]/leaderboard/actions";
import {
  achievements,
  guildMeetings,
  performanceMetrics,
  trackedContributions,
  userAchievements,
} from "@/db/schema";
import type { TrackedContributionDataEntry } from "@/db/schema";
import type { AchievementCriteria } from "@/lib/achievements";
import {
  compareAchievementValue,
  qualifiesForDefinedAchievement,
  type GuildMeetingForAchievementEvaluation,
  type UserSubmissionForAchievementEvaluation,
} from "@/lib/achievement-evaluation-core";
import { db } from "@/lib/db";
import { parseNonNegativeInteger } from "@/lib/point-calculation";

type AchievementCandidate = {
  id: string;
  title: string;
  criteria: AchievementCriteria;
};

type CurrentUserForAchievementEvaluation = {
  id: string;
  teamId: string;
};

type PerformanceMetricForAchievementEvaluation = {
  id: string;
  shortName: string;
  type: number;
};

type TrackedContributionForAchievementEvaluation = {
  guildMeetingId: string;
  guildMeetingTimestamp: Date;
  data: TrackedContributionDataEntry[];
};

const parseTrackedContributionData = (value: unknown): TrackedContributionDataEntry[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") {
      return [];
    }

    const maybeEntry = entry as Record<string, unknown>;

    return typeof maybeEntry.id === "string"
      ? [{ id: maybeEntry.id, value: parseNonNegativeInteger(maybeEntry.value) ?? 0 }]
      : [];
  });
};

const loadUnearnedAchievements = async (userId: string): Promise<AchievementCandidate[]> =>
  db
    .select({
      id: achievements.id,
      title: achievements.title,
      criteria: achievements.criteria,
    })
    .from(achievements)
    .leftJoin(
      userAchievements,
      and(
        eq(userAchievements.userId, userId),
        eq(userAchievements.achievementId, achievements.id),
      ),
    )
    .where(isNull(userAchievements.id))
    .orderBy(achievements.title, achievements.id);


const loadPastGuildMeetings = async (): Promise<GuildMeetingForAchievementEvaluation[]> =>
  db
    .select({
      id: guildMeetings.id,
      timestamp: guildMeetings.timestamp,
    })
    .from(guildMeetings)
    .where(lte(guildMeetings.timestamp, new Date()))
    .orderBy(desc(guildMeetings.timestamp), desc(guildMeetings.id));

const loadPerformanceMetricsForAchievementEvaluation = async (): Promise<
  PerformanceMetricForAchievementEvaluation[]
> =>
  db
    .select({
      id: performanceMetrics.id,
      shortName: performanceMetrics.shortName,
      type: performanceMetrics.type,
    })
    .from(performanceMetrics)
    .orderBy(asc(performanceMetrics.timestampAdded), asc(performanceMetrics.shortName), asc(performanceMetrics.id));

const toAchievementSubmission = (
  contribution: TrackedContributionForAchievementEvaluation,
  metricsById: ReadonlyMap<string, PerformanceMetricForAchievementEvaluation>,
): UserSubmissionForAchievementEvaluation => {
  const submission: UserSubmissionForAchievementEvaluation = {
    guildMeetingId: contribution.guildMeetingId,
    guildMeetingTimestamp: contribution.guildMeetingTimestamp,
    metricValues: {},
  };

  for (const entry of contribution.data) {
    if (metricsById.has(entry.id)) {
      submission.metricValues[entry.id] = parseNonNegativeInteger(entry.value) ?? 0;
    }
  }

  return submission;
};

const loadAllPastTrackedContributions = async (
  userId: string,
): Promise<UserSubmissionForAchievementEvaluation[]> => {
  const [contributionRows, metricRows] = await Promise.all([
    db
      .select({
        guildMeetingId: trackedContributions.meetingId,
        guildMeetingTimestamp: guildMeetings.timestamp,
        data: trackedContributions.data,
      })
      .from(trackedContributions)
      .innerJoin(guildMeetings, eq(guildMeetings.id, trackedContributions.meetingId))
      .where(
        and(
          eq(trackedContributions.userId, userId),
          lte(guildMeetings.timestamp, new Date()),
        ),
      )
      .orderBy(desc(guildMeetings.timestamp), desc(guildMeetings.id)),
    loadPerformanceMetricsForAchievementEvaluation(),
  ]);

  const metricsById = new Map(metricRows.map((metric) => [metric.id, metric]));

  return contributionRows.map((contribution) =>
    toAchievementSubmission(
      {
        guildMeetingId: contribution.guildMeetingId,
        guildMeetingTimestamp: contribution.guildMeetingTimestamp,
        data: parseTrackedContributionData(contribution.data),
      },
      metricsById,
    ),
  );
};


export const evaluateAchievementsForUser = async (
  user: CurrentUserForAchievementEvaluation,
): Promise<void> => {
  const pendingAchievements = await loadUnearnedAchievements(user.id);

  if (pendingAchievements.length === 0) {
    return;
  }

  let individualLeaderboardPromise: Promise<LeaderboardEntry[]> | null = null;
  let teamLeaderboardPromise: Promise<TeamLeaderboardEntry[]> | null = null;
  let allPastGuildMeetingsPromise: Promise<GuildMeetingForAchievementEvaluation[]> | null = null;
  let allPastSubmissionsPromise: Promise<UserSubmissionForAchievementEvaluation[]> | null = null;

  const qualifyingAchievementIds: string[] = [];

  for (const achievement of pendingAchievements) {
    const { criteria } = achievement;

    if (criteria.mode === "manual") {
      continue;
    }

    if (criteria.mode === "defined") {
      allPastGuildMeetingsPromise ??= loadPastGuildMeetings();
      allPastSubmissionsPromise ??= loadAllPastTrackedContributions(user.id);

      if (
        await qualifiesForDefinedAchievement(
          criteria,
          await allPastGuildMeetingsPromise,
          await allPastSubmissionsPromise,
        )
      ) {
        qualifyingAchievementIds.push(achievement.id);
      }

      continue;
    }

    const targetPosition = criteria.position - 1;

    if (criteria.leaderboard === "individual") {
      individualLeaderboardPromise ??= getLeaderboard();
      const leaderboard = await individualLeaderboardPromise;
      const entryIndex = leaderboard.findIndex((entry) => entry.userId === user.id);

      if (entryIndex >= 0 && compareAchievementValue(entryIndex, criteria.operator, targetPosition)) {
        qualifyingAchievementIds.push(achievement.id);
      }

      continue;
    }

    teamLeaderboardPromise ??= getTeamLeaderboard();
    const teamLeaderboard = await teamLeaderboardPromise;
    const entryIndex = teamLeaderboard.findIndex((entry) => entry.teamId === user.teamId);

    if (entryIndex >= 0 && compareAchievementValue(entryIndex, criteria.operator, targetPosition)) {
      qualifyingAchievementIds.push(achievement.id);
    }
  }

  if (qualifyingAchievementIds.length === 0) {
    return;
  }

  await db
    .insert(userAchievements)
    .values(
      qualifyingAchievementIds.map((achievementId) => ({
        userId: user.id,
        achievementId,
        timestamp: new Date(),
      })),
    )
    .onConflictDoNothing({
      target: [userAchievements.userId, userAchievements.achievementId],
    });
};
