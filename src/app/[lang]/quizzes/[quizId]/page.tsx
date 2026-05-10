import { notFound } from "next/navigation";

import { getPublicQuizById } from "@/app/[lang]/quizzes/actions";
import { QuizForm } from "@/components/quiz-form";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getPageMetadata } from "@/lib/page-metadata";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/quizzes/[quizId]">) {
  const { lang, quizId } = await params;
  const quiz = await getPublicQuizById(quizId);

  return getPageMetadata(lang, (dictionary) => quiz?.title ?? dictionary.quizzes.heading);
}

const formatTimestamp = (lang: string, value: string | null, fallback: string) => {
  if (!value) {
    return fallback;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(lang, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
};

export default async function QuizPage({
  params,
}: PageProps<"/[lang]/quizzes/[quizId]">) {
  const { lang, quizId } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const [dictionary, quiz] = await Promise.all([
    getDictionary(lang),
    getPublicQuizById(quizId),
  ]);

  if (!quiz) {
    notFound();
  }

  const validFrom = formatTimestamp(lang, quiz.validFrom, dictionary.quizzes.noEndDate);
  const validTo = formatTimestamp(lang, quiz.validTo, dictionary.quizzes.noEndDate);
  const submissionTimestamp = formatTimestamp(
    lang,
    quiz.submissionTimestamp,
    dictionary.quizzes.noEndDate,
  );
  const timeframe = `${dictionary.quizzes.timeframeLabel}: ${validFrom} - ${validTo}`;
  const points = `${dictionary.quizzes.pointsLabel}: ${quiz.points}`;
  const alreadySubmittedNotice = quiz.submissionTimestamp
    ? dictionary.quizzes.alreadySubmitted.replace("{timestamp}", submissionTimestamp)
    : null;

  return (
    <main className="flex flex-1 justify-center bg-background px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex w-full max-w-4xl flex-col gap-6">
        {quiz.data ? (
          <QuizForm
            lang={lang}
            quizId={quiz.id}
            title={quiz.title}
            timeframe={timeframe}
            points={points}
            alreadySubmittedNotice={alreadySubmittedNotice}
            quizData={quiz.data}
            dictionary={{
              backButton: dictionary.quizzes.backButton,
              backToQuizSelectionButton: dictionary.quizzes.backToQuizSelectionButton,
              continueButton: dictionary.quizzes.continueButton,
              correctAnswerLabel: dictionary.quizzes.correctAnswerLabel,
              submitButton: dictionary.quizzes.submitButton,
              submitError: dictionary.quizzes.submitError,
              submittedWithPoints: dictionary.quizzes.submittedWithPoints,
              submittedWithoutPoints: dictionary.quizzes.submittedWithoutPoints,
            }}
          />
        ) : (
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <p className="text-sm text-muted-foreground">{dictionary.quizzes.invalidData}</p>
          </div>
        )}
      </div>
    </main>
  );
}
