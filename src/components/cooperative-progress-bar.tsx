import Link from "next/link";
import { Gift, PartyPopper } from "lucide-react";

import type { CooperativeProgress } from "@/app/[lang]/cooperative-progress/actions";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

type CooperativeProgressBarDictionary = {
  inProgressTooltip: string;
  overGoalTooltip: string;
};

type CooperativeProgressBarProps = {
  lang: Locale;
  progress: CooperativeProgress;
  dictionary: CooperativeProgressBarDictionary;
  href?: string;
  variant?: "page" | "topbar";
  className?: string;
};

export function CooperativeProgressBar({
  lang,
  progress,
  dictionary,
  href,
  variant = "page",
  className,
}: CooperativeProgressBarProps) {
  const numberFormatter = new Intl.NumberFormat(lang);
  const pointsOverGoal = Math.max(0, progress.currentPoints - progress.goalPoints);
  const tooltip = progress.isComplete
    ? dictionary.overGoalTooltip
        .replace("{current}", numberFormatter.format(pointsOverGoal))
        .replace("{goal}", numberFormatter.format(progress.goalPoints))
    : dictionary.inProgressTooltip
        .replace("{current}", numberFormatter.format(progress.currentPoints))
        .replace("{goal}", numberFormatter.format(progress.goalPoints));
  const Icon = progress.isComplete ? PartyPopper : Gift;
  const triggerClassName = cn(
    "flex w-full min-w-0 items-center gap-2 rounded-lg text-foreground outline-none transition-colors hover:text-foreground/80 focus-visible:ring-3 focus-visible:ring-ring/50",
    variant === "topbar" ? "h-8" : "h-10",
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <div className={cn("min-w-0", variant === "topbar" ? "w-full" : "w-full max-w-xl", className)}>
          <TooltipTrigger
            render={
              href ? (
                <Link href={href} className={triggerClassName} aria-label={tooltip} />
              ) : (
                <div className={triggerClassName} aria-label={tooltip} />
              )
            }
          >
            <Progress
              value={progress.progressPercent}
              aria-label={tooltip}
              className={cn(
                "min-w-0 flex-1 flex-nowrap gap-0",
                variant === "topbar"
                  ? "**:data-[slot=progress-track]:h-1.5"
                  : "**:data-[slot=progress-track]:h-3",
              )}
            />
            <Icon
              aria-hidden="true"
              className={cn(
                "shrink-0",
                variant === "topbar" ? "size-4" : "size-5",
                progress.isComplete ? "text-amber-500 dark:text-amber-400" : "text-primary",
              )}
            />
          </TooltipTrigger>
        </div>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
