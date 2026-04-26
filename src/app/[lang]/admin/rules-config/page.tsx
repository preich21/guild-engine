import { notFound } from "next/navigation";

import { RulesConfigForm } from "@/components/rules-config-form";
import { hasLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

export default async function AdminRulesConfigPage({
  params,
}: PageProps<"/[lang]/admin/rules-config">) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const dictionary = await getDictionary(lang);

  return (
    <main className="flex flex-1 justify-center bg-background px-4 py-8 sm:px-6 sm:py-12">
      <div className="w-full max-w-3xl rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">{dictionary.admin.rulesConfig.heading}</h1>
            <p className="text-sm text-muted-foreground">{dictionary.admin.rulesConfig.description}</p>
          </div>
          <RulesConfigForm
            lang={lang}
            locales={locales}
            dictionary={dictionary.admin.rulesConfig}
            languageLabels={{
              en: dictionary.topbar.english,
              de: dictionary.topbar.german,
            }}
          />
        </div>
      </div>
    </main>
  );
}
