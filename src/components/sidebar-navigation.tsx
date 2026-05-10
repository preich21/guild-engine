"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Brain,
  Calendar,
  CircleQuestionMark,
  Cog,
  Crown,
  FerrisWheel,
  FilePenLine,
  FileQuestionMark,
  Menu,
  SlidersHorizontal,
  Star,
  UserRound,
  UserRoundPlus,
  UsersRound,
  UserStar,
  type LucideIcon,
} from "lucide-react";

import { useFeatureConfig } from "@/components/feature-config-provider";
import { useSidebarState } from "@/components/sidebar-state-provider";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Locale } from "@/i18n/config";
import { isFeatureEnabled, isQuizzesEnabled, isRoleRaffleEnabled } from "@/lib/feature-flags";
import { cn } from "@/lib/utils";

type SidebarNavigationProps = {
  lang: Locale;
  dictionary: {
    individualLeaderboardLink: string;
    teamLeaderboardLink: string;
    trackContributionsLink: string;
    quizzesLink: string;
    roleRaffleLink: string;
    rulesLink: string;
    featureConfigLink: string;
    guildMeetingsLink: string;
    achievementsLink: string;
    awardAchievementsLink: string;
    manualPointsLink: string;
    quizManagementLink: string;
    performanceMetricConfigLink: string;
    rulesConfigLink: string;
    profileButton: string;
    moreNavigationButton: string;
  };
  showAdminLink: boolean;
  currentUser?: {
    id: string;
  };
};

type SidebarNavItem = {
  id: string;
  href?: string;
  label: string;
  icon: LucideIcon;
  layeredIcon?: LucideIcon;
  activePrefix?: string;
};

const normalizePath = (path: string) => {
  if (path.length > 1 && path.endsWith("/")) {
    return path.slice(0, -1);
  }

  return path;
};

function SidebarIcon({
  icon: Icon,
  layeredIcon: LayeredIcon,
  expanded,
}: Pick<SidebarNavItem, "icon" | "layeredIcon"> & { expanded?: boolean }) {
  return (
    <span className={cn("relative inline-flex shrink-0", expanded ? "size-4" : "size-5")}>
      <Icon className="size-full" aria-hidden="true" />
      {LayeredIcon ? (
        <LayeredIcon
          className="absolute -bottom-0.5 -right-0.5 size-1/2 rounded-full bg-background"
          aria-hidden="true"
        />
      ) : null}
    </span>
  );
}

function isItemActive(pathname: string, item: SidebarNavItem) {
  if (!item.href) {
    return false;
  }

  const normalizedPath = normalizePath(pathname);
  const normalizedHref = normalizePath(item.href);

  if (item.activePrefix) {
    const normalizedPrefix = normalizePath(item.activePrefix);
    return normalizedPath === normalizedPrefix || normalizedPath.startsWith(`${normalizedPrefix}/`);
  }

  return normalizedPath === normalizedHref;
}

