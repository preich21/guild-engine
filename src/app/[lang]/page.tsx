import { notFound } from "next/navigation";

import { getLeaderboard } from "@/app/[lang]/actions";
import { Leaderboard } from "@/components/leaderboard";
import { getDictionary } from "@/i18n/get-dictionary";
import { hasLocale } from "@/i18n/config";

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const dictionary = await getDictionary(lang);
  const entries = await getLeaderboard();

  return (
    <Leaderboard entries={entries} dictionary={dictionary.home} />
  );
}

