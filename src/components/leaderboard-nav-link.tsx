"use client";

import { Check } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { TopbarNavLink } from "@/components/topbar-nav-link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

type LeaderboardNavLinkProps = {
  lang: Locale;
  label: string;
  individualLabel: string;
  teamLabel: string;
  showIndividual: boolean;
  showTeam: boolean;
};

const normalizePath = (path: string) => {
  if (path.length > 1 && path.endsWith("/")) {
    return path.slice(0, -1);
  }

  return path;
};

export function LeaderboardNavLink({
  lang,
  label,
  individualLabel,
  teamLabel,
  showIndividual,
  showTeam,
}: LeaderboardNavLinkProps) {
  const pathname = usePathname();
  const router = useRouter();

  const normalizedPath = normalizePath(pathname);
  const leaderboardBasePath = `/${lang}/leaderboard`;
  const individualPath = `${leaderboardBasePath}/individual`;
  const teamPath = `${leaderboardBasePath}/team`;

  const isLeaderboardRoute =
    normalizedPath === leaderboardBasePath ||
    normalizedPath.startsWith(`${leaderboardBasePath}/`);

  const isIndividualActive = normalizedPath === individualPath;
  const isTeamActive = normalizedPath === teamPath;

  if (showIndividual && !showTeam) {
    return <TopbarNavLink href={individualPath} label={label} />;
  }

  if (!showIndividual && showTeam) {
    return <TopbarNavLink href={teamPath} label={label} />;
  }

  if (!showIndividual && !showTeam) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-current={isLeaderboardRoute ? "page" : undefined}
            className={cn(
              "text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground",
              isLeaderboardRoute && "text-foreground",
            )}
          >
            {label}
          </button>
        }
      />
      <DropdownMenuContent align="start" className="min-w-52">
        <DropdownMenuItem
          disabled={!showIndividual}
          onClick={() => router.push(individualPath)}
          aria-current={isIndividualActive ? "page" : undefined}
          className={cn(isIndividualActive && "text-foreground")}
        >
          <span>{individualLabel}</span>
          {isIndividualActive ? <Check className="ml-auto" aria-hidden="true" /> : null}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!showTeam}
          onClick={() => router.push(teamPath)}
          aria-current={isTeamActive ? "page" : undefined}
          className={cn(isTeamActive && "text-foreground")}
        >
          <span>{teamLabel}</span>
          {isTeamActive ? <Check className="ml-auto" aria-hidden="true" /> : null}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
