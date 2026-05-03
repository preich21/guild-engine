import "server-only";

import { and, asc, desc, eq, isNull, lte, sql } from "drizzle-orm";

import {
  getLeaderboard,
  getTeamLeaderboard,
  type LeaderboardEntry,
  type TeamLeaderboardEntry,
} from "@/app/[lang]/leaderboard/actions";
import {
  activatedStreakFreezes,
  achievements,
  guildMeetings,
  performanceMetrics,
  powerupUtilization,
  trackedContributions,
  userAchievements,
} from "@/db/schema";
import type { TrackedContributionDataEntry } from "@/db/schema";
import type { AchievementCriteria } from "@/lib/achievements";
import {
  compareAchievementValue,
  getPositivePointLeaderboardPosition,
  hasAchievementTimeFrameStarted,
  qualifiesForFeatureAchievementValue,
  qualifiesForDefinedAchievement,
  type GuildMeetingForAchievementEvaluation,
  type UserSubmissionForAchievementEvaluation,
} from "@/lib/achievement-evaluation-core";
import { db } from "@/lib/db";
import { getCurrentFeatureConfig } from "@/lib/feature-config-server";
import {
  getAchievementableFeatures,
  getAchievementablePowerups,
} from "@/lib/feature-flags";
import { getUserLevelProgress } from "@/lib/level-system";
import {
  loadUserPointTotals,
  parseNonNegativeInteger,
} from "@/lib/point-calculation";

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

