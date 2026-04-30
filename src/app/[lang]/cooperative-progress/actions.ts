"use server";

import { getLeaderboard } from "@/app/[lang]/leaderboard/actions";

export type CooperativeProgressConfig = {
  "start-date"?: unknown;
  aggregation?: unknown;
  "goal-points"?: unknown;
};

export type CooperativeProgressContributor = {
  userId: string;
  username: string;
  profilePicture: string | null;
  description: string | null;
  teamId: string;
  totalPoints: number;
  attendanceStreak: {
    count: number;
    hasPendingRecentMeeting: boolean;
  };
  achievements: Array<{
    id: string;
    title: string;
    image: string;
  }>;
};

export type CooperativeProgress = {
  currentPoints: number;
  goalPoints: number;
  progressPercent: number;
  isComplete: boolean;
  aggregation: "average" | "sum";
  contributorsCount: number;
  topContributors: CooperativeProgressContributor[];
};

const parseAggregation = (value: unknown): "average" | "sum" =>
  value === "average" ? "average" : "sum";

const parseGoalPoints = (value: unknown) => {
  const numericValue = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numericValue) || numericValue < 1) {
    return 1;
  }

  return Math.ceil(numericValue);
};

export const getCooperativeProgress = async (
  config: CooperativeProgressConfig = {},
): Promise<CooperativeProgress> => {
  const aggregation = parseAggregation(config.aggregation);
  const goalPoints = parseGoalPoints(config["goal-points"]);
  const entries = await getLeaderboard({ startDate: config["start-date"] });
  const contributors = entries.filter((entry) => entry.totalPoints > 0);
  const summedPoints = contributors.reduce((total, entry) => total + entry.totalPoints, 0);
  const currentPoints =
    aggregation === "average" && contributors.length > 0
      ? Math.ceil(summedPoints / contributors.length)
      : summedPoints;
  const progressPercent = Math.min(100, Math.max(0, (currentPoints / goalPoints) * 100));

  return {
    currentPoints,
    goalPoints,
    progressPercent,
    isComplete: currentPoints >= goalPoints,
    aggregation,
    contributorsCount: contributors.length,
    topContributors: contributors.slice(0, 10),
  };
};
