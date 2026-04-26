import { notFound } from "next/navigation";

import { getLeaderboard } from "@/app/[lang]/leaderboard/actions";
import { Leaderboard } from "@/components/leaderboard";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getCurrentFeatureConfig } from "@/lib/feature-config-server";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { createUserProfileDataMap, getUserProfileAchievementCatalog } from "@/lib/user-profile";

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
  const areStreaksEnabled = isFeatureEnabled(featureConfig.state, "streaks");

  const [dictionary, entries, allAchievements] = await Promise.all([
    getDictionary(lang),
    getLeaderboard(),
    areBadgesEnabled ? getUserProfileAchievementCatalog() : Promise.resolve([]),
  ]);

  const highlightedUserId = typeof highlight === "string" ? highlight : undefined;

  return (
    <Leaderboard
      lang={lang}
      entries={entries}
      highlightedUserId={highlightedUserId}
      profileDataByUserId={createUserProfileDataMap(entries, allAchievements)}
      showAchievements={areBadgesEnabled}
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
