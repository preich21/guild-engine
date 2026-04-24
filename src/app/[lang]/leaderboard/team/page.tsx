import { notFound } from "next/navigation";

import { getLeaderboard, getTeamLeaderboard } from "@/app/[lang]/leaderboard/actions";
import { TeamLeaderboard } from "@/components/team-leaderboard";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { createUserProfileDataMap, getUserProfileAchievementCatalog } from "@/lib/user-profile";

export default async function TeamLeaderboardPage({
  params,
}: PageProps<"/[lang]/leaderboard/team">) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const [dictionary, entries, individualEntries, allAchievements] = await Promise.all([
    getDictionary(lang),
    getTeamLeaderboard(),
    getLeaderboard(),
    getUserProfileAchievementCatalog(),
  ]);

  return (
    <TeamLeaderboard
      lang={lang}
      entries={entries}
      profileDataByUserId={createUserProfileDataMap(individualEntries, allAchievements)}
      dictionary={{
        heading: dictionary.leaderboard.team.heading,
        empty: dictionary.leaderboard.team.empty,
        profile: dictionary.profile,
      }}
    />
  );
}
