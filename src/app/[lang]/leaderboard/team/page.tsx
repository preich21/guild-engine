import { notFound } from "next/navigation";

import { getTeamLeaderboard } from "@/app/[lang]/leaderboard/actions";
import { TeamLeaderboard } from "@/components/team-leaderboard";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

export default async function TeamLeaderboardPage({
  params,
}: PageProps<"/[lang]/leaderboard/team">) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const [dictionary, entries] = await Promise.all([
    getDictionary(lang),
    getTeamLeaderboard(),
  ]);

  return (
    <TeamLeaderboard
      entries={entries}
      dictionary={{
        heading: dictionary.leaderboard.team.heading,
        empty: dictionary.leaderboard.team.empty,
      }}
    />
  );
}

