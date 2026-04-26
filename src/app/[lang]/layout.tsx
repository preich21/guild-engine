import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { defaultLocale, hasLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { FeatureConfigProvider } from "@/components/feature-config-provider";
import { Topbar } from "@/components/topbar";
import { evaluateAchievementsForUser } from "@/lib/achievement-evaluation";
import { getCurrentUserRecord, getUserGuildMeetingAttendanceStreak } from "@/lib/auth/user";
import { getCurrentFeatureConfig } from "@/lib/feature-config-server";
import { getHomePageHref, isFeatureEnabled } from "@/lib/feature-flags";

export const generateStaticParams = async () =>
  locales.map((lang) => ({ lang }));

export async function generateMetadata({
  params,
}: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  const locale = hasLocale(lang) ? lang : defaultLocale;
  const dictionary = await getDictionary(locale);

  return {
    title: dictionary.metadata.title,
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

  const [dictionary, currentUser, featureConfig] = await Promise.all([
    getDictionary(lang),
    getCurrentUserRecord(),
    getCurrentFeatureConfig(),
  ]);

  const areBadgesEnabled = isFeatureEnabled(featureConfig.state, "badges");
  const areStreaksEnabled = isFeatureEnabled(featureConfig.state, "streaks");
  const homeHref = getHomePageHref(lang, featureConfig.homePagePath, currentUser?.id);

  const attendanceStreak = currentUser
    ? (
        await Promise.all([
          areBadgesEnabled
            ? evaluateAchievementsForUser({
                id: currentUser.id,
                teamId: currentUser.teamId,
              })
            : Promise.resolve(null),
          areStreaksEnabled
            ? getUserGuildMeetingAttendanceStreak(currentUser.id)
            : Promise.resolve({ count: 0, hasPendingRecentMeeting: false }),
        ])
      )[1]
    : { count: 0, hasPendingRecentMeeting: false };

  return (
    <FeatureConfigProvider initialState={featureConfig.state}>
      <Topbar
        lang={lang}
        dictionary={dictionary.topbar}
        showAdminLink={Boolean(currentUser?.admin)}
        attendanceStreak={attendanceStreak}
        featureConfig={featureConfig.state}
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
      {children}
    </FeatureConfigProvider>
  );
}
