"use server";

import { eq } from "drizzle-orm";

import { users } from "@/db/schema";
import { hasLocale, type Locale } from "@/i18n/config";
import { getCurrentUserRecord } from "@/lib/auth/user";
import { db } from "@/lib/db";

export const updateCurrentUserPreferredLang = async (lang: Locale) => {
  if (!hasLocale(lang)) {
    return;
  }

  const currentUser = await getCurrentUserRecord();

  if (!currentUser) {
    return;
  }

  await db
    .update(users)
    .set({ preferredLang: lang })
    .where(eq(users.id, currentUser.id));
};
