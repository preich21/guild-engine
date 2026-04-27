import { notFound } from "next/navigation";

import {
  getManualPointsUsers,
  saveManualPoints,
} from "@/app/[lang]/admin/manual-points/actions";
import { ManualPointsForm } from "@/components/manual-points-form";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getPageMetadata } from "@/lib/page-metadata";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/admin/manual-points">) {
  const { lang } = await params;

  return getPageMetadata(lang, (dictionary) => dictionary.admin.manualPoints.heading);
}

export default async function AdminManualPointsPage({
  params,
}: PageProps<"/[lang]/admin/manual-points">) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const [dictionary, users] = await Promise.all([getDictionary(lang), getManualPointsUsers()]);

  return (
    <main className="flex flex-1 justify-center bg-background px-4 py-8 sm:px-6 sm:py-12">
      <div className="w-full max-w-3xl rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <ManualPointsForm
          lang={lang}
          users={users}
          action={saveManualPoints}
          dictionary={dictionary.admin.manualPoints}
        />
      </div>
    </main>
  );
}
