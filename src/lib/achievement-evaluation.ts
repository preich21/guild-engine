import "server-only";

import { and, desc, eq, isNull, lte } from "drizzle-orm";

import {
  getLeaderboard,
  getTeamLeaderboard,
  type LeaderboardEntry,
  type TeamLeaderboardEntry,
} from "@/app/[lang]/leaderboard/actions";
import { achievements, guildMeetings, pointDistribution, userAchievements, userPointSubmissions } from "@/db/schema";
import type { AchievementCriteria } from "@/lib/achievements";
import {
  calculateSubmissionPoints,
  compareAchievementValue,
  getPointDistributionForTimestamp,
  qualifiesForDefinedAchievement,
  type GuildMeetingForAchievementEvaluation,
  type PointDistributionForAchievementEvaluation,
  type UserSubmissionForAchievementEvaluation,
} from "@/lib/achievement-evaluation-core";
import { db } from "@/lib/db";

type AchievementCandidate = {
  id: string;
  title: string;
  criteria: AchievementCriteria;
};

type CurrentUserForAchievementEvaluation = {
  id: string;
  teamId: string;
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

const loadPointDistributionsForAchievementEvaluation = async (): Promise<
  PointDistributionForAchievementEvaluation[]
> =>
  db
    .select({
      activeFrom: pointDistribution.activeFrom,
      attendanceVirtual: pointDistribution.attendanceVirtual,
      attendanceOnSite: pointDistribution.attendanceOnSite,
      protocolForced: pointDistribution.protocolForced,
      protocolVoluntarily: pointDistribution.protocolVoluntarily,
      moderation: pointDistribution.moderation,
      workingGroup: pointDistribution.workingGroup,
      twl: pointDistribution.twl,
      presentation: pointDistribution.presentation,
    })
    .from(pointDistribution)
    .orderBy(desc(pointDistribution.activeFrom), desc(pointDistribution.id));

const loadAllPastUserSubmissions = async (
  userId: string,
): Promise<UserSubmissionForAchievementEvaluation[]> => {
  const [submissionRows, pointDistributions] = await Promise.all([
    db
      .select({
        guildMeetingId: userPointSubmissions.guildMeetingId,
        guildMeetingTimestamp: guildMeetings.timestamp,
        attendance: userPointSubmissions.attendance,
        protocol: userPointSubmissions.protocol,
        moderation: userPointSubmissions.moderation,
        workingGroup: userPointSubmissions.workingGroup,
        twl: userPointSubmissions.twl,
        presentations: userPointSubmissions.presentations,
      })
      .from(userPointSubmissions)
      .innerJoin(guildMeetings, eq(guildMeetings.id, userPointSubmissions.guildMeetingId))
      .where(
        and(
          eq(userPointSubmissions.userId, userId),
          lte(guildMeetings.timestamp, new Date()),
        ),
      )
      .orderBy(desc(guildMeetings.timestamp), desc(guildMeetings.id)),
    loadPointDistributionsForAchievementEvaluation(),
  ]);

  return submissionRows.map((submission) => ({
    ...submission,
    points: calculateSubmissionPoints(
      submission,
      getPointDistributionForTimestamp(pointDistributions, submission.guildMeetingTimestamp),
    ),
  }));
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
      allPastSubmissionsPromise ??= loadAllPastUserSubmissions(user.id);

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
      })),
    )
    .onConflictDoNothing({
      target: [userAchievements.userId, userAchievements.achievementId],
    });
};
