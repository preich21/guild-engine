import Link from "next/link";
import { notFound } from "next/navigation";
import { CircleQuestionMark } from "lucide-react";

import { getPublicQuizzes } from "@/app/[lang]/quizzes/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getPageMetadata } from "@/lib/page-metadata";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/quizzes">) {
  const { lang } = await params;

  return getPageMetadata(lang, (dictionary) => dictionary.quizzes.heading);
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

const canTakeQuiz = (quiz: { validFrom: string; validTo: string | null }, now: Date) => {
  const validFrom = new Date(quiz.validFrom);
  const validTo = quiz.validTo ? new Date(quiz.validTo) : null;

  return validFrom <= now && (!validTo || now <= validTo);
};

export default async function QuizzesPage({ params }: PageProps<"/[lang]/quizzes">) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const [dictionary, quizRows] = await Promise.all([getDictionary(lang), getPublicQuizzes()]);
  const now = new Date();

  return (
    <TooltipProvider>
      <main className="flex flex-1 justify-center bg-background px-4 py-8 sm:px-6 sm:py-12">
        <div className="w-full max-w-4xl space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-3xl font-semibold tracking-tight">{dictionary.quizzes.heading}</h1>
            <Tooltip>
              <TooltipTrigger
                render={<span className="inline-flex" />}
              >
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label={dictionary.quizzes.createYourOwnTooltip}
                  nativeButton={false}
                  render={<Link href={`/${lang}/quizzes/create-your-own`} />}
                >
                  <CircleQuestionMark />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{dictionary.quizzes.createYourOwnTooltip}</TooltipContent>
            </Tooltip>
          </div>

          {quizRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{dictionary.quizzes.empty}</p>
          ) : (
            <div className="space-y-3">
              {quizRows.map((quiz) => {
                const validFrom = formatTimestamp(lang, quiz.validFrom, dictionary.quizzes.noEndDate);
                const validTo = formatTimestamp(lang, quiz.validTo, dictionary.quizzes.noEndDate);
                const isEnabled = canTakeQuiz(quiz, now);

                return (
                  <Card key={quiz.id} className="border border-border bg-card">
                    <CardHeader>
                      <CardTitle>{quiz.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{dictionary.quizzes.pointsLabel}: </span>
                        {quiz.points}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {dictionary.quizzes.validTimeframe
                          .replace("{validFrom}", validFrom)
                          .replace("{validTo}", validTo)}
                      </p>
                    </CardContent>
                    <CardFooter className="justify-end bg-transparent">
                      {isEnabled ? (
                        <Button
                          nativeButton={false}
                          render={<Link href={`/${lang}/quizzes/${quiz.id}`} />}
                        >
                          {dictionary.quizzes.doQuizNowButton}
                        </Button>
                      ) : (
                        <Button type="button" disabled>
                          {dictionary.quizzes.doQuizNowButton}
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </TooltipProvider>
  );
}