function SidebarLink({
  item,
  expanded,
  mobileVariant,
}: {
  item: SidebarNavItem;
  expanded?: boolean;
  mobileVariant?: "bar" | "menu";
}) {
  const pathname = usePathname();
  const isActive = isItemActive(pathname, item);
  const showLabel = expanded || mobileVariant === "menu";
  const className = cn(
    "gap-3 text-muted-foreground",
    isActive && "bg-muted text-foreground",
    mobileVariant === "bar"
      ? "h-11 flex-1 justify-center px-0"
      : mobileVariant === "menu"
        ? "h-10 w-full justify-start"
        : expanded
          ? "h-10 w-full justify-start px-3"
          : "size-10 justify-center px-0",
  );
  const content = (
    <>
      <SidebarIcon
        icon={item.icon}
        layeredIcon={item.layeredIcon}
        expanded={expanded || mobileVariant === "menu"}
      />
      {showLabel ? (
        <span
          className={cn(
            "min-w-0 text-left",
            expanded
              ? "overflow-hidden whitespace-normal wrap-break-word leading-tight [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]"
              : "truncate",
          )}
        >
          {item.label}
        </span>
      ) : null}
    </>
  );

  if (!item.href) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={className}
        aria-label={showLabel ? undefined : item.label}
        title={showLabel ? undefined : item.label}
        disabled
      >
        {content}
      </Button>
    );
  }

  const button = (
    <Button
      variant="ghost"
      size="sm"
      className={className}
      nativeButton={false}
      render={
        <Link
          href={item.href}
          aria-current={isActive ? "page" : undefined}
          aria-label={showLabel ? undefined : item.label}
          title={showLabel ? undefined : item.label}
        />
      }
    >
      {content}
    </Button>
  );

  if (expanded || mobileVariant) {
    return button;
  }

  return (
    <Tooltip>
      <TooltipTrigger render={button} />
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

export function SidebarNavigation({
  lang,
  dictionary,
  showAdminLink,
  currentUser,
}: SidebarNavigationProps) {
  const { state: featureConfig } = useFeatureConfig();
  const { expanded } = useSidebarState();

  const adminBasePath = `/${lang}/admin`;
  const isPointSystemEnabled = isFeatureEnabled(featureConfig, "point-system");
  const isIndividualLeaderboardEnabled = isFeatureEnabled(featureConfig, "individual-leaderboard");
  const isTeamLeaderboardEnabled = isFeatureEnabled(featureConfig, "team-leaderboard");
  const areBadgesEnabled = isFeatureEnabled(featureConfig, "badges");
  const areQuizzesEnabled = isQuizzesEnabled(featureConfig);
  const shouldShowRoleRaffle = isRoleRaffleEnabled(featureConfig);

  const primaryItems: SidebarNavItem[] = [
    {
      id: "profile",
      href: currentUser ? `/${lang}/user/${currentUser.id}` : undefined,
      label: dictionary.profileButton,
      icon: UserRound,
    },
    ...(isPointSystemEnabled
      ? [
          {
            id: "track-contributions",
            href: `/${lang}/track-contributions`,
            label: dictionary.trackContributionsLink,
            icon: FilePenLine,
          },
        ]
      : []),
    ...(isIndividualLeaderboardEnabled
      ? [
          {
            id: "individual-leaderboard",
            href: `/${lang}/leaderboard/individual`,
            label: dictionary.individualLeaderboardLink,
            icon: UserRound,
            layeredIcon: Crown,
          },
        ]
      : []),
    ...(isTeamLeaderboardEnabled
      ? [
          {
            id: "team-leaderboard",
            href: `/${lang}/leaderboard/team`,
            label: dictionary.teamLeaderboardLink,
            icon: UsersRound,
            layeredIcon: Crown,
          },
        ]
      : []),
    ...(shouldShowRoleRaffle
      ? [
          {
            id: "role-raffle",
            href: `/${lang}/role-raffle`,
            label: dictionary.roleRaffleLink,
            icon: FerrisWheel,
          },
        ]
      : []),
    ...(areQuizzesEnabled
      ? [
          {
            id: "quizzes",
            href: `/${lang}/quizzes`,
            label: dictionary.quizzesLink,
            icon: Brain,
          },
        ]
      : []),
    {
      id: "rules",
      href: `/${lang}/rules`,
      label: dictionary.rulesLink,
      icon: CircleQuestionMark,
    },
  ];

  const adminItems: SidebarNavItem[] = showAdminLink
    ? [
        {
          id: "feature-config",
          href: `${adminBasePath}/feature-config`,
          label: dictionary.featureConfigLink,
          icon: Cog,
        },
        {
          id: "performance-metric-config",
          href: `${adminBasePath}/performance-metric-config`,
          label: dictionary.performanceMetricConfigLink,
          icon: SlidersHorizontal,
        },
        {
          id: "meetings",
          href: `${adminBasePath}/meetings`,
          label: dictionary.guildMeetingsLink,
          icon: Calendar,
        },
        ...(areBadgesEnabled
          ? [
              {
                id: "achievements",
                href: `${adminBasePath}/achievements`,
                label: dictionary.achievementsLink,
                icon: Star,
              },
              {
                id: "award-achievements",
                href: `${adminBasePath}/award-achievements`,
                label: dictionary.awardAchievementsLink,
                icon: UserStar,
              },
            ]
          : []),
        ...(isPointSystemEnabled
          ? [
              {
                id: "manual-points",
                href: `${adminBasePath}/manual-points`,
                label: dictionary.manualPointsLink,
                icon: UserRoundPlus,
              },
            ]
          : []),
        ...(areQuizzesEnabled
          ? [
              {
                id: "quiz-management",
                href: `${adminBasePath}/quiz-management`,
                label: dictionary.quizManagementLink,
                icon: Brain,
                layeredIcon: Cog,
              },
            ]
          : []),
        {
          id: "rules-config",
          href: `${adminBasePath}/rules-config`,
          label: dictionary.rulesConfigLink,
          icon: FileQuestionMark,
        },
      ]
    : [];

  const mobilePrimaryIds = new Set([
    "profile",
    "track-contributions",
    "individual-leaderboard",
    "team-leaderboard",
  ]);
  const mobilePrimaryItems = primaryItems.filter((item) => mobilePrimaryIds.has(item.id));
  const mobileOverflowItems = primaryItems.filter((item) => !mobilePrimaryIds.has(item.id));

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "hidden shrink-0 border-r border-border bg-background transition-[width] duration-200 ease-out md:sticky md:top-14 md:flex md:h-[calc(100dvh-3.5rem)] md:flex-col md:items-center md:px-3 md:py-4",
          expanded ? "md:w-50" : "md:w-16",
        )}
      >
        <nav className="flex w-full flex-col items-center gap-1" aria-label="Primary navigation">
          {primaryItems.map((item) => (
            <SidebarLink key={item.id} item={item} expanded={expanded} />
          ))}
          {adminItems.length > 0 ? (
            <>
              <Separator className="my-2" />
              {adminItems.map((item) => (
                <SidebarLink key={item.id} item={item} expanded={expanded} />
              ))}
            </>
          ) : null}
        </nav>
      </aside>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around gap-1 border-t border-border bg-background/95 px-2 backdrop-blur md:hidden"
        aria-label="Primary navigation"
      >
        {mobilePrimaryItems.map((item) => (
          <SidebarLink key={item.id} item={item} mobileVariant="bar" />
        ))}
        {mobileOverflowItems.length > 0 || adminItems.length > 0 ? (
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={dictionary.moreNavigationButton}
                  title={dictionary.moreNavigationButton}
                >
                  <Menu aria-hidden="true" />
                </Button>
              }
            />
            <PopoverContent align="end" side="top" className="w-64">
              {mobileOverflowItems.map((item) => (
                <SidebarLink key={item.id} item={item} mobileVariant="menu" />
              ))}
              {adminItems.length > 0 ? (
                <>
                  <Separator className="my-1" />
                  {adminItems.map((item) => (
                    <SidebarLink key={item.id} item={item} mobileVariant="menu" />
                  ))}
                </>
              ) : null}
            </PopoverContent>
          </Popover>
        ) : null}
      </nav>
    </TooltipProvider>
  );
}
