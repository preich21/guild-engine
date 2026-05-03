"use client";

import { Check } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

type AdminNavLinkProps = {
  lang: Locale;
  label: string;
  featureConfigLabel: string;
  guildMeetingsLabel: string;
  achievementsLabel: string;
  awardAchievementsLabel: string;
  manualPointsLabel: string;
  performanceMetricConfigLabel: string;
  rulesConfigLabel: string;
  showAchievements: boolean;
  showAwardAchievements: boolean;
  showManualPoints: boolean;
};

const normalizePath = (path: string) => {
  if (path.length > 1 && path.endsWith("/")) {
    return path.slice(0, -1);
  }

  return path;
};

export function AdminNavLink({
  lang,
  label,
  featureConfigLabel,
  guildMeetingsLabel,
  achievementsLabel,
  awardAchievementsLabel,
  manualPointsLabel,
  performanceMetricConfigLabel,
  rulesConfigLabel,
  showAchievements,
  showAwardAchievements,
  showManualPoints,
}: AdminNavLinkProps) {
  const pathname = usePathname();
  const router = useRouter();

  const normalizedPath = normalizePath(pathname);
  const adminBasePath = `/${lang}/admin`;
  const featureConfigPath = `${adminBasePath}/feature-config`;
  const guildMeetingsPath = `${adminBasePath}/meetings`;
  const achievementsPath = `${adminBasePath}/achievements`;
  const awardAchievementsPath = `${adminBasePath}/award-achievements`;
  const manualPointsPath = `${adminBasePath}/manual-points`;
  const performanceMetricConfigPath = `${adminBasePath}/performance-metric-config`;
  const rulesConfigPath = `${adminBasePath}/rules-config`;

  const isAdminRoute =
    normalizedPath === adminBasePath ||
    normalizedPath.startsWith(`${adminBasePath}/`);

  const isFeatureConfigActive = normalizedPath === featureConfigPath;
  const isGuildMeetingsActive = normalizedPath === guildMeetingsPath;
  const isAchievementsActive = normalizedPath === achievementsPath;
  const isAwardAchievementsActive = normalizedPath === awardAchievementsPath;
  const isManualPointsActive = normalizedPath === manualPointsPath;
  const isPerformanceMetricConfigActive = normalizedPath === performanceMetricConfigPath;
  const isRulesConfigActive = normalizedPath === rulesConfigPath;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-current={isAdminRoute ? "page" : undefined}
            className={cn(
              "text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground",
              isAdminRoute && "text-foreground",
            )}
          >
            {label}
          </button>
        }
      />
      <DropdownMenuContent align="start" className="min-w-52">
        <DropdownMenuItem
          onClick={() => router.push(featureConfigPath)}
          aria-current={isFeatureConfigActive ? "page" : undefined}
          className={cn(isFeatureConfigActive && "text-foreground")}
        >
          <span>{featureConfigLabel}</span>
          {isFeatureConfigActive ? <Check className="ml-auto" aria-hidden="true" /> : null}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => router.push(guildMeetingsPath)}
          aria-current={isGuildMeetingsActive ? "page" : undefined}
          className={cn(isGuildMeetingsActive && "text-foreground")}
        >
          <span>{guildMeetingsLabel}</span>
          {isGuildMeetingsActive ? <Check className="ml-auto" aria-hidden="true" /> : null}
        </DropdownMenuItem>
        {showAchievements ? (
          <DropdownMenuItem
            onClick={() => router.push(achievementsPath)}
            aria-current={isAchievementsActive ? "page" : undefined}
            className={cn(isAchievementsActive && "text-foreground")}
          >
            <span>{achievementsLabel}</span>
            {isAchievementsActive ? <Check className="ml-auto" aria-hidden="true" /> : null}
          </DropdownMenuItem>
        ) : null}
        {showAwardAchievements ? (
          <DropdownMenuItem
            onClick={() => router.push(awardAchievementsPath)}
            aria-current={isAwardAchievementsActive ? "page" : undefined}
            className={cn(isAwardAchievementsActive && "text-foreground")}
          >
            <span>{awardAchievementsLabel}</span>
            {isAwardAchievementsActive ? <Check className="ml-auto" aria-hidden="true" /> : null}
          </DropdownMenuItem>
        ) : null}
        {showManualPoints ? (
          <DropdownMenuItem
            onClick={() => router.push(manualPointsPath)}
            aria-current={isManualPointsActive ? "page" : undefined}
            className={cn(isManualPointsActive && "text-foreground")}
          >
            <span>{manualPointsLabel}</span>
            {isManualPointsActive ? <Check className="ml-auto" aria-hidden="true" /> : null}
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          onClick={() => router.push(performanceMetricConfigPath)}
          aria-current={isPerformanceMetricConfigActive ? "page" : undefined}
          className={cn(isPerformanceMetricConfigActive && "text-foreground")}
        >
          <span>{performanceMetricConfigLabel}</span>
          {isPerformanceMetricConfigActive ? (
            <Check className="ml-auto" aria-hidden="true" />
          ) : null}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => router.push(rulesConfigPath)}
          aria-current={isRulesConfigActive ? "page" : undefined}
          className={cn(isRulesConfigActive && "text-foreground")}
        >
          <span>{rulesConfigLabel}</span>
          {isRulesConfigActive ? <Check className="ml-auto" aria-hidden="true" /> : null}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
