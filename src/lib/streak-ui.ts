export type StreakDisplayState = "frozen" | "active" | "inactive";

type StreakDisplayInput = {
  count: number;
  hasPendingRecentMeeting: boolean;
  latestMeetingWasStreakFreeze: boolean;
};

export const getStreakDisplayState = ({
  count,
  hasPendingRecentMeeting,
  latestMeetingWasStreakFreeze,
}: StreakDisplayInput): StreakDisplayState => {
  if (latestMeetingWasStreakFreeze) {
    return "frozen";
  }

  if (count > 0 && !hasPendingRecentMeeting) {
    return "active";
  }

  return "inactive";
};

export const getStreakFlameClassName = (state: StreakDisplayState) => {
  switch (state) {
    case "frozen":
      return "size-4 text-sky-400";
    case "active":
      return "size-4 text-orange-500";
    default:
      return "size-4 text-muted-foreground";
  }
};

export const getStreakCardClassName = (state: StreakDisplayState, count: number) => {
  if (state === "frozen" && count > 0) {
    return "bg-gradient-to-br from-sky-200 via-sky-300 to-sky-400 text-sky-950 dark:from-sky-600 dark:via-sky-700 dark:to-sky-800 dark:text-white";
  }

  if (state === "active") {
    return "bg-gradient-to-br from-orange-400 via-orange-500 to-amber-500 text-zinc-950 dark:from-orange-400 dark:via-orange-500 dark:to-amber-500 dark:text-white";
  }

  return "bg-gradient-to-br from-zinc-200 via-zinc-300 to-zinc-400 text-zinc-950 dark:from-zinc-700 dark:via-zinc-800 dark:to-zinc-900 dark:text-white";
};

