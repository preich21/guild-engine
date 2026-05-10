import { notFound } from "next/navigation";

import { getQuizDataTypeDefinition } from "@/app/[lang]/quizzes/actions";
import { JsonCodeEditor } from "@/components/json-code-editor";
import { Card, CardContent } from "@/components/ui/card";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getPageMetadata } from "@/lib/page-metadata";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/quizzes/create-your-own">) {
  const { lang } = await params;

  return getPageMetadata(lang, (dictionary) => dictionary.quizzes.createYourOwnHeading);
}

export default async function CreateYourOwnQuizPage({
  params,
}: PageProps<"/[lang]/quizzes/create-your-own">) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const [dictionary, quizDataTypeDefinition] = await Promise.all([
    getDictionary(lang),
    getQuizDataTypeDefinition(),
  ]);

  return (
    <main className="flex flex-1 justify-center bg-background px-4 py-8 sm:px-6 sm:py-12">
      <div className="w-full max-w-4xl space-y-6">
        <h1 className="text-3xl font-semibold tracking-tight">{dictionary.quizzes.createYourOwnHeading}</h1>

        <Card className="border border-border bg-card">
          <CardContent>
            <ol className="list-decimal space-y-4 pl-5 text-sm text-foreground">
              <li>{dictionary.quizzes.createSteps.title}</li>
              <li className="space-y-3">
                <p>{dictionary.quizzes.createSteps.data}</p>
                <JsonCodeEditor
                  value={quizDataTypeDefinition}
                  readOnly
                  ariaLabel={dictionary.quizzes.typeDefinitionLabel}
                />
              </li>
              <li>{dictionary.quizzes.createSteps.contactAdmin}</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
