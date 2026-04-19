import { notFound } from "next/navigation";

import {
  getAwardAchievementsData,
  updateAwardedAchievements,
} from "@/app/[lang]/admin/award-achievements/actions";
import { AwardAchievementsTable } from "@/components/award-achievements-table";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

export default async function AdminAwardAchievementsPage({
  params,
}: PageProps<"/[lang]/admin/award-achievements">) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const [dictionary, data] = await Promise.all([getDictionary(lang), getAwardAchievementsData()]);

  return (
    <main className="flex flex-1 justify-center bg-background px-4 py-8 sm:px-6 sm:py-12">
      <div className="w-full max-w-5xl rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <AwardAchievementsTable
          lang={lang}
          rows={data.users}
          achievements={data.achievements}
          updateAction={updateAwardedAchievements}
          dictionary={dictionary.admin.awardAchievements}
        />
      </div>
    </main>
  );
}
