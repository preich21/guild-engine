import { notFound } from "next/navigation";

import {
  deletePointDistributionEntry,
  getPointDistributionEntries,
  savePointDistributionEntries,
} from "@/app/[lang]/admin/point-distribution/actions";
import { PointDistributionTable } from "@/components/point-distribution-table";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

export default async function AdminPointDistributionPage({
  params,
}: PageProps<"/[lang]/admin/point-distribution">) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const [dictionary, entries] = await Promise.all([
    getDictionary(lang),
    getPointDistributionEntries(),
  ]);

  return (
    <main className="flex flex-1 bg-background px-4 py-8 sm:px-6 sm:py-12">
      <div className="w-full rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <PointDistributionTable
          lang={lang}
          rows={entries}
          action={savePointDistributionEntries}
          deleteAction={deletePointDistributionEntry}
          dictionary={dictionary.admin.pointDistribution}
        />
      </div>
    </main>
  );
}
