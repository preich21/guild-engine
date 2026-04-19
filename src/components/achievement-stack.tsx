"use client";

import Image from "next/image";

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

export function AchievementStack({ achievements, emptyLabel }: AchievementStackProps) {
  if (achievements.length === 0) {
    if (!emptyLabel) {
      return null;
    }

    return <span className="text-sm text-muted-foreground">{emptyLabel}</span>;
  }

  return (
    <TooltipProvider>
      <div className="flex min-w-0 items-center pl-2">
        {achievements.map((achievement, index) => (
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
      </div>
    </TooltipProvider>
  );
}
