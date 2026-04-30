import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Locale } from "@/i18n/config";
import type { UserLevelProgress } from "@/lib/level-system";
import { cn } from "@/lib/utils";

type LevelBarDictionary = {
  levelLabel: string;
  progressTooltip: string;
};

type LevelBarProps = {
  lang: Locale;
  progress: UserLevelProgress;
  dictionary: LevelBarDictionary;
  variant?: "profile" | "topbar";
  className?: string;
};

const formatLevelLabel = (template: string, level: number) =>
  template.replace("{level}", String(level));

export function LevelBar({
  lang,
  progress,
  dictionary,
  variant = "profile",
  className,
}: LevelBarProps) {
  const numberFormatter = new Intl.NumberFormat(lang);
  const label = formatLevelLabel(dictionary.levelLabel, progress.currentLevel);
  const progressTooltip = dictionary.progressTooltip
    .replace("{current}", numberFormatter.format(Math.ceil(progress.spilloverPoints)))
    .replace("{required}", numberFormatter.format(Math.ceil(progress.pointsRequiredForNextLevel)))
    .replace("{level}", numberFormatter.format(progress.nextLevel));
  const tooltip = `${label}, ${progressTooltip}`;

  return (
    <TooltipProvider>
      <Tooltip>
        <div className={cn("min-w-0", variant === "topbar" ? "w-20" : "w-full max-w-sm", className)}>
          <TooltipTrigger
            render={
              <div
                className={cn(
                  "flex w-full min-w-0 items-center gap-2 text-foreground",
                  variant === "topbar" ? "text-base" : "text-lg",
                )}
                aria-label={tooltip}
              />
            }
          >
            <span className="shrink-0 font-black leading-none tabular-nums">
              {numberFormatter.format(progress.currentLevel)}
            </span>
            <div className="w-full">
              <Progress
                value={progress.progressPercent}
                aria-label={label}
                className={cn(
                  "min-w-0 flex-nowrap gap-0",
                  variant === "topbar"
                    ? "w-full shrink-0 **:data-[slot=progress-track]:h-1.5"
                    : "flex-1 **:data-[slot=progress-track]:h-3",
                )}
              />
            </div>
          </TooltipTrigger>
        </div>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
