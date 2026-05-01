"use client";

import { useState } from "react";
import { Flame } from "lucide-react";

type AttendanceStreakIndicatorProps = {
  initialCount: number;
  initialHasPendingRecentMeeting: boolean;
  initialLatestMeetingWasStreakFreeze: boolean;
  label: string;
};

export function AttendanceStreakIndicator({
  initialCount,
  initialHasPendingRecentMeeting,
  initialLatestMeetingWasStreakFreeze,
  label,
}: AttendanceStreakIndicatorProps) {
  // Keep the server-provided value stable on the client to avoid recalculating after hydration.
  const [count] = useState(initialCount);
  const [hasPendingRecentMeeting] = useState(initialHasPendingRecentMeeting);
  const [latestMeetingWasStreakFreeze] = useState(initialLatestMeetingWasStreakFreeze);

  const highlightFlame = count > 0 && !hasPendingRecentMeeting;
  const flameClassName = latestMeetingWasStreakFreeze
    ? "size-4 text-sky-400"
    : highlightFlame
      ? "size-4 text-orange-500"
      : "size-4 text-muted-foreground";

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
