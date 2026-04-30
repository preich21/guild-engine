import { notFound } from "next/navigation";

import { getCooperativeProgress } from "@/app/[lang]/cooperative-progress/actions";
import { CooperativeProgressPage } from "@/components/cooperative-progress-page";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getCurrentFeatureConfig } from "@/lib/feature-config-server";
import { getFeatureSettingValue, isFeatureEnabled } from "@/lib/feature-flags";
import { getUserLevelProgressMap } from "@/lib/level-system";
import { getPageMetadata } from "@/lib/page-metadata";
import { createUserProfileDataMap, getUserProfileAchievementCatalog } from "@/lib/user-profile";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/cooperative-progress">) {
  const { lang } = await params;

  return getPageMetadata(lang, (dictionary) => dictionary.cooperativeProgress.heading);
}

export default async function CooperativeProgressRoutePage({
  params,
}: PageProps<"/[lang]/cooperative-progress">) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const featureConfig = await getCurrentFeatureConfig();

  if (!isFeatureEnabled(featureConfig.state, "cooperative-progress-bar")) {
    notFound();
  }

  const areBadgesEnabled = isFeatureEnabled(featureConfig.state, "badges");
  const areStreaksEnabled = isFeatureEnabled(featureConfig.state, "streaks");
  const areLevelsEnabled = isFeatureEnabled(featureConfig.state, "level-system");
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

  const [dictionary, progress, allAchievements] = await Promise.all([
    getDictionary(lang),
    getCooperativeProgress(cooperativeProgressConfig),
    areBadgesEnabled ? getUserProfileAchievementCatalog() : Promise.resolve([]),
  ]);
  const levelProgressByUserId = areLevelsEnabled
    ? await getUserLevelProgressMap(progress.topContributors.map((entry) => entry.userId))
    : {};

  return (
    <CooperativeProgressPage
      lang={lang}
      progress={progress}
      profileDataByUserId={createUserProfileDataMap(
        progress.topContributors,
        allAchievements,
        levelProgressByUserId,
      )}
      showLeaderboardPlacement={false}
      showStreaks={areStreaksEnabled}
      showAchievements={areBadgesEnabled}
      dictionary={{
        heading: dictionary.cooperativeProgress.heading,
        topContributorsHeading: dictionary.cooperativeProgress.topContributorsHeading,
        emptyContributors: dictionary.cooperativeProgress.emptyContributors,
        rankColumn: dictionary.cooperativeProgress.rankColumn,
        userColumn: dictionary.cooperativeProgress.userColumn,
        pointsColumn: dictionary.cooperativeProgress.pointsColumn,
        progressInProgressTooltip: dictionary.topbar.cooperativeProgressInProgressTooltip,
        progressOverGoalTooltip: dictionary.topbar.cooperativeProgressOverGoalTooltip,
        profile: dictionary.profile,
      }}
    />
  );
}
