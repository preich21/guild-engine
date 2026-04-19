import {
  isAchievementTimeFrame,
  parseAchievementDateKey,
  parseAchievementDuration,
  type AchievementCriteria,
  type AchievementMetric,
  type AchievementOperator,
  type AchievementParsedDuration,
} from "@/lib/achievements";

export type UserSubmissionForAchievementEvaluation = {
  guildMeetingId: string;
  guildMeetingTimestamp: Date;
  attendance: number;
  protocol: number;
  moderation: boolean;
  workingGroup: boolean;
  twl: number;
  presentations: number;
  points: number;
};

export type GuildMeetingForAchievementEvaluation = {
  id: string;
  timestamp: Date;
};

export type PointDistributionForAchievementEvaluation = {
  activeFrom: Date;
  attendanceVirtual: number;
  attendanceOnSite: number;
  protocolForced: number;
  protocolVoluntarily: number;
  moderation: number;
  workingGroup: number;
  twl: number;
  presentation: number;
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

export const calculateSubmissionPoints = (
  submission: Pick<
    UserSubmissionForAchievementEvaluation,
    "attendance" | "protocol" | "moderation" | "workingGroup" | "twl" | "presentations"
  >,
  distribution: PointDistributionForAchievementEvaluation | null,
): number => {
  if (!distribution) {
    return 0;
  }

  return (
    (submission.attendance === 1
      ? distribution.attendanceVirtual
      : submission.attendance === 2
        ? distribution.attendanceOnSite
        : 0) +
    (submission.protocol === 1
      ? distribution.protocolForced
      : submission.protocol === 2
        ? distribution.protocolVoluntarily
        : 0) +
    (submission.moderation ? distribution.moderation : 0) +
    (submission.workingGroup ? distribution.workingGroup : 0) +
    submission.twl * distribution.twl +
    submission.presentations * distribution.presentation
  );
};

export const getPointDistributionForTimestamp = (
  distributions: PointDistributionForAchievementEvaluation[],
  timestamp: Date,
): PointDistributionForAchievementEvaluation | null =>
  distributions.find((distribution) => distribution.activeFrom <= timestamp) ?? null;

export const submissionMatchesMetric = (
  submission: UserSubmissionForAchievementEvaluation,
  metric: AchievementMetric,
): boolean => {
  switch (metric) {
    case "attendanceAny":
      return submission.attendance !== 0;
    case "attendanceVirtually":
      return submission.attendance === 1;
    case "attendanceOnSite":
      return submission.attendance === 2;
    case "protocolAny":
      return submission.protocol !== 0;
    case "protocolForced":
      return submission.protocol === 1;
    case "protocolVoluntary":
      return submission.protocol === 2;
    case "moderation":
      return submission.moderation;
    case "workingGroup":
      return submission.workingGroup;
    case "twl":
      return submission.twl > 0;
    case "presentations":
      return submission.presentations > 0;
    case "points":
      return submission.points > 0;
  }
};

export const getMetricValue = (
  submission: UserSubmissionForAchievementEvaluation,
  metric: AchievementMetric,
): number => {
  switch (metric) {
    case "points":
      return submission.points;
    case "attendanceAny":
    case "attendanceVirtually":
    case "attendanceOnSite":
    case "protocolAny":
    case "protocolForced":
    case "protocolVoluntary":
    case "moderation":
    case "workingGroup":
      return submissionMatchesMetric(submission, metric) ? 1 : 0;
    case "twl":
      return submission.twl;
    case "presentations":
      return submission.presentations;
  }
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

      if (criteria.metric === "points") {
        return submission.points >= (criteria.minimumPoints ?? criteria.count);
      }

      return submissionMatchesMetric(submission, criteria.metric);
    });
  }

  const relevantSubmissions = filterSubmissionsWithinTimeFrame(allPastSubmissions, criteria.timeFrame, now);
  const metricTotal = relevantSubmissions.reduce(
    (total, submission) => total + getMetricValue(submission, criteria.metric),
    0,
  );

  return compareAchievementValue(metricTotal, criteria.operator, criteria.count);
};
