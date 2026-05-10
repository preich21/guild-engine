"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";

import { submitQuiz } from "@/app/[lang]/quizzes/actions";
import type { QuizData } from "@/config/quiz-data-type-definition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type QuizFormDictionary = {
  backButton: string;
  backToQuizSelectionButton: string;
  continueButton: string;
  correctAnswerLabel: string;
  submitButton: string;
  submitError: string;
  submittedWithPoints: string;
  submittedWithoutPoints: string;
};

type QuizAnswer = string | null;
type SubmitStatus = "created" | "alreadySubmitted";

type QuizFormProps = {
  lang: string;
  quizId: string;
  title: string;
  timeframe: string;
  points: string;
  alreadySubmittedNotice: string | null;
  quizData: QuizData;
  dictionary: QuizFormDictionary;
};

export function QuizForm({
  lang,
  quizId,
  title,
  timeframe,
  points,
  alreadySubmittedNotice,
  quizData,
  dictionary,
}: QuizFormProps) {
  const router = useRouter();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [completedQuestionCount, setCompletedQuestionCount] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>(() => quizData.map(() => null));
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus | null>(null);
  const [submitError, setSubmitError] = useState(false);
  const [isPending, startTransition] = useTransition();

  const currentQuestion = quizData[currentQuestionIndex];
  const progress = (completedQuestionCount / quizData.length) * 100;
  const currentAnswer = answers[currentQuestionIndex] ?? "";
  const currentQuestionId = `${quizId}-${currentQuestionIndex}-question`;
  const isLastQuestion = currentQuestionIndex === quizData.length - 1;
  const canContinue = currentAnswer.trim() !== "" && !isPending;
  const correctAnswerCount = answers.reduce((count, answer, index) => {
    return isCorrectAnswer(quizData[index], answer) ? count + 1 : count;
  }, 0);
  const submittedMessage =
    submitStatus === "created"
      ? dictionary.submittedWithPoints
      : dictionary.submittedWithoutPoints;

  const setCurrentAnswer = (answer: string) => {
    setSubmitError(false);
    setAnswers((currentAnswers) =>
      currentAnswers.map((currentAnswerValue, index) =>
        index === currentQuestionIndex ? answer : currentAnswerValue,
      ),
    );
  };

  const handleContinue = () => {
    if (!canContinue) {
      return;
    }

    setCompletedQuestionCount((count) => Math.max(count, currentQuestionIndex + 1));

    if (!isLastQuestion) {
      setCurrentQuestionIndex((index) => index + 1);
      return;
    }

    startTransition(async () => {
      const result = await submitQuiz(lang, quizId);

      if (result.status === "error") {
        setSubmitError(true);
        return;
      }

      setSubmitStatus(result.status);
    });
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <div className="space-y-7">
        <Progress value={progress} className="w-full" />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <div className="space-y-1 text-left text-sm text-muted-foreground sm:text-right">
            <p>{timeframe}</p>
            <p>{points}</p>
          </div>
        </div>

        <Separator />

        {submitStatus ? (
          <QuizResult
            quizId={quizId}
            quizData={quizData}
            answers={answers}
            message={submittedMessage
              .replace("{correct}", String(correctAnswerCount))
              .replace("{total}", String(quizData.length))}
            dictionary={dictionary}
            onBackToQuizSelection={() => router.push(`/${lang}/quizzes`)}
          />
        ) : (
          <>
            <div className="space-y-5">
              <p id={currentQuestionId} className="text-base font-medium leading-relaxed text-foreground">
                {currentQuestion.question}
              </p>

              {currentQuestion.type === "number" ? (
                <Input
                  id={`${quizId}-${currentQuestionIndex}`}
                  type="number"
                  aria-labelledby={currentQuestionId}
                  value={currentAnswer}
                  onChange={(event) => setCurrentAnswer(event.target.value)}
                  className="max-w-xs"
                />
              ) : (
                <RadioGroup
                  value={currentAnswer}
                  onValueChange={setCurrentAnswer}
                  aria-labelledby={currentQuestionId}
                  className="gap-4"
                >
                  {currentQuestion.answerPossibilities.map((answerPossibility, index) => {
                    const id = `${quizId}-${currentQuestionIndex}-${index}`;

                    return (
                      <div key={`${answerPossibility}-${index}`} className="flex items-center gap-3">
                        <RadioGroupItem value={String(index)} id={id} />
                        <Label htmlFor={id}>{answerPossibility}</Label>
                      </div>
                    );
                  })}
                </RadioGroup>
              )}
            </div>

            {submitError ? <p className="text-sm text-destructive">{dictionary.submitError}</p> : null}

            <div className="flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={currentQuestionIndex === 0 || isPending}
                onClick={() => setCurrentQuestionIndex((index) => Math.max(0, index - 1))}
              >
                <ArrowLeft data-icon="inline-start" />
                {dictionary.backButton}
              </Button>
              <Button type="button" disabled={!canContinue} onClick={handleContinue}>
                {isLastQuestion ? dictionary.submitButton : dictionary.continueButton}
                {!isLastQuestion ? <ArrowRight data-icon="inline-end" /> : null}
              </Button>
            </div>

            {alreadySubmittedNotice ? (
              <>
                <Separator />
                <p className="text-sm text-muted-foreground">{alreadySubmittedNotice}</p>
              </>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function QuizResult({
  quizId,
  quizData,
  answers,
  message,
  dictionary,
  onBackToQuizSelection,
}: {
  quizId: string;
  quizData: QuizData;
  answers: QuizAnswer[];
  message: string;
  dictionary: QuizFormDictionary;
  onBackToQuizSelection: () => void;
}) {
  return (
    <div className="space-y-6">
      <p className="text-base font-medium leading-relaxed text-foreground">{message}</p>

      {quizData.map((question, index) => {
        const answer = answers[index];
        const isCorrect = isCorrectAnswer(question, answer);
        const questionId = `${quizId}-result-${index}-question`;

        return (
          <div key={`${question.question}-${index}`} className="space-y-4">
            <div className="flex items-start gap-3">
              <p id={questionId} className="flex-1 text-base font-medium leading-relaxed text-foreground">
                {question.question}
              </p>
              {isCorrect ? (
                <Check aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <X aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-destructive" />
              )}
            </div>

            {question.type === "number" ? (
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  type="number"
                  aria-labelledby={questionId}
                  readOnly
                  value={answer ?? ""}
                  className={cn(
                    "max-w-xs",
                    isCorrect
                      ? "border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-300"
                      : "border-destructive text-destructive",
                  )}
                />
                {!isCorrect ? (
                  <Input
                    type="number"
                    aria-label={dictionary.correctAnswerLabel}
                    readOnly
                    value={String(question.correctAnswer)}
                    className="max-w-xs border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-300"
                  />
                ) : null}
              </div>
            ) : (
              <RadioGroup
                value={answer ?? ""}
                aria-labelledby={questionId}
                aria-readonly="true"
                className="gap-4 pointer-events-none"
              >
                {question.answerPossibilities.map((answerPossibility, answerIndex) => {
                  const id = `${quizId}-result-${index}-${answerIndex}`;
                  const isCorrectOption = answerIndex === question.correctAnswerIndex;
                  const isUserAnswer = answer === String(answerIndex);

                  return (
                    <div key={`${answerPossibility}-${answerIndex}`} className="flex items-center gap-3">
                      <RadioGroupItem
                        value={String(answerIndex)}
                        id={id}
                        className={cn(
                          isCorrectOption &&
                            "border-emerald-600 data-checked:border-emerald-600 data-checked:bg-emerald-600 dark:border-emerald-400 dark:data-checked:border-emerald-400 dark:data-checked:bg-emerald-500",
                          isUserAnswer &&
                            !isCorrectOption &&
                            "border-destructive data-checked:border-destructive data-checked:bg-destructive",
                        )}
                      />
                      <Label
                        htmlFor={id}
                        className={cn(
                          isCorrectOption && "text-emerald-700 dark:text-emerald-300",
                          isUserAnswer && !isCorrectOption && "text-destructive",
                        )}
                      >
                        {answerPossibility}
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
            )}
          </div>
        );
      })}

      <Button type="button" onClick={onBackToQuizSelection}>
        <ArrowLeft data-icon="inline-start" />
        {dictionary.backToQuizSelectionButton}
      </Button>
    </div>
  );
}

function isCorrectAnswer(question: QuizData[number], answer: QuizAnswer) {
  if (answer === null || answer.trim() === "") {
    return false;
  }

  if (question.type === "number") {
    return Number(answer) === question.correctAnswer;
  }

  return Number(answer) === question.correctAnswerIndex;
}
