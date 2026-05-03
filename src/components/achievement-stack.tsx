"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type AchievementStackItem = {
  id: string;
  title: string;
  image: string;
};

type AchievementStackProps = {
  achievements: AchievementStackItem[];
  emptyLabel?: string;
};

const ACHIEVEMENT_SIZE_PX = 36;
const ACHIEVEMENT_OVERLAP_PX = 8;
const ACHIEVEMENT_STEP_PX = ACHIEVEMENT_SIZE_PX - ACHIEVEMENT_OVERLAP_PX;

export function AchievementStack({ achievements, emptyLabel }: AchievementStackProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return undefined;
    }

    const updateWidth = () => {
      setContainerWidth(container.clientWidth);
    };

    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, []);

  const maxVisible = useMemo(() => {
    if (!containerWidth) {
      return achievements.length;
    }

    const availableWidth = Math.max(containerWidth, ACHIEVEMENT_SIZE_PX);
    const count = Math.floor((availableWidth - ACHIEVEMENT_SIZE_PX) / ACHIEVEMENT_STEP_PX) + 1;

    return Math.max(1, count);
  }, [achievements.length, containerWidth]);

  const { visibleAchievements, overflowCount } = useMemo(() => {
    if (achievements.length <= maxVisible) {
      return { visibleAchievements: achievements, overflowCount: 0 };
    }

    if (maxVisible <= 1) {
      return { visibleAchievements: [], overflowCount: achievements.length };
    }

    const visibleCount = maxVisible - 1;

    return {
      visibleAchievements: achievements.slice(0, visibleCount),
      overflowCount: achievements.length - visibleCount,
    };
  }, [achievements, maxVisible]);

  if (achievements.length === 0) {
    if (!emptyLabel) {
      return null;
    }

    return <span className="text-sm text-muted-foreground">{emptyLabel}</span>;
  }

  return (
    <TooltipProvider>
      <div ref={containerRef} className="flex min-w-0 items-center pl-2">
        {visibleAchievements.map((achievement, index) => (
          <Tooltip key={achievement.id}>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  className="-ml-2 first:ml-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  style={{ zIndex: achievements.length - index }}
                  aria-label={achievement.title}
                >
                  <div className="relative size-9 overflow-hidden rounded-full border border-background bg-muted shadow-sm">
                    <Image
                      src={achievement.image}
                      alt=""
                      fill
                      sizes="36px"
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                </button>
              }
            />
            <TooltipContent>{achievement.title}</TooltipContent>
          </Tooltip>
        ))}
        {overflowCount > 0 ? (
          <div
            className="-ml-2 flex size-9 items-center justify-center rounded-full border border-background bg-muted text-xs font-semibold text-muted-foreground"
            style={{ zIndex: achievements.length + 1 }}
            aria-hidden
          >
            +{overflowCount}
          </div>
        ) : null}
      </div>
    </TooltipProvider>
  );
}
