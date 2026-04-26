import { notFound, redirect } from "next/navigation";

import { hasLocale } from "@/i18n/config";
import { getCurrentFeatureConfig } from "@/lib/feature-config-server";
import { getDefaultEnabledUserPath } from "@/lib/feature-flags";

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const featureConfig = await getCurrentFeatureConfig();

  redirect(getDefaultEnabledUserPath(lang, featureConfig.state));
}
