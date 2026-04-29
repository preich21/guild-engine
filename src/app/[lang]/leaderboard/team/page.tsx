import { notFound } from "next/navigation";

import { getLeaderboard, getTeamLeaderboard } from "@/app/[lang]/leaderboard/actions";
import { TeamLeaderboard } from "@/components/team-leaderboard";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getCurrentFeatureConfig } from "@/lib/feature-config-server";
import { getFeatureSettingValue, isFeatureEnabled } from "@/lib/feature-flags";
import { getPageMetadata } from "@/lib/page-metadata";
import { createUserProfileDataMap, getUserProfileAchievementCatalog } from "@/lib/user-profile";

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
  const areStreaksEnabled = isFeatureEnabled(featureConfig.state, "streaks");
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

  return (
    <TeamLeaderboard
      lang={lang}
      config={teamLeaderboardConfig}
      entries={entries}
      profileDataByUserId={createUserProfileDataMap(individualEntries, allAchievements)}
      showLeaderboardPlacement={isFeatureEnabled(featureConfig.state, "individual-leaderboard")}
      showStreaks={areStreaksEnabled}
      showAchievements={areBadgesEnabled}
      dictionary={{
        heading: dictionary.leaderboard.team.heading,
        empty: dictionary.leaderboard.team.empty,
        profile: dictionary.profile,
      }}
    />
  );
}
