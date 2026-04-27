import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { hasLocale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/get-dictionary";

export async function getPageMetadata(
  lang: string,
  getTitle: (dictionary: Dictionary) => string,
): Promise<Metadata> {
  if (!hasLocale(lang)) {
    notFound();
  }

  const dictionary = await getDictionary(lang);

  return {
    title: getTitle(dictionary),
  };
}
