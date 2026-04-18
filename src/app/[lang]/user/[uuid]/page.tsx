import { notFound } from "next/navigation";

import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

export default async function UserProfilePage({
  params,
}: PageProps<"/[lang]/user/[uuid]">) {
  const { lang, uuid } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const dictionary = await getDictionary(lang);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        {dictionary.profile.heading.replace("{uuid}", uuid)}
      </h1>
    </main>
  );
}

