import { desc, eq } from "drizzle-orm";

import { rules } from "@/db/schema";
import { defaultLocale, locales, type Locale } from "@/i18n/config";
import { db } from "@/lib/db";

export type RuleEntry = {
  id: string;
  timestamp: string;
  languageCode: string;
  content: string | null;
};

export type DisplayRules = {
  timestamp: string | null;
  content: string | null;
};

const hasRuleContent = (content: string | null): content is string =>
  content !== null && content.trim() !== "";

const toRuleEntry = (row: {
  id: string;
  timestamp: Date;
  languageCode: string;
  content: string | null;
}): RuleEntry => ({
  id: row.id,
  timestamp: row.timestamp.toISOString(),
  languageCode: row.languageCode,
  content: row.content,
});

export const getLatestRuleEntryForLanguage = async (languageCode: Locale): Promise<RuleEntry | null> => {
  const rows = await db
    .select({
      id: rules.id,
      timestamp: rules.timestamp,
      languageCode: rules.languageCode,
      content: rules.content,
    })
    .from(rules)
    .where(eq(rules.languageCode, languageCode))
    .orderBy(desc(rules.timestamp))
    .limit(1);

  return rows[0] ? toRuleEntry(rows[0]) : null;
};

export const getDisplayRules = async (languageCode: Locale): Promise<DisplayRules> => {
  const rows = await db
    .select({
      id: rules.id,
      timestamp: rules.timestamp,
      languageCode: rules.languageCode,
      content: rules.content,
    })
    .from(rules)
    .orderBy(desc(rules.timestamp));

  const newestByLanguage = new Map<string, RuleEntry>();

  for (const row of rows) {
    if (!newestByLanguage.has(row.languageCode)) {
      newestByLanguage.set(row.languageCode, toRuleEntry(row));
    }
  }

  const candidates = [
    newestByLanguage.get(languageCode),
    newestByLanguage.get(defaultLocale),
    ...locales.map((locale) => newestByLanguage.get(locale)),
    ...Array.from(newestByLanguage.values()),
  ];
  const seenIds = new Set<string>();

  for (const candidate of candidates) {
    if (!candidate || seenIds.has(candidate.id)) {
      continue;
    }

    seenIds.add(candidate.id);

    if (hasRuleContent(candidate.content)) {
      return {
        timestamp: candidate.timestamp,
        content: candidate.content,
      };
    }
  }

  return {
    timestamp: null,
    content: null,
  };
};
