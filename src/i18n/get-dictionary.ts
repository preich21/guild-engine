import "server-only";

import type { Locale } from "@/i18n/config";

const dictionaries = {
  en: () => import("@/i18n/dictionaries/en").then((module) => module.default),
  de: () => import("@/i18n/dictionaries/de").then((module) => module.default),
};

export type Dictionary = Awaited<ReturnType<(typeof dictionaries)[Locale]>>;

export const getDictionary = async (locale: Locale): Promise<Dictionary> =>
  dictionaries[locale]();

