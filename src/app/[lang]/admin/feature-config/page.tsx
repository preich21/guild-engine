import { notFound } from "next/navigation";

import { getLatestFeatureConfig } from "@/app/[lang]/admin/feature-config/actions";
import { FeatureConfigurationForm, type FeatureCatalog } from "@/components/feature-configuration-form";
import featureConfiguration from "@/config/feature-configuration.json";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getPageMetadata } from "@/lib/page-metadata";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/admin/feature-config">) {
  const { lang } = await params;

  return getPageMetadata(lang, (dictionary) => dictionary.admin.featureConfig.heading);
}

export default async function AdminFeatureConfigPage({
  params,
}: PageProps<"/[lang]/admin/feature-config">) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const dictionary = await getDictionary(lang);
  const latestFeatureConfig = await getLatestFeatureConfig();

  return (
    <main className="flex flex-1 justify-center bg-background px-4 py-8 sm:px-6 sm:py-12">
      <div className="w-full max-w-4xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">{dictionary.admin.featureConfig.heading}</h1>
          <p className="text-sm text-muted-foreground">{dictionary.admin.featureConfig.description}</p>
        </div>
        <FeatureConfigurationForm
          lang={lang}
          catalog={featureConfiguration as FeatureCatalog}
          dictionary={dictionary.admin.featureConfig}
          initialLoadedConfig={latestFeatureConfig}
        />
      </div>
    </main>
  );
}
