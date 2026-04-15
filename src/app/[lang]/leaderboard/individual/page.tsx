import { notFound } from "next/navigation";

import { getLeaderboard } from "@/app/[lang]/leaderboard/actions";
import { Leaderboard } from "@/components/leaderboard";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

export default async function IndividualLeaderboardPage({
  params,
}: PageProps<"/[lang]/leaderboard/individual">) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const [dictionary, entries] = await Promise.all([
    getDictionary(lang),
    getLeaderboard(),
  ]);

  return (
    <Leaderboard
      entries={entries}
      dictionary={{
        heading: dictionary.leaderboard.individual.heading,
        empty: dictionary.leaderboard.individual.empty,
      }}
    />
  );
}

