import { notFound, redirect } from "next/navigation";

import { hasLocale } from "@/i18n/config";
import { getCurrentUserRecord } from "@/lib/auth/user";
import { getCurrentFeatureConfig } from "@/lib/feature-config-server";
import { getHomePageHref } from "@/lib/feature-flags";

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const [featureConfig, currentUser] = await Promise.all([
    getCurrentFeatureConfig(),
    getCurrentUserRecord(),
  ]);

  redirect(getHomePageHref(lang, featureConfig.homePagePath, currentUser?.id));
}
