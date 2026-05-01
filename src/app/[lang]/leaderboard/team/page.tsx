import { notFound } from "next/navigation";

import { getLeaderboard, getTeamLeaderboard } from "@/app/[lang]/leaderboard/actions";
import { TeamLeaderboard } from "@/components/team-leaderboard";
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
}: PageProps<"/[lang]/leaderboard/team">) {
  const { lang } = await params;

  return getPageMetadata(lang, (dictionary) => dictionary.leaderboard.team.heading);
}

export default async function TeamLeaderboardPage({
  params,
}: PageProps<"/[lang]/leaderboard/team">) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const featureConfig = await getCurrentFeatureConfig();
  const areBadgesEnabled = isFeatureEnabled(featureConfig.state, "badges");
  const arePowerupsEnabled = isFeatureEnabled(featureConfig.state, "powerups");
  const areStreaksEnabled = isFeatureEnabled(featureConfig.state, "streaks");
  const areLevelsEnabled = isFeatureEnabled(featureConfig.state, "level-system");
  const teamLeaderboardConfig = {
    "start-date": getFeatureSettingValue(featureConfig.state, "team-leaderboard", "start-date"),
    aggregation: getFeatureSettingValue(featureConfig.state, "team-leaderboard", "aggregation"),
  };

  const [dictionary, entries, individualEntries, allAchievements] = await Promise.all([
    getDictionary(lang),
    getTeamLeaderboard(teamLeaderboardConfig),
    getLeaderboard(),
    areBadgesEnabled ? getUserProfileAchievementCatalog() : Promise.resolve([]),
  ]);
  const levelProgressByUserId = areLevelsEnabled
    ? await getUserLevelProgressMap(individualEntries.map((entry) => entry.userId))
    : {};
  const powerupsByUserId = arePowerupsEnabled
    ? await getUserPowerupsMap(individualEntries.map((entry) => entry.userId))
    : {};

  return (
    <TeamLeaderboard
      lang={lang}
      config={teamLeaderboardConfig}
      entries={entries}
      profileDataByUserId={createUserProfileDataMap(
        individualEntries,
        allAchievements,
        levelProgressByUserId,
        powerupsByUserId,
      )}
      showLeaderboardPlacement={isFeatureEnabled(featureConfig.state, "individual-leaderboard")}
      showStreaks={areStreaksEnabled}
      showAchievements={areBadgesEnabled}
      showPowerups={arePowerupsEnabled}
      dictionary={{
        heading: dictionary.leaderboard.team.heading,
        empty: dictionary.leaderboard.team.empty,
        profile: dictionary.profile,
      }}
    />
  );
}
