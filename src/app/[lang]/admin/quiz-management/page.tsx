import { notFound } from "next/navigation";

import {
  createQuiz,
  deleteQuiz,
  getQuizzes,
  updateQuiz,
} from "@/app/[lang]/admin/quiz-management/actions";
import { QuizManagement } from "@/components/quiz-management";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getPageMetadata } from "@/lib/page-metadata";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/admin/quiz-management">) {
  const { lang } = await params;

  return getPageMetadata(lang, (dictionary) => dictionary.admin.quizManagement.heading);
}

export default async function AdminQuizManagementPage({
  params,
}: PageProps<"/[lang]/admin/quiz-management">) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const [dictionary, entries] = await Promise.all([getDictionary(lang), getQuizzes()]);

  return (
    <main className="flex flex-1 justify-center bg-background px-4 py-8 sm:px-6 sm:py-12">
      <div className="w-full max-w-5xl rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <QuizManagement
          lang={lang}
          rows={entries}
          createAction={createQuiz}
          updateAction={updateQuiz}
          deleteAction={deleteQuiz}
          dictionary={dictionary.admin.quizManagement}
        />
      </div>
    </main>
  );
}