type AchievementFeatureTimeFrameOptions = {
  startDate: string | null;
  endDate: string | null;
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

const getFeatureTimeFrameOptions = (
  criteria: Extract<AchievementCriteria, { mode: "feature" }>,
): AchievementFeatureTimeFrameOptions => ({
  startDate: criteria.timeFrame?.from ?? null,
  endDate: criteria.timeFrame?.to ?? null,
});

const loadUserPointsForFeatureAchievement = async (
  userId: string,
  criteria: Extract<AchievementCriteria, { mode: "feature" }>,
) => {
  const totals = await loadUserPointTotals({
    userIds: [userId],
    ...getFeatureTimeFrameOptions(criteria),
  });

  return totals[0]?.totalPoints ?? 0;
};

const loadIndividualLeaderboardPositionForFeatureAchievement = async (
  userId: string,
  criteria: Extract<AchievementCriteria, { mode: "feature" }>,
) => {
  const { startDate, endDate } = getFeatureTimeFrameOptions(criteria);
  const leaderboard = await getLeaderboard({
    startDate,
    endDate,
  });

  return getPositivePointLeaderboardPosition(leaderboard, (entry) => entry.userId === userId);
};

const loadTeamLeaderboardPositionForFeatureAchievement = async (
  teamId: string,
  criteria: Extract<AchievementCriteria, { mode: "feature" }>,
) => {
  const { startDate, endDate } = getFeatureTimeFrameOptions(criteria);
  const leaderboard = await getTeamLeaderboard({
    "start-date": startDate,
    "end-date": endDate,
  });

  return getPositivePointLeaderboardPosition(leaderboard, (entry) => entry.teamId === teamId);
};

const loadAchievementCountForFeatureAchievement = async (
  userId: string,
  criteria: Extract<AchievementCriteria, { mode: "feature" }>,
) => {
  const { startDate, endDate } = getFeatureTimeFrameOptions(criteria);
  const startCondition =
    startDate === null ? sql`` : sql`and ${userAchievements.timestamp}::date >= ${startDate}::date`;
  const endCondition =
    endDate === null ? sql`` : sql`and ${userAchievements.timestamp}::date <= ${endDate}::date`;
  const result = await db.execute<{ count: number | string }>(sql`
    select count(*)::integer as count
    from ${userAchievements}
    where ${userAchievements.userId} = ${userId}
      ${startCondition}
      ${endCondition}
  `);

  return Number(result.rows[0]?.count ?? 0);
};

const loadPowerupUsageForFeatureAchievement = async (
  userId: string,
  criteria: Extract<AchievementCriteria, { mode: "feature" }>,
) => {
  if (!criteria.powerup) {
    return null;
  }

  const { startDate, endDate } = getFeatureTimeFrameOptions(criteria);

  if (criteria.powerup === "streak-freeze") {
    const startCondition =
      startDate === null ? sql`` : sql`and ${activatedStreakFreezes.timestamp}::date >= ${startDate}::date`;
    const endCondition =
      endDate === null ? sql`` : sql`and ${activatedStreakFreezes.timestamp}::date <= ${endDate}::date`;
    const result = await db.execute<{ count: number | string }>(sql`
      select count(*)::integer as count
      from ${activatedStreakFreezes}
      where ${activatedStreakFreezes.userId} = ${userId}
        ${startCondition}
        ${endCondition}
    `);

    return Number(result.rows[0]?.count ?? 0);
  }

  const startCondition =
    startDate === null ? sql`` : sql`and ${powerupUtilization.usageTimestamp}::date >= ${startDate}::date`;
  const endCondition =
    endDate === null ? sql`` : sql`and ${powerupUtilization.usageTimestamp}::date <= ${endDate}::date`;
  const result = await db.execute<{ count: number | string }>(sql`
    select count(*)::integer as count
    from ${powerupUtilization}
    where ${powerupUtilization.userId} = ${userId}
      and ${powerupUtilization.powerup} = ${criteria.powerup}
      ${startCondition}
      ${endCondition}
  `);

  return Number(result.rows[0]?.count ?? 0);
};

const loadFeatureAchievementValue = async (
  user: CurrentUserForAchievementEvaluation,
  criteria: Extract<AchievementCriteria, { mode: "feature" }>,
) => {
  switch (criteria.feature) {
    case "points":
      return loadUserPointsForFeatureAchievement(user.id, criteria);
    case "individual-leaderboard-position":
      return loadIndividualLeaderboardPositionForFeatureAchievement(user.id, criteria);
    case "team-leaderboard-position":
      return loadTeamLeaderboardPositionForFeatureAchievement(user.teamId, criteria);
    case "level":
      return (await getUserLevelProgress(user.id))?.currentLevel ?? 0;
    case "achievements-count":
      return loadAchievementCountForFeatureAchievement(user.id, criteria);
    case "powerup-usage":
      return loadPowerupUsageForFeatureAchievement(user.id, criteria);
  }
};

const isFeatureAchievementCurrentlyAvailable = async (
  criteria: Extract<AchievementCriteria, { mode: "feature" }>,
) => {
  const featureConfig = await getCurrentFeatureConfig();
  const availableFeatures = getAchievementableFeatures(featureConfig.state).map((feature) => feature.type);

  if (!availableFeatures.includes(criteria.feature)) {
    return false;
  }

  if (criteria.feature !== "powerup-usage") {
    return true;
  }

  const availablePowerups = getAchievementablePowerups(featureConfig.state).map((powerup) => powerup.id);

  return typeof criteria.powerup === "string" && availablePowerups.includes(criteria.powerup);
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

    if (!hasAchievementTimeFrameStarted(criteria)) {
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

    if (criteria.mode === "feature") {
      if (
        (await isFeatureAchievementCurrentlyAvailable(criteria)) &&
        qualifiesForFeatureAchievementValue(
          criteria,
          await loadFeatureAchievementValue(user, criteria),
        )
      ) {
        qualifyingAchievementIds.push(achievement.id);
      }

      continue;
    }

    const targetPosition = criteria.position - 1;

    if (criteria.leaderboard === "individual") {
      individualLeaderboardPromise ??= getLeaderboard();
      const leaderboard = (await individualLeaderboardPromise).filter((entry) => entry.totalPoints > 0);
      const entryIndex = leaderboard.findIndex((entry) => entry.userId === user.id);

      if (entryIndex >= 0 && compareAchievementValue(entryIndex, criteria.operator, targetPosition)) {
        qualifyingAchievementIds.push(achievement.id);
      }

      continue;
    }

    teamLeaderboardPromise ??= getTeamLeaderboard();
    const teamLeaderboard = (await teamLeaderboardPromise).filter((entry) => entry.totalPoints > 0);
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
