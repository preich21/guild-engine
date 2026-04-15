import { notFound, redirect } from "next/navigation";

import { hasLocale } from "@/i18n/config";

export default async function LeaderboardIndexPage({
  params,
}: PageProps<"/[lang]/leaderboard">) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  redirect(`/${lang}/leaderboard/individual`);
}

