import {
  isAchievementTimeFrame,
  parseAchievementDateKey,
  parseAchievementDuration,
  type AchievementCriteria,
  type AchievementOperator,
  type AchievementParsedDuration,
} from "@/lib/achievements";
import { rankLeaderboardEntries } from "@/lib/leaderboard-ranking";

export type UserSubmissionForAchievementEvaluation = {
  guildMeetingId: string;
  guildMeetingTimestamp: Date;
  metricValues: Record<string, number>;
};

export type GuildMeetingForAchievementEvaluation = {
  id: string;
  timestamp: Date;
};

type AchievementTimeFrameRange = {
  start: Date;
  endExclusive: Date;
};

export const compareAchievementValue = (
  value: number,
  operator: AchievementOperator,
  target: number,
): boolean => {
  switch (operator) {
    case "<":
      return value < target;
    case "<=":
      return value <= target;
    case "==":
      return value === target;
    case ">=":
      return value >= target;
    case ">":
      return value > target;
  }
};

export const qualifiesForFeatureAchievementValue = (
  criteria: Extract<AchievementCriteria, { mode: "feature" }>,
  value: number | null,
): boolean => {
  if (value === null) {
    return false;
  }

  switch (criteria.feature) {
    case "points":
      return value > criteria.value;
    case "individual-leaderboard-position":
    case "team-leaderboard-position":
      return value <= criteria.value;
    case "level":
    case "achievements-count":
    case "powerup-usage":
      return value >= criteria.value;
  }
};

export const hasAchievementTimeFrameStarted = (
  criteria: AchievementCriteria,
  now: Date = new Date(),
): boolean => {
  if (criteria.mode !== "defined" && criteria.mode !== "feature") {
    return true;
  }

  if (!isAchievementTimeFrame(criteria.timeFrame)) {
    return true;
  }

  const fromDate = parseAchievementDateKey(criteria.timeFrame.from);

  return fromDate === null || fromDate <= now;
};

export const getPositivePointLeaderboardPosition = <Entry extends { totalPoints: number }>(
  entries: Entry[],
  matchesEntry: (entry: Entry) => boolean,
): number | null =>
  rankLeaderboardEntries(entries.filter((entry) => entry.totalPoints > 0))
    .find(matchesEntry)?.rank ?? null;

const subtractAchievementDuration = (
  referenceDate: Date,
  duration: AchievementParsedDuration,
): Date => {
  const result = new Date(referenceDate);

  if (duration.years) {
    result.setFullYear(result.getFullYear() - duration.years);
  }

  if (duration.months) {
    result.setMonth(result.getMonth() - duration.months);
  }

  if (duration.weeks) {
    result.setDate(result.getDate() - duration.weeks * 7);
  }

  if (duration.days) {
    result.setDate(result.getDate() - duration.days);
  }

  if (duration.hours) {
    result.setHours(result.getHours() - duration.hours);
  }

  return result;
};

const getAchievementTimeFrameRange = (
  timeFrame: Extract<AchievementCriteria, { mode: "defined" }>["timeFrame"],
  referenceDate: Date,
): AchievementTimeFrameRange | null => {
  if (isAchievementTimeFrame(timeFrame)) {
    const start = parseAchievementDateKey(timeFrame.from);
    const end = parseAchievementDateKey(timeFrame.to);

    if (!start || !end) {
      return null;
    }

    return {
      start,
      endExclusive: new Date(end.getTime() + 24 * 60 * 60 * 1000),
    };
  }

  if (!timeFrame) {
    return null;
  }

  const parsedDuration = parseAchievementDuration(timeFrame);

  return parsedDuration
    ? {
        start: subtractAchievementDuration(referenceDate, parsedDuration),
        endExclusive: new Date(referenceDate.getTime() + 1),
      }
    : null;
};

export const submissionMatchesCriteriaMetric = (
  submission: UserSubmissionForAchievementEvaluation,
  criteria: Extract<AchievementCriteria, { mode: "defined" }>,
): boolean => {
  if (!Object.prototype.hasOwnProperty.call(submission.metricValues, criteria.metric)) {
    return false;
  }

  const value = submission.metricValues[criteria.metric] ?? 0;

  if (Array.isArray(criteria.validValues)) {
    return criteria.validValues.includes(value);
  }

  return value >= criteria.validValues;
};

const filterGuildMeetingsWithinTimeFrame = (
  meetings: GuildMeetingForAchievementEvaluation[],
  timeFrame: Extract<AchievementCriteria, { mode: "defined" }>["timeFrame"],
  now: Date,
) => {
  const timeFrameRange = getAchievementTimeFrameRange(timeFrame, now);

  return meetings.filter((meeting) => {
    if (meeting.timestamp > now) {
      return false;
    }

    if (!timeFrameRange) {
      return true;
    }

    return meeting.timestamp >= timeFrameRange.start && meeting.timestamp < timeFrameRange.endExclusive;
  });
};

export const filterSubmissionsWithinTimeFrame = (
  submissions: UserSubmissionForAchievementEvaluation[],
  timeFrame: Extract<AchievementCriteria, { mode: "defined" }>["timeFrame"],
  now: Date,
) => {
  const timeFrameRange = getAchievementTimeFrameRange(timeFrame, now);

  return submissions.filter((submission) => {
    if (submission.guildMeetingTimestamp > now) {
      return false;
    }

    if (!timeFrameRange) {
      return true;
    }

    return (
      submission.guildMeetingTimestamp >= timeFrameRange.start &&
      submission.guildMeetingTimestamp < timeFrameRange.endExclusive
    );
  });
};

export const qualifiesForDefinedAchievement = async (
  criteria: Extract<AchievementCriteria, { mode: "defined" }>,
  allPastGuildMeetings: GuildMeetingForAchievementEvaluation[],
  allPastSubmissions: UserSubmissionForAchievementEvaluation[],
  now: Date = new Date(),
): Promise<boolean> => {
  if (criteria.type === "streak") {
    const relevantMeetings = filterGuildMeetingsWithinTimeFrame(allPastGuildMeetings, criteria.timeFrame, now);
    const recentGuildMeetings = relevantMeetings.slice(0, criteria.count + 1);
    const latestGuildMeeting = recentGuildMeetings[0];
    const submissionsByMeetingId = new Map(
      allPastSubmissions.map((submission) => [submission.guildMeetingId, submission]),
    );

    let relevantGuildMeetings = recentGuildMeetings;

    if (latestGuildMeeting && latestGuildMeeting.timestamp >= new Date(now.getTime() - 72 * 60 * 60 * 1000)) {
      const latestMeetingSubmission = submissionsByMeetingId.get(latestGuildMeeting.id);

      if (!latestMeetingSubmission) {
        relevantGuildMeetings = recentGuildMeetings.slice(1);
      }
    }

    const targetGuildMeetings = relevantGuildMeetings.slice(0, criteria.count);

    if (targetGuildMeetings.length !== criteria.count) {
      return false;
    }

    return targetGuildMeetings.every((guildMeeting) => {
      const submission = submissionsByMeetingId.get(guildMeeting.id);

      if (!submission) {
        return false;
      }

      return submissionMatchesCriteriaMetric(submission, criteria);
    });
  }

  const relevantSubmissions = filterSubmissionsWithinTimeFrame(allPastSubmissions, criteria.timeFrame, now);
  const metricTotal = relevantSubmissions.reduce(
    (total, submission) => total + (submissionMatchesCriteriaMetric(submission, criteria) ? 1 : 0),
    0,
  );

  return compareAchievementValue(metricTotal, criteria.operator, criteria.count);
};
