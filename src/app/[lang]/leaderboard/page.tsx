import { notFound, redirect } from "next/navigation";

import { hasLocale } from "@/i18n/config";
import { getCurrentFeatureConfig } from "@/lib/feature-config-server";
import { isFeatureEnabled } from "@/lib/feature-flags";

export default async function LeaderboardIndexPage({
  params,
}: PageProps<"/[lang]/leaderboard">) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const featureConfig = await getCurrentFeatureConfig();

  if (isFeatureEnabled(featureConfig.state, "individual-leaderboard")) {
    redirect(`/${lang}/leaderboard/individual`);
  }

  if (isFeatureEnabled(featureConfig.state, "team-leaderboard")) {
    redirect(`/${lang}/leaderboard/team`);
  }

  notFound();
}
