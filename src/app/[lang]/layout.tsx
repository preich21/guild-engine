import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { getCooperativeProgress } from "@/app/[lang]/cooperative-progress/actions";
import { defaultLocale, hasLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { FeatureConfigProvider } from "@/components/feature-config-provider";
import { SidebarNavigation } from "@/components/sidebar-navigation";
import { SidebarStateProvider } from "@/components/sidebar-state-provider";
import { Topbar } from "@/components/topbar";
import { evaluateAchievementsForUser } from "@/lib/achievement-evaluation";
import { getCurrentUserRecord, getUserGuildMeetingAttendanceStreak } from "@/lib/auth/user";
import { getCurrentFeatureConfig } from "@/lib/feature-config-server";
import { getFeatureSettingValue, getHomePageHref, isFeatureEnabled } from "@/lib/feature-flags";
import { getUserLevelProgress } from "@/lib/level-system";

export const generateStaticParams = async () =>
  locales.map((lang) => ({ lang }));

export async function generateMetadata({
  params,
}: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const dictionary = await getDictionary(locale);

  return {
    title: {
      default: dictionary.metadata.title,
      template: `${dictionary.metadata.title} | %s`,
    },
    description: dictionary.metadata.description,
  };
}

export default async function RootLayout({
  children,
  params,
}: LayoutProps<"/[lang]">) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  await connection();

  const [dictionary, currentUser, featureConfig] = await Promise.all([
    getDictionary(lang),
    getCurrentUserRecord(),
    getCurrentFeatureConfig(),
  ]);

  // render login/register pages without navigation overlay
  if (!currentUser) {
    return (
      <FeatureConfigProvider initialState={featureConfig.state}>
        {children}
      </FeatureConfigProvider>
    );
  }

  const areBadgesEnabled = isFeatureEnabled(featureConfig.state, "badges");
  const areStreaksEnabled = isFeatureEnabled(featureConfig.state, "streaks");
  const areLevelsEnabled = isFeatureEnabled(featureConfig.state, "level-system");
  const isCooperativeProgressEnabled = isFeatureEnabled(
    featureConfig.state,
    "cooperative-progress-bar",
  );
  const homeHref = getHomePageHref(lang, featureConfig.homePagePath, currentUser?.id);
  const cooperativeProgressConfig = {
    "start-date": getFeatureSettingValue(
      featureConfig.state,
      "cooperative-progress-bar",
      "start-date",
    ),
    aggregation: getFeatureSettingValue(
      featureConfig.state,
      "cooperative-progress-bar",
      "aggregation",
    ),
    "goal-points": getFeatureSettingValue(
      featureConfig.state,
      "cooperative-progress-bar",
      "goal-points",
    ),
  };

  const [attendanceStreak, levelProgress, cooperativeProgress] = currentUser
    ? await Promise.all([
        areBadgesEnabled
          ? evaluateAchievementsForUser({
              id: currentUser.id,
              teamId: currentUser.teamId,
            })
          : Promise.resolve(null),
        areStreaksEnabled
          ? getUserGuildMeetingAttendanceStreak(currentUser.id)
          : Promise.resolve({
              count: 0,
              hasPendingRecentMeeting: false,
              latestMeetingWasStreakFreeze: false,
            }),
        areLevelsEnabled ? getUserLevelProgress(currentUser.id) : Promise.resolve(null),
        isCooperativeProgressEnabled
          ? getCooperativeProgress(cooperativeProgressConfig)
          : Promise.resolve(null),
      ]).then(([, streak, level, cooperative]) => [streak, level, cooperative] as const)
    : ([
        { count: 0, hasPendingRecentMeeting: false, latestMeetingWasStreakFreeze: false },
        null,
        null,
      ] as const);

  return (
    <FeatureConfigProvider initialState={featureConfig.state}>
      <SidebarStateProvider>
        <Topbar
          lang={lang}
          dictionary={dictionary.topbar}
          showAdminLink={Boolean(currentUser?.admin)}
          attendanceStreak={attendanceStreak}
          featureConfig={featureConfig.state}
          levelProgress={levelProgress}
          cooperativeProgress={cooperativeProgress}
          homeHref={homeHref}
          currentUser={
            currentUser
              ? {
                  id: currentUser.id,
                  username: currentUser.username,
                  profilePicture: currentUser.profilePicture,
                }
              : undefined
          }
        />
        <div className="flex min-h-[calc(100dvh-3.5rem)]">
          <SidebarNavigation
            lang={lang}
            dictionary={dictionary.topbar}
            showAdminLink={Boolean(currentUser?.admin)}
            currentUser={currentUser ? { id: currentUser.id } : undefined}
          />
          <main className="min-w-0 flex-1 pb-20 md:pb-0">{children}</main>
        </div>
      </SidebarStateProvider>
    </FeatureConfigProvider>
  );
}
