import { notFound } from "next/navigation";

import { GetPointsForm } from "@/components/get-points-form";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

export default async function GetPointsPage({ params }: PageProps<"/[lang]/get-points">) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const dictionary = await getDictionary(lang);

  return (
    <main className="flex flex-1 justify-center bg-zinc-50 px-4 py-8 dark:bg-black sm:px-6 sm:py-12">
      <div className="w-full max-w-3xl rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <GetPointsForm dictionary={dictionary.getPoints} />
      </div>
    </main>
  );
}

