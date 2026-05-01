import { notFound } from "next/navigation";

import { getLeaderboard } from "@/app/[lang]/leaderboard/actions";
import { Leaderboard } from "@/components/leaderboard";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getCurrentFeatureConfig } from "@/lib/feature-config-server";
import { getFeatureSettingValue, isFeatureEnabled } from "@/lib/feature-flags";
import { getUserLevelProgressMap } from "@/lib/level-system";
import { getPageMetadata } from "@/lib/page-metadata";
import {
  createUserProfileDataMap,
  getUserPowerupsMap,
  getUserProfileAchievementCatalog,
} from "@/lib/user-profile";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/leaderboard/individual">) {
  const { lang } = await params;

  return getPageMetadata(lang, (dictionary) => dictionary.leaderboard.individual.heading);
}

export default async function IndividualLeaderboardPage({
  params,
  searchParams,
}: PageProps<"/[lang]/leaderboard/individual">) {
  const { lang } = await params;
  const { highlight } = await searchParams;

  if (!hasLocale(lang)) {
    notFound();
  }

  const featureConfig = await getCurrentFeatureConfig();
  const areBadgesEnabled = isFeatureEnabled(featureConfig.state, "badges");
  const arePowerupsEnabled = isFeatureEnabled(featureConfig.state, "powerups");
  const areStreaksEnabled = isFeatureEnabled(featureConfig.state, "streaks");
  const areLevelsEnabled = isFeatureEnabled(featureConfig.state, "level-system");
  const individualLeaderboardConfig = {
    startDate: getFeatureSettingValue(featureConfig.state, "individual-leaderboard", "start-date"),
    showDashboard: getFeatureSettingValue(
      featureConfig.state,
      "individual-leaderboard",
      "show-dashboard",
    ),
  };

  const [dictionary, entries, allAchievements] = await Promise.all([
    getDictionary(lang),
    getLeaderboard(individualLeaderboardConfig),
    areBadgesEnabled ? getUserProfileAchievementCatalog() : Promise.resolve([]),
  ]);
  const levelProgressByUserId = areLevelsEnabled
    ? await getUserLevelProgressMap(entries.map((entry) => entry.userId))
    : {};
  const powerupsByUserId = arePowerupsEnabled
    ? await getUserPowerupsMap(entries.map((entry) => entry.userId))
    : {};

  const highlightedUserId = typeof highlight === "string" ? highlight : undefined;

  return (
    <Leaderboard
      lang={lang}
      entries={entries}
      highlightedUserId={highlightedUserId}
      profileDataByUserId={createUserProfileDataMap(
        entries,
        allAchievements,
        levelProgressByUserId,
        powerupsByUserId,
      )}
      showAchievements={areBadgesEnabled}
      showPowerups={arePowerupsEnabled}
      showStreaks={areStreaksEnabled}
      dictionary={{
        heading: dictionary.leaderboard.individual.heading,
        empty: dictionary.leaderboard.individual.empty,
        streakLabel: dictionary.leaderboard.individual.streakLabel,
        profile: dictionary.profile,
      }}
    />
  );
}
