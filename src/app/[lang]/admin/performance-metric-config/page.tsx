import { notFound } from "next/navigation";

import {
  createPerformanceMetric,
  getPerformanceMetrics,
} from "@/app/[lang]/admin/performance-metric-config/actions";
import { PerformanceMetricConfigList } from "@/components/performance-metric-config-list";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getPageMetadata } from "@/lib/page-metadata";

type AdminPerformanceMetricConfigPageProps = {
  params: Promise<{ lang: string }>;
};

export async function generateMetadata({
  params,
}: AdminPerformanceMetricConfigPageProps) {
  const { lang } = await params;

  return getPageMetadata(lang, (dictionary) => dictionary.admin.performanceMetricConfig.heading);
}

export default async function AdminPerformanceMetricConfigPage({
  params,
}: AdminPerformanceMetricConfigPageProps) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const [dictionary, entries] = await Promise.all([getDictionary(lang), getPerformanceMetrics()]);

  return (
    <main className="flex flex-1 justify-center bg-background px-4 py-8 sm:px-6 sm:py-12">
      <div className="w-full max-w-4xl rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <PerformanceMetricConfigList
          lang={lang}
          rows={entries}
          createAction={createPerformanceMetric}
          dictionary={dictionary.admin.performanceMetricConfig}
        />
      </div>
    </main>
  );
}
