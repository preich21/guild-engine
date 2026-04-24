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
  pointDistributionLabel: string;
  guildMeetingsLabel: string;
  achievementsLabel: string;
  awardAchievementsLabel: string;
  manualPointsLabel: string;
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
  pointDistributionLabel,
  guildMeetingsLabel,
  achievementsLabel,
  awardAchievementsLabel,
  manualPointsLabel,
}: AdminNavLinkProps) {
  const pathname = usePathname();
  const router = useRouter();

  const normalizedPath = normalizePath(pathname);
  const adminBasePath = `/${lang}/admin`;
  const pointDistributionPath = `${adminBasePath}/point-distribution`;
  const guildMeetingsPath = `${adminBasePath}/guild-meetings`;
  const achievementsPath = `${adminBasePath}/achievements`;
  const awardAchievementsPath = `${adminBasePath}/award-achievements`;
  const manualPointsPath = `${adminBasePath}/manual-points`;

  const isAdminRoute =
    normalizedPath === adminBasePath ||
    normalizedPath.startsWith(`${adminBasePath}/`);

  const isPointDistributionActive = normalizedPath === pointDistributionPath;
  const isGuildMeetingsActive = normalizedPath === guildMeetingsPath;
  const isAchievementsActive = normalizedPath === achievementsPath;
  const isAwardAchievementsActive = normalizedPath === awardAchievementsPath;
  const isManualPointsActive = normalizedPath === manualPointsPath;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-current={isAdminRoute ? "page" : undefined}
            className={cn(
              "text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
              isAdminRoute && "text-foreground",
            )}
          >
            {label}
          </button>
        }
      />
      <DropdownMenuContent align="start" className="min-w-52">
        <DropdownMenuItem
          onClick={() => router.push(pointDistributionPath)}
          aria-current={isPointDistributionActive ? "page" : undefined}
          className={cn(isPointDistributionActive && "text-foreground")}
        >
          <span>{pointDistributionLabel}</span>
          {isPointDistributionActive ? <Check className="ml-auto" aria-hidden="true" /> : null}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => router.push(guildMeetingsPath)}
          aria-current={isGuildMeetingsActive ? "page" : undefined}
          className={cn(isGuildMeetingsActive && "text-foreground")}
        >
          <span>{guildMeetingsLabel}</span>
          {isGuildMeetingsActive ? <Check className="ml-auto" aria-hidden="true" /> : null}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => router.push(achievementsPath)}
          aria-current={isAchievementsActive ? "page" : undefined}
          className={cn(isAchievementsActive && "text-foreground")}
        >
          <span>{achievementsLabel}</span>
          {isAchievementsActive ? <Check className="ml-auto" aria-hidden="true" /> : null}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => router.push(awardAchievementsPath)}
          aria-current={isAwardAchievementsActive ? "page" : undefined}
          className={cn(isAwardAchievementsActive && "text-foreground")}
        >
          <span>{awardAchievementsLabel}</span>
          {isAwardAchievementsActive ? <Check className="ml-auto" aria-hidden="true" /> : null}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => router.push(manualPointsPath)}
          aria-current={isManualPointsActive ? "page" : undefined}
          className={cn(isManualPointsActive && "text-foreground")}
        >
          <span>{manualPointsLabel}</span>
          {isManualPointsActive ? <Check className="ml-auto" aria-hidden="true" /> : null}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
