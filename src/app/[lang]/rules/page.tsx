import { notFound } from "next/navigation";

import { MarkdownContent } from "@/components/markdown-content";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getPageMetadata } from "@/lib/page-metadata";
import { getDisplayRules } from "@/lib/rules";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/rules">) {
  const { lang } = await params;

  return getPageMetadata(lang, (dictionary) => dictionary.rules.heading);
}

export default async function RulesPage({ params }: PageProps<"/[lang]/rules">) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const [dictionary, displayRules] = await Promise.all([
    getDictionary(lang),
    getDisplayRules(lang),
  ]);

  const formattedTimestamp = displayRules.timestamp
    ? new Intl.DateTimeFormat(lang, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(displayRules.timestamp))
    : null;

  return (
    <main className="flex flex-1 justify-center bg-background px-4 py-8 sm:px-6 sm:py-12">
      <div className="w-full max-w-3xl space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <h1 className="text-3xl font-semibold tracking-tight">{dictionary.rules.heading}</h1>
          {formattedTimestamp ? (
            <time className="text-sm text-muted-foreground" dateTime={displayRules.timestamp ?? undefined}>
              {formattedTimestamp}
            </time>
          ) : null}
        </div>

        <section className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
          {displayRules.content !== null ? (
            <MarkdownContent content={displayRules.content} />
          ) : (
            <p className="text-muted-foreground">{dictionary.rules.empty}</p>
          )}
        </section>
      </div>
    </main>
  );
}
