"use server";

import { revalidatePath } from "next/cache";

import { requireAdminAccess } from "@/app/[lang]/admin/actions";
import { rules } from "@/db/schema";
import { hasLocale, locales } from "@/i18n/config";
import { db } from "@/lib/db";
import { getLatestRuleEntryForLanguage, type RuleEntry } from "@/lib/rules";

export type SaveRulesConfigResult =
  | {
      status: "success";
      entry: RuleEntry;
    }
  | {
      status: "error";
    };

export const getRulesConfigEntry = async (languageCode: unknown): Promise<RuleEntry | null> => {
  await requireAdminAccess();

  if (typeof languageCode !== "string" || !hasLocale(languageCode)) {
    return null;
  }

  return getLatestRuleEntryForLanguage(languageCode);
};

export const saveRulesConfig = async (
  lang: unknown,
  languageCode: unknown,
  content: unknown,
): Promise<SaveRulesConfigResult> => {
  await requireAdminAccess();

  if (
    typeof lang !== "string" ||
    !hasLocale(lang) ||
    typeof languageCode !== "string" ||
    !hasLocale(languageCode) ||
    typeof content !== "string"
  ) {
    return { status: "error" };
  }

  const [entry] = await db
    .insert(rules)
    .values({
      languageCode,
      content,
    })
    .returning({
      id: rules.id,
      timestamp: rules.timestamp,
      languageCode: rules.languageCode,
      content: rules.content,
    });

  revalidatePath(`/${lang}/rules`);
  revalidatePath(`/${lang}/admin/rules-config`);

  for (const supportedLocale of locales) {
    revalidatePath(`/${supportedLocale}/rules`);
  }

  return {
    status: "success",
    entry: {
      id: entry.id,
      timestamp: entry.timestamp.toISOString(),
      languageCode: entry.languageCode,
      content: entry.content,
    },
  };
};
