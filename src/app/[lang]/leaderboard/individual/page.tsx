import { notFound } from "next/navigation";

import { getLeaderboard } from "@/app/[lang]/leaderboard/actions";
import { Leaderboard } from "@/components/leaderboard";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
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

  const [dictionary, entries, allAchievements] = await Promise.all([
    getDictionary(lang),
    getLeaderboard(),
    getUserProfileAchievementCatalog(),
  ]);

  const highlightedUserId = typeof highlight === "string" ? highlight : undefined;

  return (
    <Leaderboard
      lang={lang}
      entries={entries}
      highlightedUserId={highlightedUserId}
      profileDataByUserId={createUserProfileDataMap(entries, allAchievements)}
      dictionary={{
        heading: dictionary.leaderboard.individual.heading,
        empty: dictionary.leaderboard.individual.empty,
        streakLabel: dictionary.leaderboard.individual.streakLabel,
        profile: dictionary.profile,
      }}
    />
  );
}
