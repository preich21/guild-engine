import { notFound } from "next/navigation";

import {
  createAchievement,
  deleteAchievement,
  getAchievements,
  updateAchievement,
} from "@/app/[lang]/admin/achievements/actions";
import { AchievementsTable } from "@/components/achievements-table";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getPageMetadata } from "@/lib/page-metadata";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/admin/achievements">) {
  const { lang } = await params;

  return getPageMetadata(lang, (dictionary) => dictionary.admin.achievements.heading);
}

export default async function AdminAchievementsPage({
  params,
}: PageProps<"/[lang]/admin/achievements">) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const [dictionary, entries] = await Promise.all([getDictionary(lang), getAchievements()]);

  return (
    <main className="flex flex-1 justify-center bg-background px-4 py-8 sm:px-6 sm:py-12">
      <div className="w-full max-w-4xl rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <AchievementsTable
          lang={lang}
          rows={entries}
          createAction={createAchievement}
          updateAction={updateAchievement}
          deleteAction={deleteAchievement}
          dictionary={dictionary.admin.achievements}
        />
      </div>
    </main>
  );
}
