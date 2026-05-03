"use client";

import { useState } from "react";
import { Flame } from "lucide-react";
import { getStreakDisplayState, getStreakFlameClassName } from "@/lib/streak-ui";

type StreakIndicatorProps = {
  initialCount: number;
  initialHasPendingRecentMeeting: boolean;
  initialLatestMeetingWasStreakFreeze: boolean;
  label: string;
};

export function StreakIndicator({
  initialCount,
  initialHasPendingRecentMeeting,
  initialLatestMeetingWasStreakFreeze,
  label,
}: StreakIndicatorProps) {
  // Keep the server-provided value stable on the client to avoid recalculating after hydration.
  const [count] = useState(initialCount);
  const [hasPendingRecentMeeting] = useState(initialHasPendingRecentMeeting);
  const [latestMeetingWasStreakFreeze] = useState(initialLatestMeetingWasStreakFreeze);

  const state = getStreakDisplayState({
    count,
    hasPendingRecentMeeting,
    latestMeetingWasStreakFreeze,
  });
  const flameClassName = getStreakFlameClassName(state);

  return (
    <div
      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-sm font-medium"
      aria-label={`${label}: ${count}`}
      title={`${label}: ${count}`}
    >
      <Flame aria-hidden="true" className={flameClassName} />
      <span>{count}</span>
    </div>
  );
}
